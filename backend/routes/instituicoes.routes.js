const express = require('express');
const pool = require('../database/connection');

const router = express.Router();
const bcrypt = require('bcrypt');

router.get('/', async (req, res) => {
    try {
        const resultado = await pool.query(
            'SELECT * FROM instituicoes ORDER BY id'
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
    try {
        const { nome } = req.body || {};

        if (typeof nome !== 'string' || nome.trim() === '') {
            return res.status(400).json({
                erro: 'O nome da instituição é obrigatório.'
            });
        }

        const resultado = await pool.query(
            `INSERT INTO instituicoes (nome)
             VALUES ($1)
             RETURNING *`,
            [nome.trim()]
        );

        return res.status(201).json(resultado.rows[0]);

    } catch (erro) {
        console.error('Erro ao cadastrar instituição:', erro.message);

        return res.status(500).json({
            erro: 'Erro interno ao cadastrar instituição.'
        });
    }
});

router.post('/cadastrar', async (req, res) => {
    const { nomeInstituicao, nomeResponsavel, email, senha } = req.body || {};

    if (
        typeof nomeInstituicao !== 'string' ||
        nomeInstituicao.trim() === '' ||
        typeof nomeResponsavel !== 'string' ||
        nomeResponsavel.trim() === '' ||
        typeof email !== 'string' ||
        email.trim() === '' ||
        typeof senha !== 'string' ||
        senha.length < 8
    ) {
        return res.status(400).json({
            erro: 'Informe o nome da instituição, o nome do responsável, um e-mail válido e uma senha com pelo menos 8 caracteres.'
        });
    }

    const cliente = await pool.connect();

    try {
        await cliente.query('BEGIN');

        const resultadoInstituicao = await cliente.query(
            `INSERT INTO instituicoes (nome)
             VALUES ($1)
             RETURNING id, nome`,
            [nomeInstituicao.trim()]
        );

        const instituicao = resultadoInstituicao.rows[0];

        const senhaHash = await bcrypt.hash(senha, 10);

        const resultadoUsuario = await cliente.query(
            `INSERT INTO usuarios (nome, email, senha_hash)
             VALUES ($1, $2, $3)
             RETURNING id, nome, email`,
            [
                nomeResponsavel.trim(),
                email.trim().toLowerCase(),
                senhaHash
            ]
        );

        const usuario = resultadoUsuario.rows[0];

        const resultadoVinculo = await cliente.query(
            `INSERT INTO vinculos_institucionais
                (usuario_id, instituicao_id, perfil, status)
             VALUES ($1, $2, $3, $4)
             RETURNING id, usuario_id, instituicao_id, perfil, status`,
            [usuario.id, instituicao.id, 'admin', 'aprovado']
        );

        await cliente.query('COMMIT');

        return res.status(201).json({
            mensagem: 'Instituição cadastrada com sucesso!',
            instituicao,
            administrador: usuario,
            vinculo: resultadoVinculo.rows[0]
        });

    } catch (erro) {
        await cliente.query('ROLLBACK');

        if (erro.code === '23505') {
            return res.status(409).json({
                erro: 'Este e-mail já está cadastrado ou existe um registro duplicado.'
            });
        }

        console.error('Erro ao cadastrar instituição:', erro.message);

        return res.status(500).json({
            erro: 'Erro interno ao cadastrar instituição.'
        });

    } finally {
        cliente.release();
    }
});

module.exports = router;