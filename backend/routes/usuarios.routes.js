const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../database/connection');

const router = express.Router();

const autenticarToken = require('../middlewares/auth.middleware');
const autorizarPerfil = require('../middlewares/autorizarPerfil.middleware');

const autorizarPerfilGlobal = require('../middlewares/autorizarPerfilGlobal.middleware');


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

router.get('/',     autenticarToken,autorizarPerfilGlobal('admin', 'coordenador'), async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT id, nome, email, criado_em
             FROM usuarios
             ORDER BY id`
        );

        return res.json(resultado.rows);

    } catch (erro) {
        console.error('Erro ao buscar usuários:', erro.message);

        return res.status(500).json({
            erro: 'Erro interno ao buscar usuários.'
        });
    }
});



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