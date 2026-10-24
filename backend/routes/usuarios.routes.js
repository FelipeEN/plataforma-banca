const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const pool = require('../database/connection');
const { permitirRequisicao } = require('../services/rateLimit.service');
const {
    criarToken,
    enviarConfirmacao
} = require('../services/emailVerification.service');

const router = express.Router();

const autenticarToken = require('../middlewares/auth.middleware');
const autorizarPerfil = require('../middlewares/autorizarPerfil.middleware');

const autorizarPerfilGlobal = require('../middlewares/autorizarPerfilGlobal.middleware');

const respostaCadastroPublico = {
    mensagem: 'Se o endereço informado puder receber uma confirmação, enviaremos instruções. A confirmação não concede acesso institucional; a associação depende de um administrador.'
};

async function aplicarLimitesPublicos(req, acao, email, limiteEmail, janelaEmail) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ipPermitido = await permitirRequisicao(
        `${acao}_ip`,
        ip,
        acao === 'cadastro' ? 10 : 20,
        60 * 60
    );

    if (!ipPermitido) {
        return { permitido: false, porIp: true };
    }

    const emailPermitido = await permitirRequisicao(
        `${acao}_email`,
        email,
        limiteEmail,
        janelaEmail
    );

    return {
        permitido: emailPermitido,
        porIp: false
    };
}

async function criarTokenConfirmacao(cliente, usuarioId) {
    const token = criarToken();

    await cliente.query(
        `UPDATE email_verification_tokens
         SET consumed_at = NOW()
         WHERE usuario_id = $1
           AND consumed_at IS NULL`,
        [usuarioId]
    );

    await cliente.query(
        `INSERT INTO email_verification_tokens
            (usuario_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '60 minutes')`,
        [usuarioId, token.hash]
    );

    return token.token;
}

function enviarConfirmacaoEmSegundoPlano(email, nome, token, evento) {
    enviarConfirmacao(email, nome, token).catch(() => {
        console.error(`Falha ao ${evento} confirmação de e-mail.`);
    });
}

