const express = require('express');
const pool = require('../database/connection');

const autenticarToken = require('../middlewares/auth.middleware');
const autorizarPerfil = require('../middlewares/autorizarPerfil.middleware');

const router = express.Router();


// Registrar avaliação de um projeto
router.post(
    '/:instituicaoId/:bancaId/:projetoId',
    autenticarToken,
    autorizarPerfil('avaliador'),
    async (req, res) => {
        let cliente = null;
        let transacaoIniciada = false;
        try {
            cliente = await pool.connect();
            const instituicaoId = req.usuario.instituicaoId;
            const bancaId = Number(req.params.bancaId);
            const projetoId = Number(req.params.projetoId);

            const { notas, comentario } = req.body || {};

            if (
                !Number.isInteger(bancaId) ||
                bancaId <= 0 ||
                !Number.isInteger(projetoId) ||
                projetoId <= 0
            ) {
                return res.status(400).json({
                    erro: 'ID da banca ou do projeto inválido.'
                });
            }

            if (!Array.isArray(notas) || notas.length === 0) {
                return res.status(400).json({
                    erro: 'Informe as notas dos critérios.'
                });
            }

            if (
                comentario !== undefined &&
                comentario !== null &&
                typeof comentario !== 'string'
            ) {
                return res.status(400).json({
                    erro: 'O comentário deve ser um texto.'
                });
            }

         
            // Verificar se a banca pertence à instituição
            // e se o projeto está associado a ela.
            const bancaProjeto = await cliente.query(
                `SELECT b.id, b.status
                 FROM bancas b
                 INNER JOIN projetos_banca pb
                    ON pb.banca_id = b.id
                 WHERE b.id = $1
                   AND b.instituicao_id = $2
                   AND pb.projeto_id = $3`,
                [bancaId, instituicaoId, projetoId]
            );

            if (bancaProjeto.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Banca ou projeto não encontrado nesta instituição.'
                });
            }

            // Verificar se o avaliador está associado à banca.
            const avaliadorBanca = await cliente.query(
                `SELECT 1
                 FROM avaliadores_banca
                 WHERE banca_id = $1
                   AND usuario_id = $2`,
                [bancaId, req.usuario.id]
            );

            if (avaliadorBanca.rows.length === 0) {
                return res.status(403).json({
                    erro: 'Você não está associado a esta banca como avaliador.'
                });
            }

            // Bloquear avaliações quando a banca não estiver aberta.
            if (bancaProjeto.rows[0].status !== 'aberta') {
                return res.status(403).json({
                    erro: 'A banca não está aberta para novas avaliações.'
                });
            }


            // Buscar os critérios cadastrados na banca.
            const criterios = await cliente.query(
                `SELECT id, peso, nota_maxima
                 FROM criterios_avaliacao
                 WHERE banca_id = $1`,
                [bancaId]
            );

            if (criterios.rows.length === 0) {
                return res.status(400).json({
                    erro: 'A banca não possui critérios de avaliação.'
                });
            }

            // Exigir uma nota para cada critério, sem repetições.
            if (notas.length !== criterios.rows.length) {
                return res.status(400).json({
                    erro: 'Informe uma nota para cada critério da banca.'
                });
            }

            const criteriosPorId = new Map(
                criterios.rows.map((criterio) => [
                    Number(criterio.id),
                    criterio
                ])
            );

            const criteriosInformados = new Set();

            for (const item of notas) {
                if (
                    !Number.isInteger(item.criterio_id) ||
                    !Number.isFinite(item.nota)
                ) {
                    return res.status(400).json({
                        erro: 'Cada nota deve conter criterio_id e nota numéricos.'
                    });
                }

                const criterio = criteriosPorId.get(item.criterio_id);

                if (!criterio) {
                    return res.status(400).json({
                        erro: 'Um dos critérios não pertence a esta banca.'
                    });
                }

                if (criteriosInformados.has(item.criterio_id)) {
                    return res.status(400).json({
                        erro: 'Não informe o mesmo critério mais de uma vez.'
                    });
                }

                const notaMaxima = Number(criterio.nota_maxima);

                if (item.nota < 0 || item.nota > notaMaxima) {
                    return res.status(400).json({
                        erro: `A nota do critério ${item.criterio_id} deve estar entre 0 e ${notaMaxima}.`
                    });
                }

                criteriosInformados.add(item.criterio_id);
            }

            await cliente.query('BEGIN');
            transacaoIniciada = true;
            const bancaAtual = await cliente.query(
                `SELECT id
                FROM bancas
                WHERE id = $1
                AND instituicao_id = $2
                AND status = 'aberta'
                FOR UPDATE`,
                [bancaId, instituicaoId]
            );

            if (bancaAtual.rows.length === 0) {
                await cliente.query('ROLLBACK');
                transacaoIniciada = false;
                return res.status(403).json({
                    erro: 'A banca não está aberta para novas avaliações.'
                });
            }


            const resultadoAvaliacao = await cliente.query(
                `INSERT INTO avaliacoes
                    (banca_id, projeto_id, avaliador_id, comentario)
                VALUES ($1, $2, $3, $4)
                RETURNING *`,
                [
                    bancaId,
                    projetoId,
                    req.usuario.id,
                    comentario || null
                ]
            );

            const avaliacao = resultadoAvaliacao.rows[0];

            // Registrar as notas de todos os critérios.
            for (const item of notas) {
                await cliente.query(
                    `INSERT INTO notas_avaliacao
                        (avaliacao_id, criterio_id, nota)
                     VALUES ($1, $2, $3)`,
                    [
                        avaliacao.id,
                        item.criterio_id,
                        item.nota
                    ]
                );
            }

            await cliente.query('COMMIT');
             transacaoIniciada = false;   
            return res.status(201).json({
                mensagem: 'Avaliação registrada com sucesso!',
                avaliacao,
                notas
            });

        } catch (erro) {
            if (transacaoIniciada) {
                try {
                    await cliente.query('ROLLBACK');
                } catch (erroRollback) {
                    console.error(
                        'Erro ao desfazer a transação:',
                        erroRollback.message
                    );
                }
            }

            if (erro.code === '23505') {
                return res.status(409).json({
                    erro: 'Você já registrou uma avaliação para este projeto nesta banca.'
                });
            }

         console.error('Erro ao registrar avaliação:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao registrar a avaliação.'
            });
        }
         finally {
            if(cliente){
                 cliente.release();
            }
        }
            
    }
);

