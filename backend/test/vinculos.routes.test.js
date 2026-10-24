const assert = require('node:assert/strict');
const { after, before, beforeEach, describe, it } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

const chaveTeste = 'vinculos-routes-test-secret';
const segredoAnterior = process.env.JWT_SECRET;
process.env.JWT_SECRET = chaveTeste;

const app = express();
app.use(express.json());
app.use('/usuarios', require('../routes/usuarios.routes'));
app.use('/vinculos', require('../routes/vinculos.routes'));

let servidor;
let baseUrl;
let consultaOriginal;
let conectarOriginal;
let vinculosAutenticados;
let vinculoAutorizadorTransacao;
let linhasGerenciamento;
let contasCandidatas;
let vinculosParaRemover;
let consultasGerenciamento;
let consultasExclusao;
let cadastrosPublicos;
let falharCadastroDuplicado;
let vinculosParaAprovar;
let conexoesCriadas;
let falharNaExclusao;
let falharNoRollback;
let rollbacks;
let conexoesLiberadas;
let erroLiberacao;

function tokenPara(usuarioId = 1) {
    return jwt.sign({ sub: usuarioId, email: `usuario${usuarioId}@teste.local` }, chaveTeste);
}

function respostaJson(resposta) {
    return resposta.json();
}

function instalarMocks() {
    pool.query = async (consulta, parametros = []) => {
        const sql = consulta.toLowerCase();

        if (
            sql.includes('from vinculos_institucionais v') &&
            sql.includes('where v.usuario_id = $1')
        ) {
            return { rows: vinculosAutenticados };
        }

        if (
            sql.includes('from vinculos_institucionais v') &&
            sql.includes('inner join usuarios u')
        ) {
            return { rows: [] };
        }

        if (sql.startsWith('update vinculos_institucionais')) {
            assert.match(sql, /status in \('pendente', 'rejeitado'\)/);
            const vinculo = vinculosParaAprovar.find(
                (item) =>
                    Number(item.id) === Number(parametros[1]) &&
                    Number(item.instituicao_id) === Number(parametros[2]) &&
                    ['pendente', 'rejeitado'].includes(item.status)
            );

            if (!vinculo) {
                return { rows: [], rowCount: 0 };
            }

            vinculo.perfil = parametros[0];
            vinculo.status = 'aprovado';
            return { rows: [{ ...vinculo }] };
        }

        if (sql.startsWith('insert into usuarios')) {
            cadastrosPublicos.push({ sql, parametros });
            if (falharCadastroDuplicado) {
                throw Object.assign(new Error('E-mail duplicado.'), {
                    code: '23505'
                });
            }

            return { rows: [] };
        }

        if (sql.includes('distinct on (u.id)')) {
            assert.match(sql, /v\.instituicao_id\s*=\s*\$1/);
            assert.match(sql, /v\.status\s*=\s*'aprovado'/);
            consultasGerenciamento.push(parametros);

            const usuariosUnicos = new Map();
            linhasGerenciamento
                .filter(
                    (linha) =>
                        Number(linha.instituicao_id) === Number(parametros[0]) &&
                        linha.status === 'aprovado'
                )
                .sort((a, b) => a.id - b.id || a.vinculo_id - b.vinculo_id)
                .forEach((linha) => {
                    if (!usuariosUnicos.has(linha.id)) {
                        usuariosUnicos.set(linha.id, {
                            id: linha.id,
                            nome: linha.nome,
                            email: linha.email,
                            criado_em: linha.criado_em,
                            vinculo_id: linha.vinculo_id
                        });
                    }
                });

            return { rows: [...usuariosUnicos.values()] };
        }

        if (sql.includes('where lower(u.email) = lower($1)')) {
            assert.match(sql, /\$3 = 'admin'/);
            consultasGerenciamento.push(parametros);
            const email = String(parametros[0]).toLowerCase();
            const instituicaoId = Number(parametros[1]);
            const perfil = parametros[2];
            const conta = contasCandidatas.find(
                (item) =>
                    item.email.toLowerCase() === email &&
                    (perfil === 'admin' ||
                        !item.vinculos.some(
                            (vinculo) =>
                                Number(vinculo.instituicao_id) === instituicaoId &&
                                vinculo.status !== 'aprovado'
                        ))
            );

            return {
                rows: conta
                    ? [{ id: conta.id, nome: conta.nome, email: conta.email }]
                    : []
            };
        }

        throw new Error(`Consulta inesperada no mock: ${consulta}`);
    };

    pool.connect = async () => {
        conexoesCriadas += 1;

        return {
            async query(consulta, parametros = []) {
                const sql = consulta.toLowerCase();
                consultasExclusao.push({ sql, parametros });

                if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
                    if (sql === 'rollback') {
                        rollbacks += 1;
                        if (falharNoRollback) {
                            throw new Error('Falha simulada no rollback.');
                        }
                    }
                    return { rows: [], rowCount: null };
                }

                if (
                    sql.includes('from vinculos_institucionais') &&
                    sql.includes('usuario_id = $1') &&
                    sql.includes('for update')
                ) {
                    return {
                        rows: vinculoAutorizadorTransacao
                            ? [vinculoAutorizadorTransacao]
                            : []
                    };
                }

                if (sql.includes('from vinculos_institucionais') && sql.includes('for update')) {
                    const vinculo = vinculosParaRemover.find(
                        (item) =>
                            Number(item.id) === Number(parametros[0]) &&
                            Number(item.instituicao_id) === Number(parametros[1]) &&
                            item.status === 'aprovado'
                    );

                    return { rows: vinculo ? [vinculo] : [] };
                }

                if (sql.includes('select count(*) as total')) {
                    const total = vinculosParaRemover.filter(
                        (item) =>
                            Number(item.instituicao_id) === Number(parametros[0]) &&
                            item.perfil === 'admin' &&
                            item.status === 'aprovado' &&
                            Number(item.id) !== Number(parametros[1])
                    ).length;

                    return { rows: [{ total: String(total) }] };
                }

                if (sql.startsWith('delete from vinculos_institucionais')) {
                    assert.doesNotMatch(sql, /delete\s+from\s+usuarios/);
                    if (falharNaExclusao) {
                        throw new Error('Falha simulada na exclusão do vínculo.');
                    }

                    const index = vinculosParaRemover.findIndex(
                        (item) =>
                            Number(item.id) === Number(parametros[0]) &&
                            Number(item.instituicao_id) === Number(parametros[1])
                    );

                    if (index === -1) {
                        return { rows: [], rowCount: 0 };
                    }

                    vinculosParaRemover.splice(index, 1);
                    return { rows: [], rowCount: 1 };
                }

                throw new Error(`Consulta transacional inesperada no mock: ${consulta}`);
            },
            release(erro) {
                conexoesLiberadas += 1;
                erroLiberacao = erro;
            }
        };
    };
}

