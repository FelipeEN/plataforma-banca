const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

async function autenticarToken(req, res, next) {
    const cabecalho = req.headers.authorization;

    if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
        return res.status(401).json({
            erro: 'Token de autenticação não informado.'
        });
    }

    const token = cabecalho.split(' ')[1];

    try {
        const dadosUsuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const usuarioId = Number(dadosUsuario.sub);

        const resultado = await pool.query(
            `SELECT
                v.instituicao_id,
                v.perfil,
                v.status
             FROM vinculos_institucionais v
             WHERE v.usuario_id = $1
               AND v.status = 'aprovado'`,
            [usuarioId]
        );

        req.usuario = {
            id: usuarioId,
            email: dadosUsuario.email,
            vinculos: resultado.rows
        };

        next();

    } catch (erro) {
        if (erro.name === 'JsonWebTokenError' ||
            erro.name === 'TokenExpiredError' ||
            erro.name === 'NotBeforeError') {
            return res.status(401).json({
                erro: 'Token inválido ou expirado.'
            });
        }

        console.error('Erro na autenticação:', erro.message);

        return res.status(500).json({
            erro: 'Erro interno na autenticação.'
        });
    }
}

module.exports = autenticarToken;