router.post('/cadastro', async (req, res) => {
    const corpo = req.body || {};
    const camposPermitidos = new Set(['nome', 'email', 'senha']);
    const temCampoExtra = Object.keys(corpo).some(
        (campo) => !camposPermitidos.has(campo)
    );
    const { nome, email, senha } = corpo;
    const nomeNormalizado = typeof nome === 'string' ? nome.trim() : '';
    const emailNormalizado =
        typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (
        !corpo ||
        typeof corpo !== 'object' ||
        Array.isArray(corpo) ||
        temCampoExtra ||
        !nomeNormalizado ||
        Array.from(nomeNormalizado).length > 150 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado) ||
        Array.from(emailNormalizado).length > 255 ||
        typeof senha !== 'string' ||
        senha.length < 8 ||
        Buffer.byteLength(senha, 'utf8') > 72
    ) {
        return res.status(400).json({
            erro: 'Informe um nome, e-mail válido e uma senha de 8 a 72 bytes.'
        });
    }

    let cliente;
    let transacaoIniciada = false;
    let emailPendente;

    try {
        const limite = await aplicarLimitesPublicos(
            req,
            'cadastro',
            emailNormalizado,
            3,
            60 * 60
        );

        if (limite.porIp) {
            return res.status(429).json({
                erro: 'Muitas solicitações. Aguarde antes de tentar novamente.'
            });
        }

        if (!limite.permitido) {
            return res.status(202).json(respostaCadastroPublico);
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        cliente = await pool.connect();
        await cliente.query('BEGIN');
        transacaoIniciada = true;

        const insercao = await cliente.query(
            `INSERT INTO usuarios
                (nome, email, senha_hash, email_verification_required)
             VALUES ($1, $2, $3, TRUE)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [nomeNormalizado, emailNormalizado, senhaHash]
        );

        if (insercao.rows.length > 0) {
            emailPendente = {
                usuarioId: insercao.rows[0].id,
                nome: nomeNormalizado,
                email: emailNormalizado,
                token: await criarTokenConfirmacao(
                    cliente,
                    insercao.rows[0].id
                )
            };
        } else {
            const existente = await cliente.query(
                `SELECT id, nome, email
                 FROM usuarios
                 WHERE LOWER(email) = $1
                   AND email_verification_required = TRUE
                   AND email_verified_at IS NULL
                 FOR UPDATE`,
                [emailNormalizado]
            );

            if (existente.rows.length > 0) {
                const usuario = existente.rows[0];
                emailPendente = {
                    usuarioId: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    token: await criarTokenConfirmacao(
                        cliente,
                        usuario.id
                    )
                };
            }
        }

        await cliente.query('COMMIT');
        transacaoIniciada = false;

        if (emailPendente) {
            enviarConfirmacaoEmSegundoPlano(
                emailPendente.email,
                emailPendente.nome,
                emailPendente.token,
                'enviar'
            );
        }

        return res.status(202).json(respostaCadastroPublico);
    } catch (erro) {
        if (cliente && transacaoIniciada) {
            try {
                await cliente.query('ROLLBACK');
            } catch (erroRollback) {
                console.error('Falha ao reverter cadastro público.');
            }
        }

        console.error('Erro interno ao processar cadastro público.');

        return res.status(500).json({
            erro: 'Não foi possível processar o cadastro agora.'
        });
    } finally {
        if (cliente) {
            cliente.release();
        }
    }
});

router.post('/cadastro/reenviar', async (req, res) => {
    const email =
        typeof req.body?.email === 'string'
            ? req.body.email.trim().toLowerCase()
            : '';

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 255
    ) {
        return res.status(400).json({
            erro: 'Informe um e-mail válido.'
        });
    }

    let cliente;
    let transacaoIniciada = false;
    let emailPendente;

    try {
        const limite = await aplicarLimitesPublicos(
            req,
            'reenvio',
            email,
            3,
            60 * 60
        );

        if (limite.porIp) {
            return res.status(429).json({
                erro: 'Muitas solicitações. Aguarde antes de tentar novamente.'
            });
        }

        if (!limite.permitido) {
            return res.status(202).json(respostaCadastroPublico);
        }

        cliente = await pool.connect();
        await cliente.query('BEGIN');
        transacaoIniciada = true;

        const usuario = await cliente.query(
            `SELECT id, nome, email
             FROM usuarios
             WHERE LOWER(email) = $1
               AND email_verification_required = TRUE
               AND email_verified_at IS NULL
             FOR UPDATE`,
            [email]
        );

        if (usuario.rows.length > 0) {
            emailPendente = {
                ...usuario.rows[0],
                token: await criarTokenConfirmacao(
                    cliente,
                    usuario.rows[0].id
                )
            };
        }

        await cliente.query('COMMIT');
        transacaoIniciada = false;

        if (emailPendente) {
            enviarConfirmacaoEmSegundoPlano(
                emailPendente.email,
                emailPendente.nome,
                emailPendente.token,
                'reenviar'
            );
        }

        return res.status(202).json(respostaCadastroPublico);
    } catch (erro) {
        if (cliente && transacaoIniciada) {
            try {
                await cliente.query('ROLLBACK');
            } catch {
                console.error('Falha ao reverter reenvio de confirmação.');
            }
        }

        console.error('Erro interno ao processar reenvio de confirmação.');
        return res.status(500).json({
            erro: 'Não foi possível processar a solicitação agora.'
        });
    } finally {
        if (cliente) {
            cliente.release();
        }
    }
});

router.post('/cadastro/confirmar', async (req, res) => {
    const token = req.body?.token;

    if (
        typeof token !== 'string' ||
        !/^[A-Za-z0-9_-]{43}$/.test(token)
    ) {
        return res.status(400).json({
            erro: 'Link inválido, expirado ou já utilizado.'
        });
    }

    let cliente;
    let transacaoIniciada = false;

    try {
        const limite = await aplicarLimitesPublicos(
            req,
            'confirmacao',
            token,
            10,
            60 * 60
        );

        if (!limite.permitido) {
            return res.status(429).json({
                erro: 'Muitas tentativas. Aguarde antes de tentar novamente.'
            });
        }

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        cliente = await pool.connect();
        await cliente.query('BEGIN');
        transacaoIniciada = true;

        const tokenDisponivel = await cliente.query(
            `SELECT usuario_id
             FROM email_verification_tokens
             WHERE token_hash = $1
               AND consumed_at IS NULL
               AND expires_at > NOW()`,
            [tokenHash]
        );

        if (tokenDisponivel.rows.length === 0) {
            await cliente.query('ROLLBACK');
            transacaoIniciada = false;
            return res.status(400).json({
                erro: 'Link inválido, expirado ou já utilizado.'
            });
        }

        const usuarioId = tokenDisponivel.rows[0].usuario_id;
        const usuario = await cliente.query(
            `SELECT id
             FROM usuarios
             WHERE id = $1
               AND email_verification_required = TRUE
               AND email_verified_at IS NULL
             FOR UPDATE`,
            [usuarioId]
        );

        if (usuario.rows.length === 0) {
            await cliente.query('ROLLBACK');
            transacaoIniciada = false;
            return res.status(400).json({
                erro: 'Link inválido, expirado ou já utilizado.'
            });
        }

        const consumo = await cliente.query(
            `UPDATE email_verification_tokens
             SET consumed_at = NOW()
             WHERE token_hash = $1
               AND usuario_id = $2
               AND consumed_at IS NULL
               AND expires_at > NOW()
             RETURNING usuario_id`,
            [tokenHash, usuarioId]
        );

        if (consumo.rows.length === 0) {
            await cliente.query('ROLLBACK');
            transacaoIniciada = false;
            return res.status(400).json({
                erro: 'Link inválido, expirado ou já utilizado.'
            });
        }

        const verificacao = await cliente.query(
            `UPDATE usuarios
             SET email_verified_at = NOW()
             WHERE id = $1
               AND email_verification_required = TRUE
               AND email_verified_at IS NULL
             RETURNING id`,
            [usuarioId]
        );

        if (verificacao.rows.length === 0) {
            await cliente.query('ROLLBACK');
            transacaoIniciada = false;
            return res.status(400).json({
                erro: 'Link inválido, expirado ou já utilizado.'
            });
        }

        await cliente.query(
            `UPDATE email_verification_tokens
             SET consumed_at = NOW()
             WHERE usuario_id = $1
               AND consumed_at IS NULL`,
            [usuarioId]
        );

        await cliente.query('COMMIT');
        transacaoIniciada = false;

        return res.status(200).json({
            mensagem: 'E-mail confirmado. A associação a uma instituição continua dependendo de um administrador.'
        });
    } catch (erro) {
        if (cliente && transacaoIniciada) {
            try {
                await cliente.query('ROLLBACK');
            } catch {
                console.error('Falha ao reverter confirmação de e-mail.');
            }
        }

        console.error('Erro interno ao confirmar e-mail.');
        return res.status(500).json({
            erro: 'Não foi possível confirmar o e-mail agora.'
        });
    } finally {
        if (cliente) {
            cliente.release();
        }
    }
});

router.post('/',   autenticarToken,autorizarPerfilGlobal('admin', 'coordenador'),async (req, res) => {
    try {
        const { nome, email, senha } = req.body || {};

        if (
            typeof nome !== 'string' || nome.trim() === '' ||
            typeof email !== 'string' || email.trim() === '' ||
            typeof senha !== 'string' || senha.length < 8
        ) {
            return res.status(400).json({
                erro: 'Informe nome, e-mail e uma senha com pelo menos 8 caracteres.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const resultado = await pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash)
             VALUES ($1, $2, $3)
             RETURNING id, nome, email, criado_em`,
            [nome.trim(), email.trim().toLowerCase(), senhaHash]
        );

        return res.status(201).json(resultado.rows[0]);

    } catch (erro) {
        if (erro.code === '23505') {
            return res.status(409).json({
                erro: 'Este e-mail já está cadastrado.'
            });
        }

        console.error('Erro ao cadastrar usuário:', erro.message);

        return res.status(500).json({
            erro: 'Erro interno ao cadastrar usuário.'
        });
    }
});

