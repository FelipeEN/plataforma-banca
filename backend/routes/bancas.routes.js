const express = require('express');
const pool = require('../database/connection');

const autenticarToken = require('../middlewares/auth.middleware');
const autorizarPerfil = require('../middlewares/autorizarPerfil.middleware');

const router = express.Router();

// Cadastrar banca
router.post(
    '/:instituicaoId',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const { nome } = req.body;
            const instituicaoId = req.usuario.instituicaoId;

            if (typeof nome !== 'string' || !nome.trim()) {
                return res.status(400).json({
                    erro: 'O nome da banca é obrigatório.'
                });
            }

            const resultado = await pool.query(
                `INSERT INTO bancas
                    (instituicao_id, nome)
                 VALUES ($1, $2)
                 RETURNING id, instituicao_id, nome, status, criada_em`,
                [instituicaoId, nome.trim()]
            );

            return res.status(201).json({
                mensagem: 'Banca cadastrada com sucesso!',
                banca: resultado.rows[0]
            });

        } catch (erro) {
            console.error('Erro ao cadastrar banca:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao cadastrar banca.'
            });
        }
    }
);

// Listar bancas da instituição
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
                `SELECT id, instituicao_id, nome, status, criada_em
                 FROM bancas
                 WHERE instituicao_id = $1
                 ORDER BY id DESC`,
                [instituicaoId]
            );

            return res.status(200).json(resultado.rows);

        } catch (erro) {
            console.error('Erro ao listar bancas:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao listar bancas.'
            });
        }
    }
);


// Associar projeto a uma banca
router.post(
    '/:instituicaoId/:bancaId/projetos',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const bancaId = Number(req.params.bancaId);
            const { projeto_id } = req.body;

            if (!Number.isInteger(bancaId) || bancaId <= 0) {
                return res.status(400).json({
                    erro: 'ID da banca inválido.'
                });
            }

            if (!Number.isInteger(projeto_id) || projeto_id <= 0) {
                return res.status(400).json({
                    erro: 'ID do projeto inválido.'
                });
            }

            // Verificar se a banca pertence à instituição
            const banca = await pool.query(
                `SELECT id, status
                 FROM bancas
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [bancaId, instituicaoId]
            );

            if (banca.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Banca não encontrada nesta instituição.'
                });
            }

            // Verificar se o projeto pertence à instituição
            const projeto = await pool.query(
                `SELECT id
                 FROM projetos
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [projeto_id, instituicaoId]
            );

            if (projeto.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Projeto não encontrado nesta instituição.'
                });
            }

            // Impedir associação duplicada
            const associacaoExistente = await pool.query(
                `SELECT banca_id
                 FROM projetos_banca
                 WHERE banca_id = $1
                   AND projeto_id = $2`,
                [bancaId, projeto_id]
            );

            if (associacaoExistente.rows.length > 0) {
                return res.status(409).json({
                    erro: 'Este projeto já está associado à banca.'
                });
            }

            await pool.query(
                `INSERT INTO projetos_banca (banca_id, projeto_id)
                 VALUES ($1, $2)`,
                [bancaId, projeto_id]
            );

            return res.status(201).json({
                mensagem: 'Projeto associado à banca com sucesso!',
                banca_id: bancaId,
                projeto_id
            });

        } catch (erro) {
            console.error('Erro ao associar projeto à banca:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao associar projeto à banca.'
            });
        }
    }
);

