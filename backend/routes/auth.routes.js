const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../database/connection');

const router = express.Router();

const jwt = require('jsonwebtoken');

const autenticarToken = require('../middlewares/auth.middleware');

router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body || {};

        if (
            typeof email !== 'string' || email.trim() === '' ||
            typeof senha !== 'string' || senha === ''
        ) {
            return res.status(400).json({
                erro: 'Informe o e-mail e a senha.'
            });
        }

        const resultado = await pool.query(
            `SELECT id, nome, email, senha_hash,
                    email_verification_required, email_verified_at
             FROM usuarios
             WHERE email = $1`,
            [email.trim().toLowerCase()]
        );

        const usuario = resultado.rows[0];

        if (!usuario) {
            return res.status(401).json({
                erro: 'E-mail ou senha inválidos.'
            });
        }

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha_hash
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                erro: 'E-mail ou senha inválidos.'
            });
        }

        if (
            usuario.email_verification_required &&
            !usuario.email_verified_at
        ) {
            return res.status(403).json({
                erro: 'Confirme seu e-mail antes de entrar. Consulte sua caixa de entrada ou solicite um novo link de confirmação.'
            });
        }

        const token = jwt.sign(
            {
                email: usuario.email
            },
            process.env.JWT_SECRET,
            {
                subject: String(usuario.id),
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
        );

        return res.status(200).json({
            mensagem: 'Login realizado com sucesso!',
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });
    } catch (erro) {
        console.error('Erro ao realizar login:', erro.message);

        return res.status(500).json({
            erro: 'Erro interno ao realizar login.'
        });
    }
});

router.get('/me', autenticarToken, async (req, res) => {
    try {
        const usuarioId = Number(req.usuario.id);

        const resultado = await pool.query(
            `SELECT id, nome, email
             FROM usuarios
             WHERE id = $1`,
            [usuarioId]
        );

        const usuario = resultado.rows[0];

        if (!usuario) {
            return res.status(404).json({
                erro: 'Usuário não encontrado.'
            });
        }
        const vinculos = req.usuario.vinculos || [];

        return res.status(200).json({
            usuario: {
                ...usuario,
                vinculos
            }
        });

    } catch (erro) {
        console.error('Erro ao consultar usuário:', erro.message);

        return res.status(500).json({
            erro: 'Erro interno ao consultar usuário.'
        });
    }
});

module.exports = router;