// Consultar o ranking dos projetos de uma banca
router.get(
   '/:instituicaoId/:bancaId/ranking',
   autenticarToken,
   autorizarPerfil('admin', 'coordenador'),
   async (req, res) => {
       try {
           const instituicaoId = req.usuario.instituicaoId;
           const bancaId = Number(req.params.bancaId);

           if (
               !Number.isInteger(bancaId) ||
               bancaId <= 0
           ) {
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

           // Calcular a nota final de cada avaliação
           // e depois a média final de cada projeto.

            const resultado = await pool.query(
                `WITH notas_por_avaliacao AS (
                    SELECT
                        a.id AS avaliacao_id,
                        a.projeto_id,
                        a.avaliador_id,
                        SUM(na.nota * ca.peso)
                            / NULLIF(SUM(ca.peso), 0) AS nota_final
                    FROM avaliacoes a
                    INNER JOIN bancas b
                        ON b.id = a.banca_id
                    INNER JOIN notas_avaliacao na
                        ON na.avaliacao_id = a.id
                    INNER JOIN criterios_avaliacao ca
                        ON ca.id = na.criterio_id
                    AND ca.banca_id = a.banca_id
                    WHERE a.banca_id = $1
                    AND b.instituicao_id = $2
                    AND a.status = 'finalizada'
                    GROUP BY
                        a.id,
                        a.projeto_id,
                        a.avaliador_id
                ),
                avaliadores_por_projeto AS (
                    SELECT
                        pb.projeto_id,
                        COUNT(DISTINCT ab.usuario_id)::int
                            AS total_avaliadores_esperados,
                        COUNT(DISTINCT n.avaliador_id)::int
                            AS total_avaliacoes_finalizadas
                    FROM projetos_banca pb
                    INNER JOIN bancas b
                        ON b.id = pb.banca_id
                    LEFT JOIN avaliadores_banca ab
                        ON ab.banca_id = pb.banca_id
                    LEFT JOIN notas_por_avaliacao n
                        ON n.projeto_id = pb.projeto_id
                    AND n.avaliador_id = ab.usuario_id
                    WHERE pb.banca_id = $1
                    AND b.instituicao_id = $2
                    GROUP BY pb.projeto_id
                ),
                medias_por_projeto AS (
                    SELECT
                        projeto_id,
                        COUNT(*)::int AS total_avaliacoes,
                        ROUND(AVG(nota_final), 2) AS media_final
                    FROM notas_por_avaliacao
                    GROUP BY projeto_id
                )
                SELECT
                    p.id AS projeto_id,
                    p.titulo,
                    m.total_avaliacoes,
                    m.media_final
                FROM avaliadores_por_projeto ap
                INNER JOIN medias_por_projeto m
                    ON m.projeto_id = ap.projeto_id
                INNER JOIN projetos p
                    ON p.id = ap.projeto_id
                WHERE p.instituicao_id = $2
                AND ap.total_avaliadores_esperados > 0
                AND ap.total_avaliacoes_finalizadas =
                    ap.total_avaliadores_esperados
                ORDER BY
                    m.media_final DESC,
                    p.id ASC`,
                [bancaId, instituicaoId]
            );


           // Adicionar a posição de cada projeto
           const ranking = resultado.rows.map((projeto, indice) => ({
               posicao: indice + 1,
               projeto_id: projeto.projeto_id,
               titulo: projeto.titulo,
               total_avaliacoes: projeto.total_avaliacoes,
               media_final: Number(projeto.media_final)
           }));

           return res.status(200).json({
               banca: banca.rows[0],
               total_projetos_ranqueados: ranking.length,
               ranking
           });

       } catch (erro) {
           console.error(
               'Erro ao consultar ranking:',
               erro.message
           );

           return res.status(500).json({
               erro: 'Erro interno ao consultar o ranking.'
           });
       }
   }
);

// Consultar o resumo das avaliações
router.get(
    '/:instituicaoId/resumo',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador', 'avaliador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const perfil = req.usuario.perfil;

            let resultado;

            if (perfil === 'avaliador') {
                // O avaliador consulta somente as próprias avaliações.
                resultado = await pool.query(
                    `SELECT COUNT(a.id)::int AS total_avaliacoes
                     FROM avaliacoes a
                     INNER JOIN bancas b
                        ON b.id = a.banca_id
                     WHERE b.instituicao_id = $1
                       AND a.avaliador_id = $2`,
                    [instituicaoId, req.usuario.id]
                );
            } else {
                // Administrador e coordenador consultam o total institucional.
                resultado = await pool.query(
                    `SELECT COUNT(a.id)::int AS total_avaliacoes
                     FROM avaliacoes a
                     INNER JOIN bancas b
                        ON b.id = a.banca_id
                     WHERE b.instituicao_id = $1`,
                    [instituicaoId]
                );
            }

            return res.status(200).json({
                total_avaliacoes:
                    resultado.rows[0].total_avaliacoes
            });

        } catch (erro) {
            console.error(
                'Erro ao consultar resumo das avaliações:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao consultar o resumo das avaliações.'
            });
        }
    }
);

