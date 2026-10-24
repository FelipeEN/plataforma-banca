const crypto = require('node:crypto');
const pool = require('../database/connection');

let chamadasDesdeLimpeza = 0;

async function permitirRequisicao(acao, identidade, limite, janelaSegundos) {
    const segredo = process.env.RATE_LIMIT_HMAC_SECRET;

    if (!segredo) {
        throw new Error('RATE_LIMIT_HMAC_SECRET is not configured.');
    }

    const hashChave = crypto
        .createHmac('sha256', segredo)
        .update(`${acao}:${identidade}`)
        .digest('hex');

    const resultado = await pool.query(
        `INSERT INTO rate_limit_buckets (acao, chave_hash, janela_inicio, quantidade)
         VALUES ($1, $2, NOW(), 1)
         ON CONFLICT (acao, chave_hash) DO UPDATE
         SET janela_inicio = CASE
                 WHEN rate_limit_buckets.janela_inicio +
                      ($3 * INTERVAL '1 second') <= NOW()
                 THEN NOW()
                 ELSE rate_limit_buckets.janela_inicio
             END,
             quantidade = CASE
                 WHEN rate_limit_buckets.janela_inicio +
                      ($3 * INTERVAL '1 second') <= NOW()
                 THEN 1
                 ELSE rate_limit_buckets.quantidade + 1
             END
         WHERE rate_limit_buckets.janela_inicio +
               ($3 * INTERVAL '1 second') <= NOW()
            OR rate_limit_buckets.quantidade < $4
         RETURNING quantidade`,
        [acao, hashChave, janelaSegundos, limite]
    );

    chamadasDesdeLimpeza += 1;
    if (chamadasDesdeLimpeza >= 250) {
        chamadasDesdeLimpeza = 0;
        await pool.query(
            `DELETE FROM rate_limit_buckets
             WHERE janela_inicio < NOW() - INTERVAL '2 days'`
        );
    }

    return resultado.rows.length > 0;
}

module.exports = { permitirRequisicao };
