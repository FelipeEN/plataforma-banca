const express = require('express');
const pool = require('../database/connection');

const autenticarToken = require('../middlewares/auth.middleware');
const autorizarPerfil = require('../middlewares/autorizarPerfil.middleware');

const router = express.Router();

router.post('/', autenticarToken, async (req, res) => {
    try {
        const instituicaoId = Number(req.body?.instituicao_id);

        if (!Number.isInteger(instituicaoId) || instituicaoId <= 0) {
            return res.status(400).json({
                erro: 'Informe um ID de instituição válido.'
            });
        }

        const instituicao = await pool.query(
            `SELECT id
             FROM instituicoes
             WHERE id = $1 AND ativa = TRUE`,
            [instituicaoId]
        );

        if (instituicao.rows.length === 0) {
            return res.status(404).json({
                erro: 'Instituição não encontrada ou inativa.'
            });
        }

        // O usuário só pode solicitar o próprio vínculo como aluno.
        const resultado = await pool.query(
            `INSERT INTO vinculos_institucionais
                (usuario_id, instituicao_id, perfil)
             VALUES ($1, $2, 'aluno')
             RETURNING id, usuario_id, instituicao_id,
                       perfil, status, criado_em`,
            [req.usuario.id, instituicaoId]
        );

        return res.status(201).json(resultado.rows[0]);

    } catch (erro) {
        if (erro.code === '23505') {
            return res.status(409).json({
                erro: 'Você já possui um vínculo com essa instituição.'
            });
        }

        console.error('Erro ao solicitar vínculo:', erro.message);

        return res.status(500).json({
            erro: 'Erro interno ao solicitar vínculo.'
        });
    }
});

router.get(
    '/:instituicaoId',
    autenticarToken,
   autorizarPerfil('admin'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;

            const resultado = await pool.query(
                `SELECT
                    v.id,
                    v.usuario_id,
                    u.nome AS usuario_nome,
                    v.instituicao_id,
                    i.nome AS instituicao_nome,
                    v.perfil,
                    v.status,
                    v.criado_em
                 FROM vinculos_institucionais v
                 INNER JOIN usuarios u ON u.id = v.usuario_id
                 INNER JOIN instituicoes i ON i.id = v.instituicao_id
                 WHERE v.instituicao_id = $1
                 ORDER BY v.id`,
                [instituicaoId]
            );

            return res.json(resultado.rows);

        } catch (erro) {
            console.error('Erro ao listar vínculos:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao listar vínculos.'
            });
        }
    }
);

router.patch(
    '/:instituicaoId/:id/aprovar',
    autenticarToken,
    autorizarPerfil('admin'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const vinculoId = Number(req.params.id);
            const { perfil } = req.body || {};

            const perfisPermitidos = [
                'admin',
                'coordenador',
                'orientador',
                'avaliador',
                'aluno'
            ];

            if (!Number.isInteger(vinculoId) || vinculoId <= 0) {
                return res.status(400).json({
                    erro: 'ID do vínculo inválido.'
                });
            }

            if (!perfisPermitidos.includes(perfil)) {
                return res.status(400).json({
                    erro: 'Informe um perfil válido.'
                });
            }

            const resultado = await pool.query(
                `UPDATE vinculos_institucionais
                 SET perfil = $1,
                     status = 'aprovado'
                 WHERE id = $2
                   AND instituicao_id = $3
                   AND status = 'pendente'
                 RETURNING id, usuario_id, instituicao_id,
                           perfil, status`,
                [perfil, vinculoId, instituicaoId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Vínculo pendente não encontrado nesta instituição.'
                });
            }

            return res.json(resultado.rows[0]);

        } catch (erro) {
            console.error('Erro ao aprovar vínculo:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao aprovar vínculo.'
            });
        }
    }
);

router.patch(
    '/:instituicaoId/:id/rejeitar',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const vinculoId = Number(req.params.id);

            if (!Number.isInteger(vinculoId) || vinculoId <= 0) {
                return res.status(400).json({
                    erro: 'ID do vínculo inválido.'
                });
            }

            const resultado = await pool.query(
                `UPDATE vinculos_institucionais
                 SET status = 'rejeitado'
                 WHERE id = $1
                   AND instituicao_id = $2
                   AND status = 'pendente'
                 RETURNING id, usuario_id, instituicao_id,
                           perfil, status`,
                [vinculoId, instituicaoId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Vínculo pendente não encontrado nesta instituição.'
                });
            }

            return res.json(resultado.rows[0]);

        } catch (erro) {
            console.error('Erro ao rejeitar vínculo:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao rejeitar vínculo.'
            });
        }
    }
);

module.exports = router;