// Listar projetos associados a uma banca
router.get(
    '/:instituicaoId/:bancaId/projetos',
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
            const usuarioId = req.usuario.id;
            const perfil = req.usuario.perfil;
            const bancaId = Number(req.params.bancaId);

            if (!Number.isInteger(bancaId) || bancaId <= 0) {
                return res.status(400).json({
                    erro: 'ID da banca inválido.'
                });
            }

            // Verificar se a banca pertence à instituição
            const banca = await pool.query(
                `SELECT id, nome, status
                 FROM bancas
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [bancaId, instituicaoId]
            );

            if (banca.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Banca não encontrada nesta instituição.'
                });
            }

            // O avaliador precisa estar associado à banca
            if (perfil === 'avaliador') {
                const associacao = await pool.query(
                    `SELECT 1
                     FROM avaliadores_banca
                     WHERE banca_id = $1
                       AND usuario_id = $2`,
                    [bancaId, usuarioId]
                );

                if (associacao.rows.length === 0) {
                    return res.status(403).json({
                        erro: 'Você não está associado a esta banca.'
                    });
                }
            }

            // Listar os projetos associados à banca
            const resultado = await pool.query(
                `SELECT
                    p.id,
                    p.titulo,
                    p.descricao,
                    p.status
                 FROM projetos_banca pb
                 INNER JOIN projetos p
                    ON p.id = pb.projeto_id
                 WHERE pb.banca_id = $1
                   AND p.instituicao_id = $2
                 ORDER BY p.id`,
                [bancaId, instituicaoId]
            );

            return res.status(200).json({
                banca: banca.rows[0],
                total_projetos: resultado.rows.length,
                projetos: resultado.rows
            });
        } catch (erro) {
            console.error(
                'Erro ao listar projetos da banca:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao listar projetos da banca.'
            });
        }
    }
);

// Associar avaliador a uma banca
router.post(
    '/:instituicaoId/:bancaId/avaliadores',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const bancaId = Number(req.params.bancaId);
            const { usuario_id } = req.body || {};

            // Validar os IDs
            if (!Number.isInteger(bancaId) || bancaId <= 0) {
                return res.status(400).json({
                    erro: 'ID da banca inválido.'
                });
            }

            if (!Number.isInteger(usuario_id) || usuario_id <= 0) {
                return res.status(400).json({
                    erro: 'ID do usuário inválido.'
                });
            }

            // Verificar se a banca pertence à instituição
            const banca = await pool.query(
                `SELECT id
                 FROM bancas
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [bancaId, instituicaoId]
            );

            if (banca.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Banca não encontrada nesta instituição.'
                });
            }

            // Verificar se o usuário é avaliador aprovado
            const avaliador = await pool.query(
                `SELECT usuario_id
                 FROM vinculos_institucionais
                 WHERE usuario_id = $1
                   AND instituicao_id = $2
                   AND perfil = 'avaliador'
                   AND status = 'aprovado'`,
                [usuario_id, instituicaoId]
            );

            if (avaliador.rows.length === 0) {
                return res.status(400).json({
                    erro: 'O usuário não possui vínculo aprovado como avaliador nesta instituição.'
                });
            }

            // Impedir associação duplicada
            const associacaoExistente = await pool.query(
                `SELECT banca_id
                 FROM avaliadores_banca
                 WHERE banca_id = $1
                   AND usuario_id = $2`,
                [bancaId, usuario_id]
            );

            if (associacaoExistente.rows.length > 0) {
                return res.status(409).json({
                    erro: 'Este avaliador já está associado à banca.'
                });
            }

            // Registrar a associação
            await pool.query(
                `INSERT INTO avaliadores_banca
                    (banca_id, usuario_id)
                 VALUES ($1, $2)`,
                [bancaId, usuario_id]
            );

            return res.status(201).json({
                mensagem: 'Avaliador associado à banca com sucesso!',
                banca_id: bancaId,
                usuario_id
            });

        } catch (erro) {
            console.error(
                'Erro ao associar avaliador à banca:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao associar avaliador à banca.'
            });
        }
    }
);

