const assert = require('node:assert/strict');
const { after, before, beforeEach, describe, it } = require('node:test');
const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../database/connection');
const autenticarToken = require('../middlewares/auth.middleware');
const autorizarPerfil = require('../middlewares/autorizarPerfil.middleware');

const chaveTeste = 'auth-routes-test-secret';
const segredoAnterior = process.env.JWT_SECRET;
process.env.JWT_SECRET = chaveTeste;

const app = express();
app.use(express.json());
app.use('/auth', require('../routes/auth.routes'));
app.get(
    '/institucional/:instituicaoId',
    autenticarToken,
    autorizarPerfil('admin'),
    (_req, res) => res.status(204).end()
);

let servidor;
let baseUrl;
let consultaOriginal;
let senhaHash;
let vinculosPorUsuario;
let consultas;

function tokenPara(usuarioId = 1, opcoes = {}) {
    return jwt.sign(
        { email: 'ana@teste.local' },
        chaveTeste,
        { subject: String(usuarioId), ...opcoes }
    );
}

async function requisicao(
    caminho,
    { token, method = 'GET', body } = {}
) {
    const headers = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(`${baseUrl}${caminho}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

describe('rotas de autenticação', { concurrency: false }, () => {
    before(async () => {
        consultaOriginal = pool.query;
        senhaHash = await bcrypt.hash('senha-valida-123', 4);
        servidor = app.listen(0, '127.0.0.1');
        await new Promise((resolve) => servidor.once('listening', resolve));
        baseUrl = `http://127.0.0.1:${servidor.address().port}`;
    });

    beforeEach(() => {
        vinculosPorUsuario = [];
        consultas = [];
        pool.query = async (consulta, parametros = []) => {
            const sql = consulta.toLowerCase();
            consultas.push(sql);

            if (
                sql.includes('from vinculos_institucionais v') &&
                sql.includes('where v.usuario_id = $1')
            ) {
                return {
                    rows: vinculosPorUsuario.filter(
                        (vinculo) =>
                            Number(vinculo.usuario_id) === Number(parametros[0]) &&
                            vinculo.status === 'aprovado' &&
                            vinculo.instituicao_ativa !== false
                    )
                };
            }

            if (
                sql.includes('from usuarios') &&
                sql.includes('senha_hash') &&
                sql.includes('where email = $1')
            ) {
                return String(parametros[0]).toLowerCase() === 'ana@teste.local'
                    ? {
                        rows: [{
                            id: 1,
                            nome: 'Ana',
                            email: 'ana@teste.local',
                            senha_hash: senhaHash
                        }]
                    }
                    : { rows: [] };
            }

            if (
                sql.includes('from usuarios') &&
                sql.includes('where id = $1') &&
                !sql.includes('senha_hash')
            ) {
                return Number(parametros[0]) === 1
                    ? {
                        rows: [{
                            id: 1,
                            nome: 'Ana',
                            email: 'ana@teste.local'
                        }]
                    }
                    : { rows: [] };
            }

            throw new Error(`Consulta inesperada no mock: ${consulta}`);
        };
    });

    after(async () => {
        await new Promise((resolve, reject) => {
            servidor.close((erro) => (erro ? reject(erro) : resolve()));
        });
        pool.query = consultaOriginal;

        if (segredoAnterior === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = segredoAnterior;
        }
    });

    it('rejeita credenciais inválidas sem emitir um token', async () => {
        const resposta = await requisicao('/auth/login', {
            method: 'POST',
            body: { email: 'ana@teste.local', senha: 'senha-incorreta' }
        });
        const dados = await resposta.json();

        assert.equal(resposta.status, 401);
        assert.deepEqual(dados, { erro: 'E-mail ou senha inválidos.' });
        assert.equal(Object.hasOwn(dados, 'token'), false);
    });

    it('emite JWT para conta sem confirmação de e-mail após senha válida', async () => {
        const resposta = await requisicao('/auth/login', {
            method: 'POST',
            body: { email: 'ana@teste.local', senha: 'senha-valida-123' }
        });
        const dados = await resposta.json();
        const claims = jwt.verify(dados.token, chaveTeste);

        assert.equal(resposta.status, 200);
        assert.equal(claims.sub, '1');
        assert.equal(dados.usuario.email, 'ana@teste.local');
        assert.equal(Object.hasOwn(dados.usuario, 'senha_hash'), false);
        assert.doesNotMatch(consultas[0], /email_verified_at|email_verification_required/);
    });

    it('permite /auth/me para usuário autenticado sem vínculo aprovado', async () => {
        const resposta = await requisicao('/auth/me', {
            token: tokenPara()
        });
        const dados = await resposta.json();

        assert.equal(resposta.status, 200);
        assert.deepEqual(dados.usuario.vinculos, []);
    });

    it('retorna somente vínculos aprovados em /auth/me', async () => {
        vinculosPorUsuario = [
            {
                usuario_id: 1,
                instituicao_id: 22,
                perfil: 'admin',
                status: 'aprovado'
            },
            {
                usuario_id: 1,
                instituicao_id: 33,
                perfil: 'aluno',
                status: 'pendente'
            }
        ];
        const resposta = await requisicao('/auth/me', {
            token: tokenPara()
        });
        const dados = await resposta.json();

        assert.equal(resposta.status, 200);
        assert.deepEqual(dados.usuario.vinculos, [vinculosPorUsuario[0]]);
    });

    it('não autentica vínculo aprovado de instituição inativa', async () => {
        vinculosPorUsuario = [{
            usuario_id: 1,
            instituicao_id: 22,
            perfil: 'admin',
            status: 'aprovado',
            instituicao_ativa: false
        }];
        const resposta = await requisicao('/institucional/22', {
            token: tokenPara()
        });

        assert.equal(resposta.status, 403);
    });

    it('rejeita token ausente, inválido e expirado em rota autenticada', async () => {
        const semToken = await requisicao('/auth/me');
        const tokenInvalido = await requisicao('/auth/me', {
            token: 'token-invalido'
        });
        const tokenExpirado = await requisicao('/auth/me', {
            token: tokenPara(1, { expiresIn: -1 })
        });

        assert.equal(semToken.status, 401);
        assert.equal(tokenInvalido.status, 401);
        assert.equal(tokenExpirado.status, 401);
        assert.equal(consultas.length, 0);
    });

    it('bloqueia acesso institucional sem vínculo, pendente ou de outra instituição', async () => {
        const semVinculo = await requisicao('/institucional/22', {
            token: tokenPara()
        });
        vinculosPorUsuario = [{
            usuario_id: 1,
            instituicao_id: 22,
            perfil: 'admin',
            status: 'pendente'
        }];
        const pendente = await requisicao('/institucional/22', {
            token: tokenPara()
        });
        vinculosPorUsuario = [{
            usuario_id: 1,
            instituicao_id: 33,
            perfil: 'admin',
            status: 'aprovado'
        }];
        const outraInstituicao = await requisicao('/institucional/22', {
            token: tokenPara()
        });

        assert.equal(semVinculo.status, 403);
        assert.equal(pendente.status, 403);
        assert.equal(outraInstituicao.status, 403);
    });

    it('permite acesso apenas ao perfil aprovado na instituição correspondente', async () => {
        vinculosPorUsuario = [{
            usuario_id: 1,
            instituicao_id: 22,
            perfil: 'aluno',
            status: 'aprovado'
        }];
        const perfilInsuficiente = await requisicao('/institucional/22', {
            token: tokenPara()
        });
        vinculosPorUsuario = [{
            usuario_id: 1,
            instituicao_id: 22,
            perfil: 'admin',
            status: 'aprovado'
        }];
        const perfilPermitido = await requisicao('/institucional/22', {
            token: tokenPara()
        });

        assert.equal(perfilInsuficiente.status, 403);
        assert.equal(perfilPermitido.status, 204);
    });
});