// Consultar a quantidade de projetos com ranking definido
router.get(
    '/:instituicaoId/ranking/resumo',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador',  'avaliador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;

            const resultado = await pool.query(
                `WITH avaliadores_esperados AS (
                    SELECT
                        pb.banca_id,
                        pb.projeto_id,
                        COUNT(DISTINCT ab.usuario_id)::int
                            AS total_esperado
                    FROM projetos_banca pb
                    INNER JOIN bancas b
                        ON b.id = pb.banca_id
                    LEFT JOIN avaliadores_banca ab
                        ON ab.banca_id = pb.banca_id
                    WHERE b.instituicao_id = $1
                    GROUP BY pb.banca_id, pb.projeto_id
                ),
                avaliacoes_concluidas AS (
                    SELECT
                        a.banca_id,
                        a.projeto_id,
                        COUNT(DISTINCT a.avaliador_id)::int
                            AS total_finalizado
                    FROM avaliacoes a
                    INNER JOIN bancas b
                        ON b.id = a.banca_id
                    WHERE b.instituicao_id = $1
                      AND a.status = 'finalizada'
                    GROUP BY a.banca_id, a.projeto_id
                ),
                projetos_ranqueados AS (
                    SELECT DISTINCT
                        ae.projeto_id
                    FROM avaliadores_esperados ae
                    INNER JOIN avaliacoes_concluidas ac
                        ON ac.banca_id = ae.banca_id
                       AND ac.projeto_id = ae.projeto_id
                    WHERE ae.total_esperado > 0
                      AND ac.total_finalizado = ae.total_esperado
                )
                SELECT COUNT(DISTINCT pr.projeto_id)::int
                    AS total_projetos_ranqueados
                FROM projetos_ranqueados pr
                INNER JOIN projetos p
                    ON p.id = pr.projeto_id
                WHERE p.instituicao_id = $1`,
                [instituicaoId]
            );

            return res.status(200).json({
                total_projetos_ranqueados:
                    resultado.rows[0].total_projetos_ranqueados
            });

        } catch (erro) {
            console.error(
                'Erro ao consultar resumo do ranking:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao consultar o resumo do ranking.'
            });
        }
    }
);
 // Calcular as notas finais dos avaliadores e a média do projeto.
