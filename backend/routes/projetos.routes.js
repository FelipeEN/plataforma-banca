const express = require('express');
const pool = require('../database/connection');

const autenticarToken = require('../middlewares/auth.middleware');
const autorizarPerfil = require('../middlewares/autorizarPerfil.middleware');

const router = express.Router();
// Listar projetos da instituição
router.get(
    '/:instituicaoId',
    autenticarToken,
    autorizarPerfil(
        'admin',
        'coordenador',
        'orientador',
        'avaliador',
        'aluno'
    ),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;

            const resultado = await pool.query(
                `SELECT
                    p.id,
                    p.titulo,
                    p.descricao,
                    p.status,
                    p.criado_em
                 FROM projetos p
                 WHERE p.instituicao_id = $1
                 ORDER BY p.criado_em DESC`,
                [instituicaoId]
            );

            return res.status(200).json({
                total: resultado.rows.length,
                projetos: resultado.rows
            });

        } catch (erro) {
            console.error('Erro ao listar projetos:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao listar projetos.'
            });
        }
    }
);

// Consultar detalhes de um projeto específico
router.get(
    '/:instituicaoId/:projetoId',
    autenticarToken,
    autorizarPerfil(
        'admin',
        'coordenador',
        'orientador',
        'avaliador',
        'aluno'
    ),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const projetoId = Number(req.params.projetoId);

            if (!Number.isInteger(projetoId) || projetoId <= 0) {
                return res.status(400).json({
                    erro: 'ID do projeto inválido.'
                });
            }

            const resultado = await pool.query(
                `SELECT
                    p.id,
                    p.instituicao_id,
                    p.titulo,
                    p.descricao,
                    p.status,
                    p.criado_em
                 FROM projetos p
                 WHERE p.id = $1
                   AND p.instituicao_id = $2`,
                [projetoId, instituicaoId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Projeto não encontrado nesta instituição.'
                });
            }

            return res.status(200).json({
                projeto: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                'Erro ao consultar projeto:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao consultar projeto.'
            });
        }
    }
);
// Cadastrar projeto
router.post(
    '/:instituicaoId',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador', 'orientador', 'aluno'),
    async (req, res) => {
        const { titulo, descricao } = req.body;

        const instituicaoId = req.usuario.instituicaoId;

        // Validar o título
        if (typeof titulo !== 'string' || !titulo.trim()) {
            return res.status(400).json({
                erro: 'O título do projeto é obrigatório.'
            });
        }

        const cliente = await pool.connect();

        try {
            await cliente.query('BEGIN');

            const resultado = await cliente.query(
                `INSERT INTO projetos
                    (instituicao_id, titulo, descricao)
                 VALUES ($1, $2, $3)
                 RETURNING id, instituicao_id, titulo, descricao, status, criado_em`,
                [instituicaoId, titulo.trim(), descricao || null]
            );

            const projeto = resultado.rows[0];

            // Se o criador for aluno, adiciona-o à equipe.
            if (req.usuario.perfil === 'aluno') {
                await cliente.query(
                    `INSERT INTO membros_projeto
                        (projeto_id, usuario_id, funcao)
                     VALUES ($1, $2, 'aluno')`,
                    [projeto.id, req.usuario.id]
                );
            }

            await cliente.query('COMMIT');

            return res.status(201).json({
                mensagem: 'Projeto cadastrado com sucesso!',
                projeto
            });

        } catch (erro) {
            await cliente.query('ROLLBACK');

            console.error('Erro ao cadastrar projeto:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao cadastrar projeto.'
            });

        } finally {
            cliente.release();
        }
    }
);

