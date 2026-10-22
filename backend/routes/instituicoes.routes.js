const express = require('express');
const pool = require('../database/connection');

const router = express.Router();


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

module.exports = router;