// Listar avaliadores associados a uma banca
router.get(
    '/:instituicaoId/:bancaId/avaliadores',
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
            const bancaId = Number(req.params.bancaId);

            if (!Number.isInteger(bancaId) || bancaId <= 0) {
                return res.status(400).json({
                    erro: 'ID da banca inválido.'
                });
            }

            const banca = await pool.query(
                `SELECT id, nome, status
                 FROM bancas
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [bancaId, instituicaoId]
            );

            if (banca.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Banca não encontrada nesta instituição.'
                });
            }

            const resultado = await pool.query(
                `SELECT
                    u.id AS usuario_id,
                    u.nome,
                    u.email
                 FROM avaliadores_banca ab
                 INNER JOIN usuarios u
                    ON u.id = ab.usuario_id
                 WHERE ab.banca_id = $1
                 ORDER BY u.nome`,
                [bancaId]
            );

            return res.status(200).json({
                banca: banca.rows[0],
                total_avaliadores: resultado.rows.length,
                avaliadores: resultado.rows
            });

        } catch (erro) {
            console.error(
                'Erro ao listar avaliadores da banca:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao listar avaliadores da banca.'
            });
        }
    }
);

// Cadastrar critério de avaliação em uma banca
router.post(
    '/:instituicaoId/:bancaId/criterios',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const bancaId = Number(req.params.bancaId);

            const { nome, descricao, peso, nota_maxima } = req.body || {};

            // Validar ID da banca
            if (!Number.isInteger(bancaId) || bancaId <= 0) {
                return res.status(400).json({
                    erro: 'ID da banca inválido.'
                });
            }

            // Validar nome
            if (typeof nome !== 'string' || !nome.trim()) {
                return res.status(400).json({
                    erro: 'O nome do critério é obrigatório.'
                });
            }

            // Validar peso
            const pesoNumero = Number(peso);

            if (
                peso === undefined ||
                peso === null ||
                peso === '' ||
                !Number.isFinite(pesoNumero) ||
                pesoNumero <= 0
            ) {
                return res.status(400).json({
                    erro: 'O peso deve ser um número maior que zero.'
                });
            }

            // Validar nota máxima
            const notaMaximaNumero = Number(nota_maxima);

            if (
                nota_maxima === undefined ||
                nota_maxima === null ||
                nota_maxima === '' ||
                !Number.isFinite(notaMaximaNumero) ||
                notaMaximaNumero <= 0
            ) {
                return res.status(400).json({
                    erro: 'A nota máxima deve ser um número maior que zero.'
                });
            }

            // Verificar se a banca pertence à instituição
            const banca = await pool.query(
                `SELECT id
                 FROM bancas
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [bancaId, instituicaoId]
            );

            if (banca.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Banca não encontrada nesta instituição.'
                });
            }

            // Cadastrar critério
            const resultado = await pool.query(
                `INSERT INTO criterios_avaliacao
                    (banca_id, nome, descricao, peso, nota_maxima)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, banca_id, nome, descricao,
                           peso, nota_maxima, criado_em`,
                [
                    bancaId,
                    nome.trim(),
                    typeof descricao === 'string' ? descricao.trim() || null : null,
                    pesoNumero,
                    notaMaximaNumero
                ]
            );

            return res.status(201).json({
                mensagem: 'Critério de avaliação cadastrado com sucesso!',
                criterio: resultado.rows[0]
            });

        } catch (erro) {
            // O banco impede nomes duplicados na mesma banca
            if (erro.code === '23505') {
                return res.status(409).json({
                    erro: 'Já existe um critério com esse nome nesta banca.'
                });
            }

            console.error(
                'Erro ao cadastrar critério:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao cadastrar critério.'
            });
        }
    }
);

// Listar critérios de avaliação de uma banca
router.get(
    '/:instituicaoId/:bancaId/criterios',
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
            const bancaId = Number(req.params.bancaId);

            if (!Number.isInteger(bancaId) || bancaId <= 0) {
                return res.status(400).json({
                    erro: 'ID da banca inválido.'
                });
            }

            // Verificar se a banca pertence à instituição
            const banca = await pool.query(
                `SELECT id, nome, status
                 FROM bancas
                 WHERE id = $1
                   AND instituicao_id = $2`,
                [bancaId, instituicaoId]
            );

            if (banca.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Banca não encontrada nesta instituição.'
                });
            }

            // Buscar os critérios da banca
            const resultado = await pool.query(
                `SELECT
                    id,
                    nome,
                    descricao,
                    peso,
                    nota_maxima,
                    criado_em
                 FROM criterios_avaliacao
                 WHERE banca_id = $1
                 ORDER BY id`,
                [bancaId]
            );

            return res.status(200).json({
                banca: banca.rows[0],
                total_criterios: resultado.rows.length,
                criterios: resultado.rows
            });

        } catch (erro) {
            console.error(
                'Erro ao listar critérios:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao listar critérios.'
            });
        }
    }
);