router.get(
    '/:instituicaoId/:bancaId/:projetoId/media',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador', 'avaliador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const bancaId = Number(req.params.bancaId);
            const projetoId = Number(req.params.projetoId);

            if (
                !Number.isInteger(bancaId) ||
                bancaId <= 0 ||
                !Number.isInteger(projetoId) ||
                projetoId <= 0
            ) {
                return res.status(400).json({
                    erro: 'ID da banca ou do projeto inválido.'
                });
            }

            const resultado = await pool.query(
                `WITH notas_por_avaliacao AS (
                    SELECT
                        a.id AS avaliacao_id,
                        a.avaliador_id,
                        SUM(na.nota * ca.peso)
                            / NULLIF(SUM(ca.peso), 0) AS nota_final
                    FROM avaliacoes a
                    INNER JOIN bancas b
                        ON b.id = a.banca_id
                    INNER JOIN notas_avaliacao na
                        ON na.avaliacao_id = a.id
                    INNER JOIN criterios_avaliacao ca
                        ON ca.id = na.criterio_id
                        AND ca.banca_id = a.banca_id
                    WHERE a.banca_id = $1
                        AND b.instituicao_id = $2
                        AND a.projeto_id = $3
                        AND a.status = 'finalizada'
                    GROUP BY a.id, a.avaliador_id
                )
                SELECT
                    COUNT(*)::int AS total_avaliacoes,
                    ROUND(AVG(nota_final), 2) AS media_projeto,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'avaliacao_id', avaliacao_id,
                                'avaliador_id', avaliador_id,
                                'nota_final', ROUND(nota_final, 2)
                            )
                            ORDER BY avaliacao_id
                        ),
                        '[]'::json
                    ) AS notas_avaliadores
                FROM notas_por_avaliacao`,
                [bancaId, instituicaoId, projetoId]
            );

            const dados = resultado.rows[0];

            return res.status(200).json({
                banca_id: bancaId,
                projeto_id: projetoId,
                total_avaliacoes: dados.total_avaliacoes,
                media_projeto: dados.media_projeto === null
                    ? null
                    : Number(dados.media_projeto),
                notas_avaliadores: dados.notas_avaliadores
            });

        } catch (erro) {
            console.error(
                'Erro ao calcular média do projeto:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao calcular a média do projeto.'
            });
        }
    }
);


