const express = require('express');
const pool = require('../database/connection');
const { permitirRequisicao } = require('../services/rateLimit.service');

const router = express.Router();
const bcrypt = require('bcrypt');

router.get('/', async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT id, nome
             FROM instituicoes
             WHERE ativa = TRUE
             ORDER BY id`
        );

        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao buscar instituições:', erro.message);

        res.status(500).json({
            erro: 'Erro interno ao buscar instituições.'
        });
    }
});

router.post('/', async (req, res) => {
    return res.status(410).json({
        erro: 'Use o formulário completo de solicitação de instituição.'
    });
});

// The first admin must be approved through the controlled operational process.
router.post('/cadastrar', async (req, res) => {
    const corpo = req.body || {};
    const { nomeInstituicao, nomeResponsavel, email, senha } = corpo;
    const nomeInstituicaoNormalizado =
        typeof nomeInstituicao === 'string' ? nomeInstituicao.trim() : '';
    const nomeResponsavelNormalizado =
        typeof nomeResponsavel === 'string' ? nomeResponsavel.trim() : '';
    const emailNormalizado =
        typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (
        !corpo ||
        typeof corpo !== 'object' ||
        Array.isArray(corpo) ||
        !nomeInstituicaoNormalizado ||
        Array.from(nomeInstituicaoNormalizado).length > 150 ||
        !nomeResponsavelNormalizado ||
        Array.from(nomeResponsavelNormalizado).length > 150 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado) ||
        Array.from(emailNormalizado).length > 255 ||
        typeof senha !== 'string' ||
        senha.length < 8 ||
        Buffer.byteLength(senha, 'utf8') > 72
    ) {
        return res.status(400).json({
            erro: 'Informe nomes válidos, um e-mail válido e uma senha de 8 a 72 bytes.'
        });
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    let cliente;
    let transacaoIniciada = false;
    try {
        const ipPermitido = await permitirRequisicao(
            'instituicao_cadastro_ip',
            ip,
            5,
            60 * 60
        );

        if (!ipPermitido) {
            return res.status(429).json({
                erro: 'Muitas solicitações. Aguarde antes de tentar novamente.'
            });
        }

        const emailPermitido = await permitirRequisicao(
            'instituicao_cadastro_email',
            emailNormalizado,
            3,
            60 * 60
        );

        if (!emailPermitido) {
            return res.status(429).json({
                erro: 'Muitas solicitações. Aguarde antes de tentar novamente.'
            });
        }

        cliente = await pool.connect();
        await cliente.query('BEGIN');
        transacaoIniciada = true;

        const resultadoInstituicao = await cliente.query(
            `INSERT INTO instituicoes (nome, ativa)
             VALUES ($1, FALSE)
             RETURNING id, nome, ativa`,
            [nomeInstituicaoNormalizado]
        );

        const instituicao = resultadoInstituicao.rows[0];
        const senhaHash = await bcrypt.hash(senha, 10);

        const resultadoUsuario = await cliente.query(
            `INSERT INTO usuarios (nome, email, senha_hash)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [
                nomeResponsavelNormalizado,
                emailNormalizado,
                senhaHash
            ]
        );

        const usuario = resultadoUsuario.rows[0];
        await cliente.query(
            `INSERT INTO vinculos_institucionais
                (usuario_id, instituicao_id, perfil, status)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [usuario.id, instituicao.id, 'admin', 'pendente']
        );

        await cliente.query('COMMIT');
        transacaoIniciada = false;

        return res.status(202).json({
            mensagem: 'Solicitação recebida. Você poderá entrar na conta, mas o acesso administrativo ficará disponível somente após a análise da instituição e a aprovação do vínculo.'
        });
    } catch (erro) {
        if (cliente && transacaoIniciada) {
            try {
                await cliente.query('ROLLBACK');
            } catch (erroRollback) {
                console.error(
                    'Erro ao reverter a solicitação de instituição.'
                );
            }
        }

        if (erro.code === '23505') {
            return res.status(409).json({
                erro: 'Este e-mail já está cadastrado ou existe um registro duplicado.'
            });
        }

        console.error('Erro ao processar solicitação de instituição.');

        return res.status(500).json({
            erro: 'Não foi possível processar a solicitação agora.'
        });
    } finally {
        if (cliente) {
            cliente.release();
        }
    }
});

module.exports = router;