const assert = require('node:assert/strict');
const { after, before, beforeEach, describe, it } = require('node:test');
const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

const chaveTeste = 'instituicoes-routes-test-secret';
const segredoAnterior = process.env.JWT_SECRET;
process.env.JWT_SECRET = chaveTeste;

const app = express();
app.use(express.json());
app.use('/instituicoes', require('../routes/instituicoes.routes'));
app.use('/vinculos', require('../routes/vinculos.routes'));

let servidor;
let baseUrl;
let consultaOriginal;
let conectarOriginal;
let chamadasRateLimit;
let acaoRateLimitBloqueada;
let instituicaoCriada;
let usuarioCriado;
let vinculoCriado;
let instituicoesAtivas;
let consultasTransacao;
let conexoesCriadas;

function tokenPara(usuarioId = 1) {
    return jwt.sign(
        { email: 'responsavel@teste.local' },
        chaveTeste,
        { subject: String(usuarioId) }
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

function instalarMocks() {
    pool.query = async (consulta, parametros = []) => {
        const sql = consulta.toLowerCase();

        if (sql.startsWith('insert into rate_limit_buckets')) {
            chamadasRateLimit.push(parametros[0]);
            return {
                rows: parametros[0] === acaoRateLimitBloqueada
                    ? []
                    : [{ quantidade: 1 }]
            };
        }

        if (
            sql.includes('from vinculos_institucionais v') &&
            sql.includes('where v.usuario_id = $1')
        ) {
            const vinculos = vinculoCriado ? [vinculoCriado] : [];
            return {
                rows: vinculos.filter(
                    (vinculo) =>
                        Number(vinculo.usuario_id) === Number(parametros[0]) &&
                        vinculo.status === 'aprovado'
                )
            };
        }

        if (sql.includes('from instituicoes')) {
            assert.match(sql, /where ativa = true/);
            assert.match(sql, /select id, nome/);
            return { rows: instituicoesAtivas };
        }

        throw new Error(`Consulta inesperada no mock: ${consulta}`);
    };

    pool.connect = async () => {
        conexoesCriadas += 1;
        return {
            async query(consulta, parametros = []) {
                const sql = consulta.toLowerCase().replace(/\s+/g, ' ').trim();
                consultasTransacao.push({ sql, parametros });

                if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
                    return { rows: [], rowCount: null };
                }

                if (sql.startsWith('insert into instituicoes')) {
                    instituicaoCriada = {
                        id: 22,
                        nome: parametros[0],
                        ativa: false
                    };
                    assert.match(sql, /insert into instituicoes \(nome, ativa\)/);
                    assert.match(sql, /values \(\$1, false\)/);
                    return { rows: [instituicaoCriada] };
                }

                if (sql.startsWith('insert into usuarios')) {
                    usuarioCriado = {
                        id: 41,
                        nome: parametros[0],
                        email: parametros[1],
                        senha_hash: parametros[2]
                    };
                    return { rows: [{ id: usuarioCriado.id }] };
                }

                if (sql.startsWith('insert into vinculos_institucionais')) {
                    vinculoCriado = {
                        id: 51,
                        usuario_id: Number(parametros[0]),
                        instituicao_id: Number(parametros[1]),
                        perfil: parametros[2],
                        status: parametros[3]
                    };
                    assert.match(sql, /insert into vinculos_institucionais/);
                    return { rows: [{ id: vinculoCriado.id }] };
                }

                throw new Error(`Consulta transacional inesperada: ${consulta}`);
            },
            release() {}
        };
    };
}

describe('solicitação pública de instituições', { concurrency: false }, () => {
    before(async () => {
        consultaOriginal = pool.query;
        conectarOriginal = pool.connect;
        servidor = app.listen(0, '127.0.0.1');
        await new Promise((resolve) => servidor.once('listening', resolve));
        baseUrl = `http://127.0.0.1:${servidor.address().port}`;
    });

    beforeEach(() => {
        chamadasRateLimit = [];
        acaoRateLimitBloqueada = null;
        instituicaoCriada = null;
        usuarioCriado = null;
        vinculoCriado = null;
        instituicoesAtivas = [{ id: 7, nome: 'Instituição ativa' }];
        consultasTransacao = [];
        conexoesCriadas = 0;
        instalarMocks();
    });

    after(async () => {
        await new Promise((resolve, reject) => {
            servidor.close((erro) => (erro ? reject(erro) : resolve()));
        });
        pool.query = consultaOriginal;
        pool.connect = conectarOriginal;

        if (segredoAnterior === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = segredoAnterior;
        }
    });

    it('registra solicitação inativa com vínculo admin pendente', async () => {
        const resposta = await requisicao('/instituicoes/cadastrar', {
            method: 'POST',
            body: {
                nomeInstituicao: '  Instituto de Teste ',
                nomeResponsavel: ' Responsável Teste ',
                email: ' RESPONSAVEL@TESTE.LOCAL ',
                senha: 'senha-segura-123'
            }
        });
        const dados = await resposta.json();
        const hashCorreto = await bcrypt.compare(
            'senha-segura-123',
            usuarioCriado.senha_hash
        );

        assert.equal(resposta.status, 202);
        assert.match(dados.mensagem, /solicitação recebida/i);
        assert.match(dados.mensagem, /aprovação do vínculo/i);
        assert.equal(instituicaoCriada.ativa, false);
        assert.equal(instituicaoCriada.nome, 'Instituto de Teste');
        assert.equal(usuarioCriado.email, 'responsavel@teste.local');
        assert.equal(hashCorreto, true);
        assert.deepEqual(
            {
                perfil: vinculoCriado.perfil,
                status: vinculoCriado.status,
                usuario_id: vinculoCriado.usuario_id,
                instituicao_id: vinculoCriado.instituicao_id
            },
            {
                perfil: 'admin',
                status: 'pendente',
                usuario_id: 41,
                instituicao_id: 22
            }
        );
        assert.equal(
            consultasTransacao.some(({ sql }) =>
                sql.includes("'admin', 'aprovado'")
            ),
            false
        );
        assert.equal(
            consultasTransacao.some(({ sql }) =>
                sql.includes('insert into instituicoes') &&
                sql.includes('values ($1, false)')
            ),
            true
        );
        assert.deepEqual(chamadasRateLimit, [
            'instituicao_cadastro_ip',
            'instituicao_cadastro_email'
        ]);
        assert.equal(consultasTransacao.at(-1).sql, 'commit');
        assert.equal(Object.hasOwn(dados, 'administrador'), false);
        assert.equal(Object.hasOwn(dados, 'vinculo'), false);
    });

    it('não permite que POST /instituicoes crie registros sem solicitação completa', async () => {
        const resposta = await requisicao('/instituicoes', {
            method: 'POST',
            body: { nome: 'Instituição sem responsável' }
        });

        assert.equal(resposta.status, 410);
        assert.equal(conexoesCriadas, 0);
        assert.equal(instituicaoCriada, null);
    });

    it('lista apenas instituições ativas', async () => {
        const resposta = await requisicao('/instituicoes');
        const dados = await resposta.json();

        assert.equal(resposta.status, 200);
        assert.deepEqual(dados, [{ id: 7, nome: 'Instituição ativa' }]);
    });

    it('não permite ao responsável pendente executar ação administrativa', async () => {
        const solicitacao = await requisicao('/instituicoes/cadastrar', {
            method: 'POST',
            body: {
                nomeInstituicao: 'Instituto de Teste',
                nomeResponsavel: 'Responsável Teste',
                email: 'responsavel@teste.local',
                senha: 'senha-segura-123'
            }
        });
        assert.equal(solicitacao.status, 202);

        const tentativaAdmin = await requisicao('/vinculos/22', {
            token: tokenPara(41)
        });

        assert.equal(tentativaAdmin.status, 403);
    });

    it('bloqueia solicitações quando o limite compartilhado foi atingido', async () => {
        acaoRateLimitBloqueada = 'instituicao_cadastro_ip';
        const resposta = await requisicao('/instituicoes/cadastrar', {
            method: 'POST',
            body: {
                nomeInstituicao: 'Instituto de Teste',
                nomeResponsavel: 'Responsável Teste',
                email: 'responsavel@teste.local',
                senha: 'senha-segura-123'
            }
        });

        assert.equal(resposta.status, 429);
        assert.deepEqual(chamadasRateLimit, ['instituicao_cadastro_ip']);
        assert.equal(conexoesCriadas, 0);
    });
});