// Editar informações de um projeto
router.put(
    '/:instituicaoId/:projetoId',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const projetoId = Number(req.params.projetoId);
            const { titulo, descricao } = req.body;

            // Validar o ID do projeto
            if (!Number.isInteger(projetoId) || projetoId <= 0) {
                return res.status(400).json({
                    erro: 'ID do projeto inválido.'
                });
            }

            // Validar o título
            if (typeof titulo !== 'string' || !titulo.trim()) {
                return res.status(400).json({
                    erro: 'O título do projeto é obrigatório.'
                });
            }

            // Verificar se o projeto pertence à instituição
            const projetoExiste = await pool.query(
                `SELECT id
                 FROM projetos
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [projetoId, instituicaoId]
            );

            if (projetoExiste.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Projeto não encontrado nesta instituição.'
                });
            }

            // Atualizar o projeto
            const resultado = await pool.query(
                `UPDATE projetos
                 SET titulo = $1,
                     descricao = $2
                 WHERE id = $3
                   AND instituicao_id = $4
                 RETURNING id, titulo, descricao, status, criado_em`,
                [
                    titulo.trim(),
                    typeof descricao === 'string' && descricao.trim()
                        ? descricao.trim()
                        : null,
                    projetoId,
                    instituicaoId
                ]
            );

            return res.status(200).json({
                mensagem: 'Projeto atualizado com sucesso!',
                projeto: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                'Erro ao editar projeto:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao editar projeto.'
            });
        }
    }
);

// Excluir projeto sem vínculos com bancas ou avaliações
router.delete(
    '/:instituicaoId/:projetoId',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        const cliente = await pool.connect();

        try {
            const instituicaoId = req.usuario.instituicaoId;
            const projetoId = Number(req.params.projetoId);

            if (!Number.isInteger(projetoId) || projetoId <= 0) {
                return res.status(400).json({
                    erro: 'ID do projeto inválido.'
                });
            }

            await cliente.query('BEGIN');

            // Verifica se o projeto existe nesta instituição
            const projeto = await cliente.query(
                `SELECT id, titulo
                 FROM projetos
                 WHERE id = $1
                   AND instituicao_id = $2
                 FOR UPDATE`,
                [projetoId, instituicaoId]
            );

            if (projeto.rows.length === 0) {
                await cliente.query('ROLLBACK');

                return res.status(404).json({
                    erro: 'Projeto não encontrado nesta instituição.'
                });
            }

            // Impede excluir projetos vinculados a bancas
            const banca = await cliente.query(
                `SELECT 1
                 FROM projetos_banca
                 WHERE projeto_id = $1
                 LIMIT 1`,
                [projetoId]
            );

            if (banca.rows.length > 0) {
                await cliente.query('ROLLBACK');

                return res.status(409).json({
                    erro: 'Este projeto está vinculado a uma banca e não pode ser excluído.'
                });
            }

            // Impede excluir projetos com avaliações
            const avaliacao = await cliente.query(
                `SELECT 1
                 FROM avaliacoes
                 WHERE projeto_id = $1
                 LIMIT 1`,
                [projetoId]
            );

            if (avaliacao.rows.length > 0) {
                await cliente.query('ROLLBACK');

                return res.status(409).json({
                    erro: 'Este projeto possui avaliações e não pode ser excluído.'
                });
            }

            // Remove integrantes associados ao projeto
            await cliente.query(
                `DELETE FROM membros_projeto
                 WHERE projeto_id = $1`,
                [projetoId]
            );

            // Exclui o projeto
            await cliente.query(
                `DELETE FROM projetos
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [projetoId, instituicaoId]
            );

            await cliente.query('COMMIT');

            return res.status(200).json({
                mensagem: 'Projeto excluído com sucesso!',
                projeto: projeto.rows[0]
            });

        } catch (erro) {
            await cliente.query('ROLLBACK');

            console.error(
                'Erro ao excluir projeto:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao excluir projeto.'
            });

        } finally {
            cliente.release();
        }
    }
);

// Listar integrantes de um projeto
router.get(
    '/:instituicaoId/:projetoId/membros',
    autenticarToken,
    autorizarPerfil(
        'admin',
        'coordenador',
        'orientador',
        'avaliador',
        'aluno'
    ),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const projetoId = Number(req.params.projetoId);

            if (!Number.isInteger(projetoId) || projetoId <= 0) {
                return res.status(400).json({
                    erro: 'ID do projeto inválido.'
                });
            }

            const projetoExiste = await pool.query(
                `SELECT id
                FROM projetos
                WHERE id = $1
                AND instituicao_id = $2`,
                [projetoId, instituicaoId]
            );

            if (projetoExiste.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Projeto não encontrado nesta instituição.'
                });
            }

            const resultado = await pool.query(
                `SELECT
                    u.id AS usuario_id,
                    u.nome,
                    u.email,
                    mp.funcao
                 FROM projetos p
                 JOIN membros_projeto mp
                    ON mp.projeto_id = p.id
                 JOIN usuarios u
                    ON u.id = mp.usuario_id
                 WHERE p.id = $1
                   AND p.instituicao_id = $2
                 ORDER BY u.nome`,
                [projetoId, instituicaoId]
            );

            return res.status(200).json(resultado.rows);

        } catch (erro) {
            console.error(
                'Erro ao listar integrantes:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao listar integrantes.'
            });
        }
    }
);

