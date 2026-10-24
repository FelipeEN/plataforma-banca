const crypto = require('node:crypto');
const https = require('node:https');

function criarToken() {
    const token = crypto.randomBytes(32).toString('base64url');

    return {
        token,
        hash: crypto.createHash('sha256').update(token).digest('hex')
    };
}

function escaparHtml(valor) {
    return valor.replace(/[&<>"']/g, (caractere) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

function enviarRequisicaoResend(payload) {
    const chave = process.env.RESEND_API_KEY;
    const remetente = process.env.EMAIL_FROM;

    if (!chave || !remetente) {
        return Promise.reject(new Error('Email provider is not configured.'));
    }

    const corpo = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
        const requisicao = https.request(
            {
                hostname: 'api.resend.com',
                path: '/emails',
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${chave}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(corpo)
                },
                timeout: 10000
            },
            (resposta) => {
                resposta.resume();

                resposta.on('end', () => {
                    if (
                        resposta.statusCode >= 200 &&
                        resposta.statusCode < 300
                    ) {
                        resolve();
                    } else {
                        reject(new Error('Email provider rejected the request.'));
                    }
                });
            }
        );

        requisicao.on('timeout', () => {
            requisicao.destroy(new Error('Email provider request timed out.'));
        });
        requisicao.on('error', reject);
        requisicao.end(corpo);
    });
}

async function enviarConfirmacao(email, nome, token) {
    let urlFrontend;

    try {
        urlFrontend = new URL(process.env.FRONTEND_URL);
    } catch {
        throw new Error('FRONTEND_URL is not configured.');
    }

    if (
        urlFrontend.protocol !== 'https:' &&
        urlFrontend.hostname !== 'localhost'
    ) {
        throw new Error('FRONTEND_URL must use HTTPS.');
    }

    urlFrontend.pathname = '/confirmar-email';
    urlFrontend.search = '';
    urlFrontend.hash = `token=${encodeURIComponent(token)}`;
    const link = urlFrontend.toString();
    const nomeSeguro = escaparHtml(nome);

    await enviarRequisicaoResend({
        from: process.env.EMAIL_FROM,
        to: [email],
        subject: 'Confirme seu e-mail - Plataforma Banca',
        html: `<p>Olá, ${nomeSeguro}.</p>
            <p>Confirme que este endereço de e-mail pertence a você:</p>
            <p><a href="${link}">Confirmar e-mail</a></p>
            <p>Este link expira em 60 minutos. A confirmação não concede acesso a nenhuma instituição.</p>`
    });
}

module.exports = { criarToken, enviarConfirmacao };