router.get(
    '/:instituicaoId/gerenciar',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const resultado = await pool.query(
                `SELECT id, nome, email, criado_em, vinculo_id
                 FROM (
                    SELECT DISTINCT ON (u.id)
                        u.id,
                        u.nome,
                        u.email,
                        u.criado_em,
                        v.id AS vinculo_id
                    FROM usuarios u
                    JOIN vinculos_institucionais v
                      ON v.usuario_id = u.id
                    WHERE v.instituicao_id = $1
                      AND v.status = 'aprovado'
                    ORDER BY u.id, v.id
                 ) usuarios_aprovados
                 ORDER BY nome, id`,
                [req.usuario.instituicaoId]
            );

            return res.json(resultado.rows);
        } catch (erro) {
            console.error('Erro ao buscar usuários da instituição:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao buscar usuários da instituição.'
            });
        }
    }
);

router.post(
    '/:instituicaoId/candidatos',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        const email = req.body?.email;

        if (
            typeof email !== 'string' ||
            email.trim() === '' ||
            email.trim().length > 255
        ) {
            return res.status(400).json({
                erro: 'Informe um e-mail válido para buscar a conta.'
            });
        }

        try {
            const resultado = await pool.query(
                `SELECT u.id, u.nome, u.email
                 FROM usuarios u
                 WHERE LOWER(u.email) = LOWER($1)
                   AND (
                       u.email_verification_required = FALSE
                       OR u.email_verified_at IS NOT NULL
                   )
                   AND (
                       $3 = 'admin'
                       OR NOT EXISTS (
                           SELECT 1
                           FROM vinculos_institucionais v
                           WHERE v.usuario_id = u.id
                             AND v.instituicao_id = $2
                             AND v.status <> 'aprovado'
                       )
                   )`,
                [email.trim(), req.usuario.instituicaoId, req.usuario.perfil]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Nenhuma conta disponível para associação ou atualização foi encontrada com esse e-mail.'
                });
            }

            return res.json(resultado.rows[0]);
        } catch (erro) {
            console.error('Erro ao buscar candidato para associação:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao buscar candidato para associação.'
            });
        }
    }
);



