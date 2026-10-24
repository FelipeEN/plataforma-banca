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
    autorizarPerfil('admin', 'coordenador'),
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

router.delete(
    '/:instituicaoId/:vinculoId',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        const vinculoIdTexto = req.params.vinculoId;

        if (!/^[0-9]+$/.test(vinculoIdTexto)) {
            return res.status(400).json({
                erro: 'ID do vínculo inválido.'
            });
        }

        const vinculoId = Number(vinculoIdTexto);

        if (!Number.isSafeInteger(vinculoId) || vinculoId <= 0) {
            return res.status(400).json({
                erro: 'ID do vínculo inválido.'
            });
        }

        const instituicaoId = req.usuario.instituicaoId;
        let cliente;
        let transacaoIniciada = false;
        let erroLiberacao;

        try {
            cliente = await pool.connect();
            await cliente.query('BEGIN');
            transacaoIniciada = true;

            const resultadoAutorizador = await cliente.query(
                `SELECT id, perfil
                 FROM vinculos_institucionais
                 WHERE usuario_id = $1
                   AND instituicao_id = $2
                   AND status = 'aprovado'
                   AND perfil = ANY($3)
                 FOR UPDATE`,
                [req.usuario.id, instituicaoId, ['admin', 'coordenador']]
            );

            if (resultadoAutorizador.rows.length === 0) {
                await cliente.query('ROLLBACK');
                transacaoIniciada = false;
                return res.status(403).json({
                    erro: 'Você não tem mais permissão para remover vínculos nesta instituição.'
                });
            }

            const vinculoAutorizador = resultadoAutorizador.rows[0];

            const resultadoVinculo = await cliente.query(
                `SELECT id, usuario_id, perfil, status
                 FROM vinculos_institucionais
                 WHERE id = $1
                   AND instituicao_id = $2
                   AND status = 'aprovado'
                 FOR UPDATE`,
                [vinculoId, instituicaoId]
            );

            if (resultadoVinculo.rows.length === 0) {
                await cliente.query('ROLLBACK');
                transacaoIniciada = false;
                return res.status(404).json({
                    erro: 'Vínculo não encontrado nesta instituição.'
                });
            }

            const vinculo = resultadoVinculo.rows[0];

            if (Number(vinculo.usuario_id) === Number(req.usuario.id)) {
                await cliente.query('ROLLBACK');
                transacaoIniciada = false;
                return res.status(403).json({
                    erro: 'Você não pode remover seu próprio vínculo administrativo.'
                });
            }

            if (
                vinculoAutorizador.perfil === 'coordenador' &&
                vinculo.perfil === 'admin'
            ) {
                await cliente.query('ROLLBACK');
                transacaoIniciada = false;
                return res.status(403).json({
                    erro: 'Coordenadores não podem remover vínculos de administradores.'
                });
            }

            await cliente.query(
                `DELETE FROM vinculos_institucionais
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [vinculoId, instituicaoId]
            );

            await cliente.query('COMMIT');
            transacaoIniciada = false;

            return res.status(200).json({
                mensagem: 'Vínculo removido. A conta global e o histórico acadêmico foram preservados.'
            });
        } catch (erro) {
            if (cliente && transacaoIniciada) {
                try {
                    await cliente.query('ROLLBACK');
                } catch (erroRollback) {
                    erroLiberacao = erroRollback;
                    console.error(
                        'Erro ao reverter a remoção do vínculo:',
                        erroRollback.message
                    );
                }
            }

            if (erro.code === '23503') {
                return res.status(409).json({
                    erro: 'Não foi possível remover este vínculo devido a uma relação de dados existente.'
                });
            }

            console.error('Erro ao remover vínculo institucional:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao remover o vínculo institucional.'
            });
        } finally {
            if (cliente) {
                cliente.release(erroLiberacao);
            }
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


// Associar um usuário existente a uma instituição e definir seu perfil
router.post(
    '/:instituicaoId/associar',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const usuarioId = Number(req.body?.usuario_id);
            const perfil = req.body?.perfil;

            const perfisPermitidos = [
                'admin',
                'coordenador',
                'orientador',
                'avaliador',
                'aluno'
            ];

            if (
                !Number.isInteger(usuarioId) ||
                usuarioId <= 0
            ) {
                return res.status(400).json({
                    erro: 'Informe um ID de usuário válido.'
                });
            }

            if (!perfisPermitidos.includes(perfil)) {
                return res.status(400).json({
                    erro: 'Perfil inválido.'
                });
            }

            // Coordenadores não podem criar outros administradores
            // nem atribuir o perfil de coordenador.
            if (
                req.usuario.perfil === 'coordenador' &&
                ['admin', 'coordenador'].includes(perfil)
            ) {
                return res.status(403).json({
                    erro: 'Você não tem permissão para atribuir esse perfil.'
                });
            }

            // Verificar se a conta existe
            const usuario = await pool.query(
                `SELECT id
                 FROM usuarios
                 WHERE id = $1`,
                [usuarioId]
            );

            if (usuario.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Usuário não encontrado.'
                });
            }

            // Verificar se já existe um vínculo com essa instituição
            const vinculoExistente = await pool.query(
                `SELECT id, status
                 FROM vinculos_institucionais
                 WHERE usuario_id = $1
                   AND instituicao_id = $2`,
                [usuarioId, instituicaoId]
            );

            if (vinculoExistente.rows.length > 0) {
                return res.status(409).json({
                    erro: 'Este usuário já possui um vínculo com essa instituição.',
                    vinculo: vinculoExistente.rows[0]
                });
            }

            // Criar o vínculo já aprovado pelo administrador autorizado
            const resultado = await pool.query(
                `INSERT INTO vinculos_institucionais
                    (usuario_id, instituicao_id, perfil, status)
                 VALUES ($1, $2, $3, 'aprovado')
                 RETURNING
                    id,
                    usuario_id,
                    instituicao_id,
                    perfil,
                    status,
                    criado_em`,
                [usuarioId, instituicaoId, perfil]
            );

            return res.status(201).json({
                mensagem: 'Usuário associado à instituição com sucesso.',
                vinculo: resultado.rows[0]
            });

        } catch (erro) {
            if (erro.code === '23505') {
                return res.status(409).json({
                    erro: 'Este usuário já possui um vínculo com essa instituição.'
                });
            }

            console.error(
                'Erro ao associar usuário à instituição:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao associar usuário à instituição.'
            });
        }
    }
);


// Alterar o perfil de um vínculo já existente
router.patch(
    '/:instituicaoId/:id/perfil',
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
                 SET perfil = $1
                 WHERE id = $2
                   AND instituicao_id = $3
                   AND status = 'aprovado'
                 RETURNING
                    id,
                    usuario_id,
                    instituicao_id,
                    perfil,
                    status`,
                [perfil, vinculoId, instituicaoId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Vínculo aprovado não encontrado nesta instituição.'
                });
            }

            return res.json({
                mensagem: 'Perfil atualizado com sucesso.',
                vinculo: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                'Erro ao atualizar perfil do vínculo:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao atualizar o perfil.'
            });
        }
    }
);
module.exports = router;