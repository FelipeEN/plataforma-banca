const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../database/connection');
const { permitirRequisicao } = require('../services/rateLimit.service');

const router = express.Router();

const autenticarToken = require('../middlewares/auth.middleware');
const autorizarPerfil = require('../middlewares/autorizarPerfil.middleware');

const autorizarPerfilGlobal = require('../middlewares/autorizarPerfilGlobal.middleware');

const respostaCadastroPublico = {
    mensagem: 'Cadastro processado. Você pode tentar entrar agora; se este e-mail já tiver uma conta, use a senha cadastrada. O acesso institucional depende de um vínculo aprovado.'
};

async function limitarCadastroPublico(req, email) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ipPermitido = await permitirRequisicao(
        'cadastro_ip',
        ip,
        10,
        60 * 60
    );

    if (!ipPermitido) {
        return false;
    }

    return permitirRequisicao(
        'cadastro_email',
        email,
        3,
        60 * 60
    );
}

router.post('/cadastro', async (req, res) => {
    const corpo = req.body || {};
    const camposPermitidos = new Set(['nome', 'email', 'senha']);
    const temCampoExtra = Object.keys(corpo).some(
        (campo) => !camposPermitidos.has(campo)
    );
    const { nome, email, senha } = corpo;
    const nomeNormalizado = typeof nome === 'string' ? nome.trim() : '';
    const emailNormalizado =
        typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (
        !corpo ||
        typeof corpo !== 'object' ||
        Array.isArray(corpo) ||
        temCampoExtra ||
        !nomeNormalizado ||
        Array.from(nomeNormalizado).length > 150 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado) ||
        Array.from(emailNormalizado).length > 255 ||
        typeof senha !== 'string' ||
        senha.length < 8 ||
        Buffer.byteLength(senha, 'utf8') > 72
    ) {
        return res.status(400).json({
            erro: 'Informe um nome, e-mail válido e uma senha de 8 a 72 bytes.'
        });
    }

    try {
        const permitido = await limitarCadastroPublico(
            req,
            emailNormalizado
        );

        if (!permitido) {
            return res.status(429).json({
                erro: 'Muitas solicitações. Aguarde antes de tentar novamente.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        await pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [nomeNormalizado, emailNormalizado, senhaHash]
        );

        return res.status(202).json(respostaCadastroPublico);
    } catch (erro) {
        console.error('Erro interno ao processar cadastro público.');

        return res.status(500).json({
            erro: 'Não foi possível processar o cadastro agora.'
        });
    }
});

router.post('/',   autenticarToken,autorizarPerfilGlobal('admin', 'coordenador'),async (req, res) => {
    try {
        const { nome, email, senha } = req.body || {};

        if (
            typeof nome !== 'string' || nome.trim() === '' ||
            typeof email !== 'string' || email.trim() === '' ||
            typeof senha !== 'string' || senha.length < 8
        ) {
            return res.status(400).json({
                erro: 'Informe nome, e-mail e uma senha com pelo menos 8 caracteres.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const resultado = await pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash)
             VALUES ($1, $2, $3)
             RETURNING id, nome, email, criado_em`,
            [nome.trim(), email.trim().toLowerCase(), senhaHash]
        );

        return res.status(201).json(resultado.rows[0]);

    } catch (erro) {
        if (erro.code === '23505') {
            return res.status(409).json({
                erro: 'Este e-mail já está cadastrado.'
            });
        }

        console.error('Erro ao cadastrar usuário:', erro.message);

        return res.status(500).json({
            erro: 'Erro interno ao cadastrar usuário.'
        });
    }
});

router.get(
    '/:instituicaoId/gerenciar',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const resultado = await pool.query(
                `SELECT id, nome, email, criado_em, vinculo_id
                 FROM (
                    SELECT DISTINCT ON (u.id)
                        u.id,
                        u.nome,
                        u.email,
                        u.criado_em,
                        v.id AS vinculo_id
                    FROM usuarios u
                    JOIN vinculos_institucionais v
                      ON v.usuario_id = u.id
                    WHERE v.instituicao_id = $1
                      AND v.status = 'aprovado'
                    ORDER BY u.id, v.id
                 ) usuarios_aprovados
                 ORDER BY nome, id`,
                [req.usuario.instituicaoId]
            );

            return res.json(resultado.rows);
        } catch (erro) {
            console.error('Erro ao buscar usuários da instituição:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao buscar usuários da instituição.'
            });
        }
    }
);

router.post(
    '/:instituicaoId/candidatos',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        const email = req.body?.email;

        if (
            typeof email !== 'string' ||
            email.trim() === '' ||
            email.trim().length > 255
        ) {
            return res.status(400).json({
                erro: 'Informe um e-mail válido para buscar a conta.'
            });
        }

        try {
            const resultado = await pool.query(
                `SELECT u.id, u.nome, u.email
                 FROM usuarios u
                 WHERE LOWER(u.email) = LOWER($1)
                   AND (
                       $3 = 'admin'
                       OR NOT EXISTS (
                           SELECT 1
                           FROM vinculos_institucionais v
                           WHERE v.usuario_id = u.id
                             AND v.instituicao_id = $2
                             AND v.status <> 'aprovado'
                       )
                   )`,
                [email.trim(), req.usuario.instituicaoId, req.usuario.perfil]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Nenhuma conta disponível para associação ou atualização foi encontrada com esse e-mail.'
                });
            }

            return res.json(resultado.rows[0]);
        } catch (erro) {
            console.error('Erro ao buscar candidato para associação:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao buscar candidato para associação.'
            });
        }
    }
);



/* Listar orientadores com vínculo aprovado na instituição */
router.get(
    '/orientadores/:instituicaoId',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;

            const resultado = await pool.query(
                `SELECT
                    u.id,
                    u.nome,
                    u.email
                 FROM usuarios u
                 JOIN vinculos_institucionais v
                    ON v.usuario_id = u.id
                 WHERE v.instituicao_id = $1
                   AND v.perfil = 'orientador'
                   AND v.status = 'aprovado'
                 ORDER BY u.nome`,
                [instituicaoId]
            );

            return res.status(200).json(resultado.rows);

        } catch (erro) {
            console.error(
                'Erro ao listar orientadores:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao listar orientadores.'
            });
        }
    }
);

// Listar alunos aprovados da instituição
router.get(
    '/alunos/:instituicaoId',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;

            const resultado = await pool.query(
                `SELECT u.id, u.nome, u.email
                 FROM usuarios u
                 JOIN vinculos_institucionais v
                   ON v.usuario_id = u.id
                 WHERE v.instituicao_id = $1
                   AND v.perfil = 'aluno'
                   AND v.status = 'aprovado'
                 ORDER BY u.nome`,
                [instituicaoId]
            );

            return res.status(200).json(resultado.rows);
        } catch (erro) {
            console.error('Erro ao listar alunos:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao listar alunos.'
            });
        }
    }
);

// Listar avaliadores aprovados da instituição
router.get(
    '/avaliadores/:instituicaoId',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;

            const resultado = await pool.query(
                `SELECT
                    u.id,
                    u.nome,
                    u.email
                 FROM usuarios u
                 JOIN vinculos_institucionais v
                    ON v.usuario_id = u.id
                 WHERE v.instituicao_id = $1
                   AND v.perfil = 'avaliador'
                   AND v.status = 'aprovado'
                 ORDER BY u.nome`,
                [instituicaoId]
            );

            return res.status(200).json(resultado.rows);

        } catch (erro) {
            console.error(
                'Erro ao listar avaliadores:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao listar avaliadores.'
            });
        }
    }
);
module.exports = router;