// Consultar avaliação de um projeto
router.get(
    '/:instituicaoId/:bancaId/:projetoId',
    autenticarToken,
    autorizarPerfil(
        'admin',
        'coordenador',
        'avaliador'
    ),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const bancaId = Number(req.params.bancaId);
            const projetoId = Number(req.params.projetoId);

            if (
                !Number.isInteger(bancaId) ||
                bancaId <= 0 ||
                !Number.isInteger(projetoId) ||
                projetoId <= 0
            ) {
                return res.status(400).json({
                    erro: 'ID da banca ou do projeto inválido.'
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

            // Buscar avaliações e respectivas notas
            const resultado = await pool.query(
                `SELECT
                    a.id AS avaliacao_id,
                    a.banca_id,
                    a.projeto_id,
                    a.avaliador_id,
                    a.status AS status_avaliacao,
                    a.comentario,
                    a.criada_em,
                    na.criterio_id,
                    ca.nome AS criterio,
                    ca.peso,
                    ca.nota_maxima,
                    na.nota
                 FROM avaliacoes a
                 LEFT JOIN notas_avaliacao na
                    ON na.avaliacao_id = a.id
                 LEFT JOIN criterios_avaliacao ca
                    ON ca.id = na.criterio_id
                 WHERE a.banca_id = $1
                AND a.projeto_id = $2
                   AND (
                        $3 = 'admin'
                        OR $3 = 'coordenador'
                        OR a.avaliador_id = $4
                    )
                 ORDER BY a.id, na.criterio_id`,
               [
                    bancaId,
                    projetoId,
                    req.usuario.perfil,
                    req.usuario.id
                ]   
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Nenhuma avaliação encontrada para este projeto nesta banca.'
                });
            }

            // Agrupar as notas de cada avaliação
            const avaliacoes = new Map();

            for (const linha of resultado.rows) {
                if (!avaliacoes.has(linha.avaliacao_id)) {
                    avaliacoes.set(linha.avaliacao_id, {
                        id: linha.avaliacao_id,
                        banca_id: linha.banca_id,
                        projeto_id: linha.projeto_id,
                        avaliador_id: linha.avaliador_id,
                        status: linha.status_avaliacao,
                        comentario: linha.comentario,
                        criada_em: linha.criada_em,
                        notas: []
                    });
                }

                if (linha.criterio_id !== null) {
                    avaliacoes.get(linha.avaliacao_id).notas.push({
                        criterio_id: linha.criterio_id,
                        criterio: linha.criterio,
                        peso: linha.peso,
                        nota_maxima: linha.nota_maxima,
                        nota: linha.nota
                    });
                }
            }

            return res.status(200).json({
                banca: banca.rows[0],
                total_avaliacoes: avaliacoes.size,
                avaliacoes: Array.from(avaliacoes.values())
            });

        } catch (erro) {
            console.error(
                'Erro ao consultar avaliação:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao consultar a avaliação.'
            });
        }
    }
);

// Finalizar uma avaliação
router.patch(
    '/:instituicaoId/:bancaId/:projetoId/finalizar',
    autenticarToken,
    autorizarPerfil('avaliador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;
            const bancaId = Number(req.params.bancaId);
            const projetoId = Number(req.params.projetoId);
            const avaliadorId = req.usuario.id;

            if (
                !Number.isInteger(bancaId) ||
                bancaId <= 0 ||
                !Number.isInteger(projetoId) ||
                projetoId <= 0
            ) {
                return res.status(400).json({
                    erro: 'ID da banca ou do projeto inválido.'
                });
            }

            const resultado = await pool.query(
                `UPDATE avaliacoes AS a
                 SET status = 'finalizada',
                     atualizada_em = CURRENT_TIMESTAMP
                 FROM bancas AS b
                 WHERE a.banca_id = b.id
                   AND a.banca_id = $1
                   AND a.projeto_id = $2
                   AND a.avaliador_id = $3
                   AND b.instituicao_id = $4
                   AND b.status = 'aberta'
                   AND a.status = 'rascunho'
                 RETURNING
                     a.id,
                     a.banca_id,
                     a.projeto_id,
                     a.avaliador_id,
                     a.status,
                     a.comentario,
                     a.criada_em,
                     a.atualizada_em`,
                [
                    bancaId,
                    projetoId,
                    avaliadorId,
                    instituicaoId
                ]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Avaliação não encontrada, já finalizada ou indisponível para finalização.'
                });
            }

            return res.status(200).json({
                mensagem: 'Avaliação finalizada com sucesso!',
                avaliacao: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                'Erro ao finalizar avaliação:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao finalizar a avaliação.'
            });
        }
    }
);




module.exports = router;