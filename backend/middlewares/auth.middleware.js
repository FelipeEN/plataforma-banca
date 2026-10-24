const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

async function autenticarToken(req, res, next) {
    const cabecalho = req.headers.authorization;

    if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
        return res.status(401).json({
            erro: 'Token de autenticação não informado.'
        });
    }

    const token = cabecalho.split(' ')[1];

    try {
        const dadosUsuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const instituicaoSolicitada = req.params.instituicaoId;

        if (
            instituicaoSolicitada !== undefined &&
            (
                !/^[0-9]+$/.test(instituicaoSolicitada) ||
                !Number.isSafeInteger(Number(instituicaoSolicitada)) ||
                Number(instituicaoSolicitada) <= 0
            )
        ) {
            return res.status(400).json({
                erro: 'ID da instituição inválido.'
            });
        }

        const usuarioId = Number(dadosUsuario.sub);

        const resultado = await pool.query(
            `SELECT
                v.instituicao_id,
                v.perfil,
                v.status
             FROM vinculos_institucionais v
             WHERE v.usuario_id = $1
               AND v.status = 'aprovado'
             ORDER BY v.instituicao_id`,
            [usuarioId]
        );

        const vinculos = resultado.rows;

        if (vinculos.length === 0) {
            return res.status(403).json({
                erro: 'Você não possui vínculo aprovado com uma instituição.'
            });
        }

        // Se a rota informar uma instituição, usa o vínculo
        // correspondente a ela.
        let vinculoAtivo;

        if (instituicaoSolicitada !== undefined) {
            const instituicaoId = Number(instituicaoSolicitada);

            vinculoAtivo = vinculos.find(
                (vinculo) =>
                    Number(vinculo.instituicao_id) === instituicaoId
            );

            if (!vinculoAtivo) {
                return res.status(403).json({
                    erro: 'Você não possui vínculo aprovado com esta instituição.'
                });
            }
        } else {
            // Rotas sem instituição na URL usam o primeiro vínculo
            // aprovado como padrão.
            vinculoAtivo = vinculos[0];
        }

        req.usuario = {
            id: usuarioId,
            email: dadosUsuario.email,
            instituicaoId: Number(vinculoAtivo.instituicao_id),
            perfil: vinculoAtivo.perfil,
            vinculos
        };

        return next();

    } catch (erro) {
        if (
            erro.name === 'JsonWebTokenError' ||
            erro.name === 'TokenExpiredError' ||
            erro.name === 'NotBeforeError'
        ) {
            return res.status(401).json({
                erro: 'Token inválido ou expirado.'
            });
        }

        console.error('Erro na autenticação:', erro.message);

        return res.status(500).json({
            erro: 'Erro interno na autenticação.'
        });
    }
}

module.exports = autenticarToken;