/* Listar orientadores com vínculo aprovado na instituição */
router.get(
    '/orientadores/:instituicaoId',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;

            const resultado = await pool.query(
                `SELECT
                    u.id,
                    u.nome,
                    u.email
                 FROM usuarios u
                 JOIN vinculos_institucionais v
                    ON v.usuario_id = u.id
                 WHERE v.instituicao_id = $1
                   AND v.perfil = 'orientador'
                   AND v.status = 'aprovado'
                 ORDER BY u.nome`,
                [instituicaoId]
            );

            return res.status(200).json(resultado.rows);

        } catch (erro) {
            console.error(
                'Erro ao listar orientadores:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao listar orientadores.'
            });
        }
    }
);

// Listar alunos aprovados da instituição
router.get(
    '/alunos/:instituicaoId',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;

            const resultado = await pool.query(
                `SELECT u.id, u.nome, u.email
                 FROM usuarios u
                 JOIN vinculos_institucionais v
                   ON v.usuario_id = u.id
                 WHERE v.instituicao_id = $1
                   AND v.perfil = 'aluno'
                   AND v.status = 'aprovado'
                 ORDER BY u.nome`,
                [instituicaoId]
            );

            return res.status(200).json(resultado.rows);
        } catch (erro) {
            console.error('Erro ao listar alunos:', erro.message);

            return res.status(500).json({
                erro: 'Erro interno ao listar alunos.'
            });
        }
    }
);

// Listar avaliadores aprovados da instituição
router.get(
    '/avaliadores/:instituicaoId',
    autenticarToken,
    autorizarPerfil('admin', 'coordenador'),
    async (req, res) => {
        try {
            const instituicaoId = req.usuario.instituicaoId;

            const resultado = await pool.query(
                `SELECT
                    u.id,
                    u.nome,
                    u.email
                 FROM usuarios u
                 JOIN vinculos_institucionais v
                    ON v.usuario_id = u.id
                 WHERE v.instituicao_id = $1
                   AND v.perfil = 'avaliador'
                   AND v.status = 'aprovado'
                 ORDER BY u.nome`,
                [instituicaoId]
            );

            return res.status(200).json(resultado.rows);

        } catch (erro) {
            console.error(
                'Erro ao listar avaliadores:',
                erro.message
            );

            return res.status(500).json({
                erro: 'Erro interno ao listar avaliadores.'
            });
        }
    }
);
module.exports = router;