// Associar orientador a um projeto
router.post(
    '/:instituicaoId/:projetoId/orientadores',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const projetoId = Number(req.params.projetoId);
            const { usuario_id } = req.body;

            if (!Number.isInteger(projetoId) || projetoId <= 0) {
                return res.status(400).json({
                    erro: 'ID do projeto inválido.'
                });
            }

            if (!Number.isInteger(usuario_id) || usuario_id <= 0) {
                return res.status(400).json({
                    erro: 'ID do orientador inválido.'
                });
            }

            // Verificar se o projeto pertence à instituição
            const projeto = await pool.query(
                `SELECT id
                 FROM projetos
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [projetoId, instituicaoId]
            );

            if (projeto.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Projeto não encontrado nesta instituição.'
                });
            }

            // Verificar se o usuário é orientador aprovado
            const orientador = await pool.query(
                `SELECT u.id, u.nome
                 FROM usuarios u
                 JOIN vinculos_institucionais v
                   ON v.usuario_id = u.id
                 WHERE u.id = $1
                   AND v.instituicao_id = $2
                   AND v.perfil = 'orientador'
                   AND v.status = 'aprovado'`,
                [usuario_id, instituicaoId]
            );

            if (orientador.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Orientador não encontrado ou sem vínculo aprovado nesta instituição.'
                });
            }

            // Verificar se já faz parte do projeto
            const membroExistente = await pool.query(
                `SELECT projeto_id
                 FROM membros_projeto
                 WHERE projeto_id = $1
                   AND usuario_id = $2`,
                [projetoId, usuario_id]
            );

            if (membroExistente.rows.length > 0) {
                return res.status(409).json({
                    erro: 'Este usuário já está associado ao projeto.'
                });
            }

            // Associar orientador ao projeto
            await pool.query(
                `INSERT INTO membros_projeto
                    (projeto_id, usuario_id, funcao)
                 VALUES ($1, $2, 'orientador')`,
                [projetoId, usuario_id]
            );

            return res.status(201).json({
                mensagem: 'Orientador associado ao projeto com sucesso!',
                projeto_id: projetoId,
                orientador: orientador.rows[0]
            });

        } catch (erro) {
            console.error(
                'Erro ao associar orientador:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao associar orientador.'
            });
        }
    }
);

// Associar aluno a um projeto
router.post(
    '/:instituicaoId/:projetoId/alunos',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const projetoId = Number(req.params.projetoId);
            const { usuario_id } = req.body;

            // Validar o ID do projeto
            if (!Number.isInteger(projetoId) || projetoId <= 0) {
                return res.status(400).json({
                    erro: 'ID do projeto inválido.'
                });
            }

            // Validar o ID do aluno
            if (!Number.isInteger(usuario_id) || usuario_id <= 0) {
                return res.status(400).json({
                    erro: 'ID do aluno inválido.'
                });
            }

            // Verificar se o projeto pertence à instituição
            const projeto = await pool.query(
                `SELECT id
                 FROM projetos
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [projetoId, instituicaoId]
            );

            if (projeto.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Projeto não encontrado nesta instituição.'
                });
            }

            // Verificar se o usuário é um aluno com vínculo aprovado
            const aluno = await pool.query(
                `SELECT u.id, u.nome, u.email
                 FROM usuarios u
                 JOIN vinculos_institucionais v
                   ON v.usuario_id = u.id
                 WHERE u.id = $1
                   AND v.instituicao_id = $2
                   AND v.perfil = 'aluno'
                   AND v.status = 'aprovado'`,
                [usuario_id, instituicaoId]
            );

            if (aluno.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Aluno não encontrado ou sem vínculo aprovado nesta instituição.'
                });
            }

            // Verificar se o aluno já faz parte do projeto
            const membroExistente = await pool.query(
                `SELECT projeto_id
                 FROM membros_projeto
                 WHERE projeto_id = $1
                   AND usuario_id = $2`,
                [projetoId, usuario_id]
            );

            if (membroExistente.rows.length > 0) {
                return res.status(409).json({
                    erro: 'Este aluno já está associado ao projeto.'
                });
            }

            // Associar o aluno ao projeto
            await pool.query(
                `INSERT INTO membros_projeto
                    (projeto_id, usuario_id, funcao)
                 VALUES ($1, $2, 'aluno')`,
                [projetoId, usuario_id]
            );

            return res.status(201).json({
                mensagem: 'Aluno associado ao projeto com sucesso!',
                projeto_id: projetoId,
                aluno: aluno.rows[0]
            });
        } catch (erro) {
            console.error(
                'Erro ao associar aluno:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao associar aluno.'
            });
        }
    }
);



// Remover integrante de um projeto
router.delete(
    '/:instituicaoId/:projetoId/membros/:usuarioId',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const projetoId = Number(req.params.projetoId);
            const usuarioId = Number(req.params.usuarioId);

            // Validar os IDs
            if (
                !Number.isInteger(projetoId) ||
                projetoId <= 0 ||
                !Number.isInteger(usuarioId) ||
                usuarioId <= 0
            ) {
                return res.status(400).json({
                    erro: 'ID do projeto ou do integrante inválido.'
                });
            }

            // Verificar se o projeto pertence à instituição
            const projeto = await pool.query(
                `SELECT id
                 FROM projetos
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [projetoId, instituicaoId]
            );

            if (projeto.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Projeto não encontrado nesta instituição.'
                });
            }

            // Remover o integrante somente deste projeto
            const resultado = await pool.query(
                `DELETE FROM membros_projeto
                 WHERE projeto_id = $1
                   AND usuario_id = $2
                 RETURNING usuario_id, funcao`,
                [projetoId, usuarioId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Integrante não encontrado neste projeto.'
                });
            }

            return res.status(200).json({
                mensagem: 'Integrante removido do projeto com sucesso!',
                integrante: resultado.rows[0]
            });
        } catch (erro) {
            console.error(
                'Erro ao remover integrante:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao remover integrante.'
            });
        }
    }
);

module.exports = router