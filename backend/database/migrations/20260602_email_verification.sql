BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM usuarios
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Email verification migration blocked: duplicate case-insensitive user emails must be reviewed first.';
    END IF;
END
$$;

ALTER TABLE usuarios
    ADD COLUMN email_verification_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN email_verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX usuarios_email_lower_unique
    ON usuarios (LOWER(email));

CREATE TABLE email_verification_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CHECK (expires_at > created_at),
    CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);

CREATE INDEX email_verification_tokens_usuario_active_idx
    ON email_verification_tokens (usuario_id)
    WHERE consumed_at IS NULL;

CREATE TABLE rate_limit_buckets (
    acao VARCHAR(40) NOT NULL,
    chave_hash CHAR(64) NOT NULL,
    janela_inicio TIMESTAMPTZ NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    PRIMARY KEY (acao, chave_hash)
);

CREATE INDEX rate_limit_buckets_janela_idx
    ON rate_limit_buckets (janela_inicio);

COMMIT;