// Abrir uma banca para avaliação
router.patch(
    '/:instituicaoId/:bancaId/abrir',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = Number(req.params.instituicaoId);
            const bancaId = Number(req.params.bancaId);

            if (
                !Number.isInteger(bancaId) ||
                bancaId <= 0
            ) {
                return res.status(400).json({
                    erro: 'ID da banca inválido.'
                });
            }

            const resultado = await pool.query(
                `UPDATE bancas
                 SET status = 'aberta'
                 WHERE id = $1
                   AND instituicao_id = $2
                   AND status = 'rascunho'
                 RETURNING id, nome, status`,
                [bancaId, instituicaoId]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    erro: 'Banca não encontrada ou não está em rascunho.'
                });
            }

            return res.status(200).json({
                mensagem: 'Banca aberta para avaliação com sucesso!',
                banca: resultado.rows[0]
            });
        } catch (erro) {
            console.error('Erro ao abrir banca:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao abrir a banca.'
            });
        }
    }
);


 // Encerrar uma banca de avaliação
router.patch(
    '/:instituicaoId/:bancaId/encerrar',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const bancaId = Number(req.params.bancaId);

            if (!Number.isInteger(bancaId) || bancaId <= 0) {
                return res.status(400).json({
                    erro: 'ID da banca inválido.'
                });
            }

            // Verificar se todas as avaliações foram finalizadas
            const pendencias = await pool.query(
                `SELECT COUNT(*) AS total
                 FROM projetos_banca pb
                 INNER JOIN avaliadores_banca ab
                    ON ab.banca_id = pb.banca_id
                 LEFT JOIN avaliacoes a
                    ON a.banca_id = pb.banca_id
                   AND a.projeto_id = pb.projeto_id
                   AND a.avaliador_id = ab.usuario_id
                 WHERE pb.banca_id = $1
                   AND (
                       a.id IS NULL
                       OR a.status <> 'finalizada'
                   )`,
                [bancaId]
            );

            if (Number(pendencias.rows[0].total) > 0) {
                return res.status(409).json({
                    erro: 'Não é possível encerrar a banca: existem avaliações pendentes.'
                });
            }

            // Encerrar somente uma banca que esteja aberta
            const resultado = await pool.query(
                `UPDATE bancas
                 SET status = 'encerrada'
                 WHERE id = $1
                   AND instituicao_id = $2
                   AND status = 'aberta'
                 RETURNING id, instituicao_id, nome, status`,
                [bancaId, instituicaoId]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    erro: 'Banca não encontrada nesta instituição ou não está aberta.'
                });
            }

            return res.status(200).json({
                mensagem: 'Banca encerrada com sucesso!',
                banca: resultado.rows[0]
            });

        } catch (erro) {
            console.error('Erro ao encerrar banca:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao encerrar a banca.'
            });
        }
    }
);


 // Publicar uma banca encerrada
router.patch(
    '/:instituicaoId/:bancaId/publicar',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const bancaId = Number(req.params.bancaId);

            if (!Number.isInteger(bancaId) || bancaId <= 0) {
                return res.status(400).json({
                    erro: 'ID da banca inválido.'
                });
            }

            const resultado = await pool.query(
                `UPDATE bancas
                 SET status = 'publicada'
                 WHERE id = $1
                   AND instituicao_id = $2
                   AND status = 'encerrada'
                 RETURNING id, instituicao_id, nome, status`,
                [bancaId, instituicaoId]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    erro: 'Banca não encontrada nesta instituição ou não está encerrada.'
                });
            }

            return res.status(200).json({
                mensagem: 'Banca publicada com sucesso!',
                banca: resultado.rows[0]
            });

        } catch (erro) {
            console.error('Erro ao publicar banca:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao publicar a banca.'
            });
        }
    }
);


module.exports = router;