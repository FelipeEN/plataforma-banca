CREATE TABLE instituicoes (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

------------------------------------------------------

CREATE TABLE usuarios (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------

CREATE TABLE vinculos_institucionais (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    usuario_id INTEGER NOT NULL
        REFERENCES usuarios(id),

    instituicao_id INTEGER NOT NULL
        REFERENCES instituicoes(id),

    perfil VARCHAR(30) NOT NULL
        CHECK (perfil IN (
            'admin',
            'coordenador',
            'orientador',
            'avaliador',
            'aluno'
        )),

    status VARCHAR(20) NOT NULL DEFAULT 'pendente'
        CHECK (status IN (
            'pendente',
            'aprovado',
            'rejeitado'
        )),

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (usuario_id, instituicao_id)
);


-----------------------------------

CREATE TABLE projetos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    instituicao_id INTEGER NOT NULL
        REFERENCES instituicoes(id),

    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN (
            'rascunho',
            'submetido',
            'em_avaliacao',
            'avaliado',
            'arquivado'
        )),

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE membros_projeto (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    projeto_id INTEGER NOT NULL
        REFERENCES projetos(id),

    usuario_id INTEGER NOT NULL
        REFERENCES usuarios(id),

    funcao VARCHAR(30) NOT NULL
        CHECK (funcao IN (
            'aluno',
            'orientador'
        )),

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (projeto_id, usuario_id)
);

-------------------------------------------

CREATE TABLE bancas (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    instituicao_id INTEGER NOT NULL
        REFERENCES instituicoes(id),

    nome VARCHAR(150) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN (
            'rascunho',
            'aberta',
            'encerrada',
            'publicada'
        )),

    criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projetos_banca (
    banca_id INTEGER NOT NULL
        REFERENCES bancas(id),

    projeto_id INTEGER NOT NULL
        REFERENCES projetos(id),

    PRIMARY KEY (banca_id, projeto_id)
);

CREATE TABLE avaliadores_banca (
    banca_id INTEGER NOT NULL
        REFERENCES bancas(id),

    usuario_id INTEGER NOT NULL
        REFERENCES usuarios(id),

    PRIMARY KEY (banca_id, usuario_id)
);

-----------------------------------------
CREATE TABLE criterios_avaliacao (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    banca_id INTEGER NOT NULL
        REFERENCES bancas(id),

    nome VARCHAR(150) NOT NULL,
    descricao TEXT,

    peso NUMERIC(5,2) NOT NULL DEFAULT 1
        CHECK (peso > 0),

    nota_maxima NUMERIC(5,2) NOT NULL DEFAULT 10
        CHECK (nota_maxima > 0),

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (banca_id, nome)
);

CREATE TABLE avaliacoes (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    banca_id INTEGER NOT NULL,
    projeto_id INTEGER NOT NULL,
    avaliador_id INTEGER NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho', 'finalizada')),

    comentario TEXT,
    criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (banca_id, projeto_id)
        REFERENCES projetos_banca(banca_id, projeto_id),

    FOREIGN KEY (banca_id, avaliador_id)
        REFERENCES avaliadores_banca(banca_id, usuario_id),

    UNIQUE (banca_id, projeto_id, avaliador_id)
);

CREATE TABLE notas_avaliacao (
    avaliacao_id INTEGER NOT NULL
        REFERENCES avaliacoes(id),

    criterio_id INTEGER NOT NULL
        REFERENCES criterios_avaliacao(id),

    nota NUMERIC(5,2) NOT NULL
        CHECK (nota >= 0),

    PRIMARY KEY (avaliacao_id, criterio_id)
);