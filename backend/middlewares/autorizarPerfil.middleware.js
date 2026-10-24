function autorizarPerfil(...perfisPermitidos) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({
                erro: 'Usuário não autenticado.'
            });
        }

        const instituicaoIdTexto = req.params.instituicaoId;

        if (
            !/^[0-9]+$/.test(instituicaoIdTexto || '') ||
            !Number.isSafeInteger(Number(instituicaoIdTexto)) ||
            Number(instituicaoIdTexto) <= 0
        ) {
            return res.status(400).json({
                erro: 'ID da instituição inválido.'
            });
        }

        const instituicaoId = Number(instituicaoIdTexto);
        
        const vinculo = req.usuario.vinculos.find(
            (v) => Number(v.instituicao_id) === instituicaoId
        );

        if (!vinculo) {
            return res.status(403).json({
                erro: 'Você não possui vínculo aprovado com esta instituição.'
            });
        }

        if (!perfisPermitidos.includes(vinculo.perfil)) {
            return res.status(403).json({
                erro: 'Você não tem permissão para realizar esta ação.'
            });
        }

        req.usuario.instituicaoId = instituicaoId;
        req.usuario.perfil = vinculo.perfil;

        next();
    };
}

module.exports = autorizarPerfil;