async function requisicao(
    caminho,
    { usuarioId = 1, token = true, method = 'GET', body } = {}
) {
    const headers = {};

    if (token) {
        headers.Authorization = `Bearer ${tokenPara(usuarioId)}`;
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

describe('rotas institucionais de usuários', { concurrency: false }, () => {
    before(async () => {
        consultaOriginal = pool.query;
        conectarOriginal = pool.connect;
        servidor = app.listen(0);
        await new Promise((resolve) => servidor.once('listening', resolve));
        baseUrl = `http://127.0.0.1:${servidor.address().port}`;
    });

    beforeEach(() => {
        vinculosAutenticados = [
            { instituicao_id: 11, perfil: 'admin', status: 'aprovado' },
            { instituicao_id: 22, perfil: 'admin', status: 'aprovado' }
        ];
        vinculoAutorizadorTransacao = { id: 1, perfil: 'admin' };
        linhasGerenciamento = [
            { id: 2, nome: 'Ana', email: 'ana@teste.local', criado_em: '2026-01-01', vinculo_id: 200, instituicao_id: 22, status: 'aprovado' },
            { id: 2, nome: 'Ana', email: 'ana@teste.local', criado_em: '2026-01-01', vinculo_id: 201, instituicao_id: 22, status: 'aprovado' },
            { id: 3, nome: 'Bia', email: 'bia@teste.local', criado_em: '2026-01-02', vinculo_id: 300, instituicao_id: 22, status: 'pendente' },
            { id: 4, nome: 'Caio', email: 'caio@teste.local', criado_em: '2026-01-03', vinculo_id: 400, instituicao_id: 11, status: 'aprovado' },
            { id: 5, nome: 'Duda', email: 'duda@teste.local', criado_em: '2026-01-04', vinculo_id: 500, instituicao_id: 22, status: 'aprovado' }
        ];
        contasCandidatas = [
            {
                id: 6,
                nome: 'Eva',
                email: 'eva@teste.local',
                vinculos: [{ instituicao_id: 11, status: 'aprovado' }]
            },
            {
                id: 7,
                nome: 'Fabi',
                email: 'fabi@teste.local',
                vinculos: [{ instituicao_id: 22, status: 'pendente' }]
            },
            {
                id: 8,
                nome: 'Gabi',
                email: 'gabi@teste.local',
                vinculos: [{ instituicao_id: 22, status: 'aprovado' }]
            },
            {
                id: 9,
                nome: 'Hugo',
                email: 'hugo@teste.local',
                vinculos: [{ instituicao_id: 22, status: 'rejeitado' }]
            }
        ];
        vinculosParaRemover = [];
        consultasGerenciamento = [];
        consultasExclusao = [];
        cadastrosPublicos = [];
        falharCadastroDuplicado = false;
        vinculosParaAprovar = [];
        conexoesCriadas = 0;
        falharNaExclusao = false;
        falharNoRollback = false;
        rollbacks = 0;
        conexoesLiberadas = 0;
        erroLiberacao = undefined;
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

    it('lista somente vínculos aprovados da instituição da rota e evita usuários duplicados', async () => {
        const resposta = await requisicao('/usuarios/22/gerenciar');
        const dados = await respostaJson(resposta);

        assert.equal(resposta.status, 200);
        assert.deepEqual(dados.map((usuario) => usuario.id), [2, 5]);
        assert.equal(dados[0].vinculo_id, 200);
        assert.deepEqual(consultasGerenciamento, [[22]]);
    });

    it('cria conta global sem autenticação e ignora privilégios enviados pelo cliente', async () => {
        const resposta = await requisicao('/usuarios/cadastro', {
            method: 'POST',
            token: false,
            body: {
                nome: '  Eva  ',
                email: ' EVA@teste.local ',
                senha: 'senha-segura-123',
                instituicao_id: 22,
                perfil: 'admin',
                status: 'aprovado'
            }
        });
        const dados = await resposta.json();

        assert.equal(resposta.status, 202);
        assert.match(dados.mensagem, /não recebe acesso institucional automaticamente/);
        assert.match(cadastrosPublicos[0].sql, /insert into usuarios \(nome, email, senha_hash\)/);
        assert.deepEqual(cadastrosPublicos[0].parametros.slice(0, 2), [
            'Eva',
            'eva@teste.local'
        ]);
        assert.notEqual(cadastrosPublicos[0].parametros[2], 'senha-segura-123');
        assert.equal(cadastrosPublicos.length, 1);
    });

    it('retorna a mesma resposta para cadastro novo e e-mail duplicado', async () => {
        const body = {
            nome: 'Eva',
            email: 'eva@teste.local',
            senha: 'senha-segura-123'
        };
        const respostaNova = await requisicao('/usuarios/cadastro', {
            method: 'POST',
            token: false,
            body
        });
        const dadosNovos = await respostaNova.json();

        falharCadastroDuplicado = true;
        const respostaDuplicada = await requisicao('/usuarios/cadastro', {
            method: 'POST',
            token: false,
            body
        });
        const dadosDuplicados = await respostaDuplicada.json();

        assert.equal(respostaNova.status, 202);
        assert.equal(respostaDuplicada.status, 202);
        assert.deepEqual(dadosDuplicados, dadosNovos);
    });

    it('rejeita dados inválidos do cadastro público sem consultar o banco', async () => {
        const resposta = await requisicao('/usuarios/cadastro', {
            method: 'POST',
            token: false,
            body: {
                nome: 'Eva',
                email: 'email-inválido',
                senha: 'curta'
            }
        });

        assert.equal(resposta.status, 400);
        assert.equal(cadastrosPublicos.length, 0);
    });

    it('busca no máximo uma conta pelo e-mail exato sob autorização institucional', async () => {
        const resposta = await requisicao('/usuarios/22/candidatos', {
            method: 'POST',
            body: { email: 'EVA@teste.local' }
        });
        const dados = await resposta.json();

        assert.equal(resposta.status, 200);
        assert.deepEqual(dados, {
            id: 6,
            nome: 'Eva',
            email: 'eva@teste.local'
        });
        assert.deepEqual(consultasGerenciamento, [['EVA@teste.local', 22, 'admin']]);
    });

    it('não oferece vínculos pendentes ou rejeitados a coordenadores', async () => {
        vinculosAutenticados = [
            { instituicao_id: 22, perfil: 'coordenador', status: 'aprovado' }
        ];
        const respostaPendente = await requisicao('/usuarios/22/candidatos', {
            usuarioId: 1,
            method: 'POST',
            body: { email: 'fabi@teste.local' }
        });
        const respostaRejeitada = await requisicao('/usuarios/22/candidatos', {
            method: 'POST',
            body: { email: 'hugo@teste.local' }
        });

        assert.equal(respostaPendente.status, 404);
        assert.equal(respostaRejeitada.status, 404);
        assert.deepEqual(consultasGerenciamento, [
            ['fabi@teste.local', 22, 'coordenador'],
            ['hugo@teste.local', 22, 'coordenador']
        ]);
    });

    it('permite que administrador localize conta com vínculo rejeitado', async () => {
        const resposta = await requisicao('/usuarios/22/candidatos', {
            method: 'POST',
            body: { email: 'hugo@teste.local' }
        });
        const dados = await resposta.json();

        assert.equal(resposta.status, 200);
        assert.equal(dados.id, 9);
    });

    it('permite que administrador reative explicitamente o vínculo rejeitado existente', async () => {
        vinculosParaAprovar = [
            {
                id: 901,
                usuario_id: 9,
                instituicao_id: 22,
                perfil: 'aluno',
                status: 'rejeitado'
            }
        ];

        const resposta = await requisicao('/vinculos/22/901/aprovar', {
            method: 'PATCH',
            body: { perfil: 'orientador' }
        });
        const dados = await resposta.json();

        assert.equal(resposta.status, 200);
        assert.equal(dados.status, 'aprovado');
        assert.equal(dados.perfil, 'orientador');
        assert.equal(vinculosParaAprovar.length, 1);
        assert.equal(vinculosParaAprovar[0].id, 901);
    });

    it('não permite que coordenador reative vínculo rejeitado', async () => {
        vinculosAutenticados = [
            { instituicao_id: 22, perfil: 'coordenador', status: 'aprovado' }
        ];
        vinculosParaAprovar = [
            {
                id: 902,
                usuario_id: 9,
                instituicao_id: 22,
                perfil: 'aluno',
                status: 'rejeitado'
            }
        ];

        const resposta = await requisicao('/vinculos/22/902/aprovar', {
            method: 'PATCH',
            body: { perfil: 'aluno' }
        });

        assert.equal(resposta.status, 403);
        assert.equal(vinculosParaAprovar[0].status, 'rejeitado');
    });

    it('não expõe mais o diretório global de contas por GET /usuarios', async () => {
        const resposta = await requisicao('/usuarios');

        assert.equal(resposta.status, 404);
        assert.equal(consultasGerenciamento.length, 0);
    });

    it('retorna 401 quando o token está ausente', async () => {
        const resposta = await requisicao('/usuarios/22/gerenciar', { token: false });

        assert.equal(resposta.status, 401);
        assert.equal(conexoesCriadas, 0);
    });

    it('nega a listagem quando o perfil não é autorizado na instituição', async () => {
        vinculosAutenticados = [
            { instituicao_id: 22, perfil: 'aluno', status: 'aprovado' }
        ];

        const resposta = await requisicao('/usuarios/22/gerenciar');

        assert.equal(resposta.status, 403);
        assert.deepEqual(consultasGerenciamento, []);
    });

    it('permite que coordenador leia vínculos da instituição para editar perfis', async () => {
        vinculosAutenticados = [
            { instituicao_id: 22, perfil: 'coordenador', status: 'aprovado' }
        ];

        const resposta = await requisicao('/vinculos/22', { usuarioId: 1 });

        assert.equal(resposta.status, 200);
    });

    it('nega acesso quando a instituição da URL não pertence ao usuário', async () => {
        vinculosAutenticados = [
            { instituicao_id: 11, perfil: 'admin', status: 'aprovado' }
        ];

        const resposta = await requisicao('/usuarios/22/gerenciar');

        assert.equal(resposta.status, 403);
        assert.deepEqual(consultasGerenciamento, []);
    });

    it('rejeita ID institucional inválido antes de consultar vínculos', async () => {
        const resposta = await requisicao('/usuarios/22x/gerenciar');

        assert.equal(resposta.status, 400);
        assert.equal(consultasGerenciamento.length, 0);
    });

    it('remove somente o vínculo institucional e preserva conta e histórico', async () => {
        vinculosParaRemover = [
            { id: 501, usuario_id: 2, instituicao_id: 22, perfil: 'aluno', status: 'aprovado' },
            { id: 502, usuario_id: 2, instituicao_id: 11, perfil: 'orientador', status: 'aprovado' }
        ];

        const resposta = await requisicao('/vinculos/22/501', { method: 'DELETE' });
        const dados = await respostaJson(resposta);

        assert.equal(resposta.status, 200);
        assert.match(dados.mensagem, /histórico acadêmico foram preservados/);
        assert.deepEqual(vinculosParaRemover.map((vinculo) => vinculo.id), [502]);
        const instrucoesEscrita = consultasExclusao.filter(({ sql }) =>
            /^(insert|update|delete|truncate|drop)\b/.test(sql.trim())
        );
        assert.equal(instrucoesEscrita.length, 1);
        assert.match(
            instrucoesEscrita[0].sql,
            /^delete from vinculos_institucionais/
        );
        assert.deepEqual(instrucoesEscrita[0].parametros, [501, 22]);
    });

    it('permite ao administrador remover o vínculo de outro administrador', async () => {
        vinculosParaRemover = [
            { id: 551, usuario_id: 2, instituicao_id: 22, perfil: 'admin', status: 'aprovado' },
            { id: 552, usuario_id: 1, instituicao_id: 22, perfil: 'admin', status: 'aprovado' }
        ];

        const resposta = await requisicao('/vinculos/22/551', { method: 'DELETE' });

        assert.equal(resposta.status, 200);
        assert.deepEqual(vinculosParaRemover.map((vinculo) => vinculo.id), [552]);
    });

    it('não remove vínculo que pertença a outra instituição', async () => {
        vinculosParaRemover = [
            { id: 601, usuario_id: 2, instituicao_id: 11, perfil: 'aluno', status: 'aprovado' }
        ];

        const resposta = await requisicao('/vinculos/22/601', { method: 'DELETE' });

        assert.equal(resposta.status, 404);
        assert.equal(
            consultasExclusao.some(({ sql }) => sql.startsWith('delete from vinculos_institucionais')),
            false
        );
    });

    it('não remove vínculo pendente', async () => {
        vinculosParaRemover = [
            { id: 611, usuario_id: 2, instituicao_id: 22, perfil: 'aluno', status: 'pendente' }
        ];

        const resposta = await requisicao('/vinculos/22/611', { method: 'DELETE' });

        assert.equal(resposta.status, 404);
        assert.equal(vinculosParaRemover.length, 1);
        assert.equal(
            consultasExclusao.some(({ sql }) => sql.startsWith('delete from vinculos_institucionais')),
            false
        );
    });

    it('retorna 404 para um vínculo inexistente', async () => {
        const resposta = await requisicao('/vinculos/22/999', { method: 'DELETE' });

        assert.equal(resposta.status, 404);
    });

    it('impede a remoção do próprio vínculo administrativo', async () => {
        vinculosParaRemover = [
            { id: 701, usuario_id: 1, instituicao_id: 22, perfil: 'admin', status: 'aprovado' }
        ];

        const resposta = await requisicao('/vinculos/22/701', { method: 'DELETE' });

        assert.equal(resposta.status, 403);
        assert.equal(
            consultasExclusao.some(({ sql }) => sql.startsWith('delete from vinculos_institucionais')),
            false
        );
    });

    it('rejeita IDs de vínculo inválidos sem iniciar transação', async () => {
        const resposta = await requisicao('/vinculos/22/not-a-number', { method: 'DELETE' });

        assert.equal(resposta.status, 400);
        assert.equal(conexoesCriadas, 0);
    });

    it('executa rollback e libera a conexão após erro na remoção', async () => {
        vinculosParaRemover = [
            { id: 901, usuario_id: 2, instituicao_id: 22, perfil: 'aluno', status: 'aprovado' }
        ];
        falharNaExclusao = true;

        const resposta = await requisicao('/vinculos/22/901', { method: 'DELETE' });
        const dados = await resposta.json();

        assert.equal(resposta.status, 500);
        assert.match(dados.erro, /Erro interno/);
        assert.equal(rollbacks, 1);
        assert.equal(conexoesLiberadas, 1);
        assert.equal(vinculosParaRemover.length, 1);
    });

    it('descarta a conexão do pool quando o rollback também falha', async () => {
        vinculosParaRemover = [
            { id: 911, usuario_id: 2, instituicao_id: 22, perfil: 'aluno', status: 'aprovado' }
        ];
        falharNaExclusao = true;
        falharNoRollback = true;

        const resposta = await requisicao('/vinculos/22/911', { method: 'DELETE' });

        assert.equal(resposta.status, 500);
        assert.equal(rollbacks, 1);
        assert.equal(conexoesLiberadas, 1);
        assert.ok(erroLiberacao instanceof Error);
    });

    it('revalida o vínculo autorizador dentro da transação', async () => {
        vinculoAutorizadorTransacao = null;
        vinculosParaRemover = [
            { id: 921, usuario_id: 2, instituicao_id: 22, perfil: 'aluno', status: 'aprovado' }
        ];

        const resposta = await requisicao('/vinculos/22/921', { method: 'DELETE' });

        assert.equal(resposta.status, 403);
        assert.deepEqual(vinculosParaRemover.map((vinculo) => vinculo.id), [921]);
        assert.equal(
            consultasExclusao.some(({ sql }) => sql.startsWith('delete from vinculos_institucionais')),
            false
        );
        assert.equal(rollbacks, 1);
    });

    it('nega remoção quando a instituição da URL não pertence ao usuário', async () => {
        vinculosAutenticados = [
            { instituicao_id: 11, perfil: 'admin', status: 'aprovado' }
        ];

        const resposta = await requisicao('/vinculos/22/501', { method: 'DELETE' });

        assert.equal(resposta.status, 403);
        assert.equal(conexoesCriadas, 0);
    });

    it('rejeita ID institucional inválido na remoção', async () => {
        const resposta = await requisicao('/vinculos/22x/501', { method: 'DELETE' });

        assert.equal(resposta.status, 400);
        assert.equal(conexoesCriadas, 0);
    });

    it('impede coordenador de remover vínculo administrativo', async () => {
        vinculosAutenticados = [
            { instituicao_id: 22, perfil: 'coordenador', status: 'aprovado' }
        ];
        vinculoAutorizadorTransacao = { id: 1, perfil: 'coordenador' };
        vinculosParaRemover = [
            { id: 951, usuario_id: 2, instituicao_id: 22, perfil: 'admin', status: 'aprovado' }
        ];

        const resposta = await requisicao('/vinculos/22/951', {
            method: 'DELETE'
        });

        assert.equal(resposta.status, 403);
        assert.equal(vinculosParaRemover.length, 1);
    });

    it('nega a remoção quando o perfil do solicitante não é autorizado', async () => {
        vinculosAutenticados = [
            { instituicao_id: 22, perfil: 'aluno', status: 'aprovado' }
        ];

        const resposta = await requisicao('/vinculos/22/501', { method: 'DELETE' });

        assert.equal(resposta.status, 403);
        assert.equal(conexoesCriadas, 0);
    });
});
