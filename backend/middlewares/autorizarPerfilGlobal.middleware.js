
function autorizarPerfilGlobal(...perfisPermitidos) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({
                erro: 'Usuário não autenticado.'
            });
        }

        const vinculos = req.usuario.vinculos || [];

        const possuiPerfilPermitido = vinculos.some(
            (vinculo) =>
                vinculo.status === 'aprovado' &&
                perfisPermitidos.includes(vinculo.perfil)
        );

        if (!possuiPerfilPermitido) {
            return res.status(403).json({
                erro: 'Você não tem permissão para realizar esta ação.'
            });
        }

        next();
    };
}

module.exports = autorizarPerfilGlobal;
