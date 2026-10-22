--
-- PostgreSQL database dump
--

\restrict pgOMKk2o1Ka0SM2hmvMcvqlZvMUuFLMrlZiacvCr0COZTLjqF3UNETtvMGoovJG

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: avaliacoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.avaliacoes (
    id integer NOT NULL,
    banca_id integer NOT NULL,
    projeto_id integer NOT NULL,
    avaliador_id integer NOT NULL,
    status character varying(20) DEFAULT 'rascunho'::character varying NOT NULL,
    comentario text,
    criada_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizada_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT avaliacoes_status_check CHECK (((status)::text = ANY ((ARRAY['rascunho'::character varying, 'finalizada'::character varying])::text[])))
);


ALTER TABLE public.avaliacoes OWNER TO postgres;

--
-- Name: avaliacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.avaliacoes ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.avaliacoes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: avaliadores_banca; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.avaliadores_banca (
    banca_id integer NOT NULL,
    usuario_id integer NOT NULL
);


ALTER TABLE public.avaliadores_banca OWNER TO postgres;

--
-- Name: bancas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bancas (
    id integer NOT NULL,
    instituicao_id integer NOT NULL,
    nome character varying(150) NOT NULL,
    status character varying(20) DEFAULT 'rascunho'::character varying NOT NULL,
    criada_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT bancas_status_check CHECK (((status)::text = ANY ((ARRAY['rascunho'::character varying, 'aberta'::character varying, 'encerrada'::character varying, 'publicada'::character varying])::text[])))
);


ALTER TABLE public.bancas OWNER TO postgres;

--
-- Name: bancas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.bancas ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bancas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: criterios_avaliacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.criterios_avaliacao (
    id integer NOT NULL,
    banca_id integer NOT NULL,
    nome character varying(150) NOT NULL,
    descricao text,
    peso numeric(5,2) DEFAULT 1 NOT NULL,
    nota_maxima numeric(5,2) DEFAULT 10 NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT criterios_avaliacao_nota_maxima_check CHECK ((nota_maxima > (0)::numeric)),
    CONSTRAINT criterios_avaliacao_peso_check CHECK ((peso > (0)::numeric))
);


ALTER TABLE public.criterios_avaliacao OWNER TO postgres;

--
-- Name: criterios_avaliacao_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.criterios_avaliacao ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.criterios_avaliacao_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: instituicoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instituicoes (
    id integer NOT NULL,
    nome character varying(150) NOT NULL,
    ativa boolean DEFAULT true NOT NULL,
    criada_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.instituicoes OWNER TO postgres;

--
-- Name: instituicoes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.instituicoes ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.instituicoes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: membros_projeto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.membros_projeto (
    id integer NOT NULL,
    projeto_id integer NOT NULL,
    usuario_id integer NOT NULL,
    funcao character varying(30) NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT membros_projeto_funcao_check CHECK (((funcao)::text = ANY ((ARRAY['aluno'::character varying, 'orientador'::character varying])::text[])))
);


ALTER TABLE public.membros_projeto OWNER TO postgres;

--
-- Name: membros_projeto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.membros_projeto ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.membros_projeto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notas_avaliacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notas_avaliacao (
    avaliacao_id integer NOT NULL,
    criterio_id integer NOT NULL,
    nota numeric(5,2) NOT NULL,
    CONSTRAINT notas_avaliacao_nota_check CHECK ((nota >= (0)::numeric))
);


ALTER TABLE public.notas_avaliacao OWNER TO postgres;

--
-- Name: projetos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projetos (
    id integer NOT NULL,
    instituicao_id integer NOT NULL,
    titulo character varying(200) NOT NULL,
    descricao text,
    status character varying(20) DEFAULT 'rascunho'::character varying NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT projetos_status_check CHECK (((status)::text = ANY ((ARRAY['rascunho'::character varying, 'submetido'::character varying, 'em_avaliacao'::character varying, 'avaliado'::character varying, 'arquivado'::character varying])::text[])))
);


ALTER TABLE public.projetos OWNER TO postgres;

--
-- Name: projetos_banca; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projetos_banca (
    banca_id integer NOT NULL,
    projeto_id integer NOT NULL
);


ALTER TABLE public.projetos_banca OWNER TO postgres;

--
-- Name: projetos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.projetos ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.projetos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nome character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    senha_hash text NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.usuarios ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.usuarios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: vinculos_institucionais; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vinculos_institucionais (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    instituicao_id integer NOT NULL,
    perfil character varying(30) NOT NULL,
    status character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT vinculos_institucionais_perfil_check CHECK (((perfil)::text = ANY ((ARRAY['admin'::character varying, 'coordenador'::character varying, 'orientador'::character varying, 'avaliador'::character varying, 'aluno'::character varying])::text[]))),
    CONSTRAINT vinculos_institucionais_status_check CHECK (((status)::text = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying])::text[])))
);


ALTER TABLE public.vinculos_institucionais OWNER TO postgres;

--
-- Name: vinculos_institucionais_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.vinculos_institucionais ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.vinculos_institucionais_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: avaliacoes avaliacoes_banca_id_projeto_id_avaliador_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_banca_id_projeto_id_avaliador_id_key UNIQUE (banca_id, projeto_id, avaliador_id);


--
-- Name: avaliacoes avaliacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_pkey PRIMARY KEY (id);


--
-- Name: avaliadores_banca avaliadores_banca_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avaliadores_banca
    ADD CONSTRAINT avaliadores_banca_pkey PRIMARY KEY (banca_id, usuario_id);


--
-- Name: bancas bancas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bancas
    ADD CONSTRAINT bancas_pkey PRIMARY KEY (id);


--
-- Name: criterios_avaliacao criterios_avaliacao_banca_id_nome_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.criterios_avaliacao
    ADD CONSTRAINT criterios_avaliacao_banca_id_nome_key UNIQUE (banca_id, nome);


--
-- Name: criterios_avaliacao criterios_avaliacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.criterios_avaliacao
    ADD CONSTRAINT criterios_avaliacao_pkey PRIMARY KEY (id);


--
-- Name: instituicoes instituicoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instituicoes
    ADD CONSTRAINT instituicoes_pkey PRIMARY KEY (id);


--
-- Name: membros_projeto membros_projeto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.membros_projeto
    ADD CONSTRAINT membros_projeto_pkey PRIMARY KEY (id);


--
-- Name: membros_projeto membros_projeto_projeto_id_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.membros_projeto
    ADD CONSTRAINT membros_projeto_projeto_id_usuario_id_key UNIQUE (projeto_id, usuario_id);


--
-- Name: notas_avaliacao notas_avaliacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notas_avaliacao
    ADD CONSTRAINT notas_avaliacao_pkey PRIMARY KEY (avaliacao_id, criterio_id);


--
-- Name: projetos_banca projetos_banca_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projetos_banca
    ADD CONSTRAINT projetos_banca_pkey PRIMARY KEY (banca_id, projeto_id);


--
-- Name: projetos projetos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projetos
    ADD CONSTRAINT projetos_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: vinculos_institucionais vinculos_institucionais_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vinculos_institucionais
    ADD CONSTRAINT vinculos_institucionais_pkey PRIMARY KEY (id);


--
-- Name: vinculos_institucionais vinculos_institucionais_usuario_id_instituicao_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vinculos_institucionais
    ADD CONSTRAINT vinculos_institucionais_usuario_id_instituicao_id_key UNIQUE (usuario_id, instituicao_id);


--
-- Name: avaliacoes avaliacoes_banca_id_avaliador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_banca_id_avaliador_id_fkey FOREIGN KEY (banca_id, avaliador_id) REFERENCES public.avaliadores_banca(banca_id, usuario_id);


--
-- Name: avaliacoes avaliacoes_banca_id_projeto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_banca_id_projeto_id_fkey FOREIGN KEY (banca_id, projeto_id) REFERENCES public.projetos_banca(banca_id, projeto_id);


--
-- Name: avaliadores_banca avaliadores_banca_banca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avaliadores_banca
    ADD CONSTRAINT avaliadores_banca_banca_id_fkey FOREIGN KEY (banca_id) REFERENCES public.bancas(id);


--
-- Name: avaliadores_banca avaliadores_banca_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avaliadores_banca
    ADD CONSTRAINT avaliadores_banca_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: bancas bancas_instituicao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bancas
    ADD CONSTRAINT bancas_instituicao_id_fkey FOREIGN KEY (instituicao_id) REFERENCES public.instituicoes(id);


--
-- Name: criterios_avaliacao criterios_avaliacao_banca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.criterios_avaliacao
    ADD CONSTRAINT criterios_avaliacao_banca_id_fkey FOREIGN KEY (banca_id) REFERENCES public.bancas(id);


--
-- Name: membros_projeto membros_projeto_projeto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.membros_projeto
    ADD CONSTRAINT membros_projeto_projeto_id_fkey FOREIGN KEY (projeto_id) REFERENCES public.projetos(id);


--
-- Name: membros_projeto membros_projeto_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.membros_projeto
    ADD CONSTRAINT membros_projeto_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: notas_avaliacao notas_avaliacao_avaliacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notas_avaliacao
    ADD CONSTRAINT notas_avaliacao_avaliacao_id_fkey FOREIGN KEY (avaliacao_id) REFERENCES public.avaliacoes(id);


--
-- Name: notas_avaliacao notas_avaliacao_criterio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notas_avaliacao
    ADD CONSTRAINT notas_avaliacao_criterio_id_fkey FOREIGN KEY (criterio_id) REFERENCES public.criterios_avaliacao(id);


--
-- Name: projetos_banca projetos_banca_banca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projetos_banca
    ADD CONSTRAINT projetos_banca_banca_id_fkey FOREIGN KEY (banca_id) REFERENCES public.bancas(id);


--
-- Name: projetos_banca projetos_banca_projeto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projetos_banca
    ADD CONSTRAINT projetos_banca_projeto_id_fkey FOREIGN KEY (projeto_id) REFERENCES public.projetos(id);


--
-- Name: projetos projetos_instituicao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projetos
    ADD CONSTRAINT projetos_instituicao_id_fkey FOREIGN KEY (instituicao_id) REFERENCES public.instituicoes(id);


--
-- Name: vinculos_institucionais vinculos_institucionais_instituicao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vinculos_institucionais
    ADD CONSTRAINT vinculos_institucionais_instituicao_id_fkey FOREIGN KEY (instituicao_id) REFERENCES public.instituicoes(id);


--
-- Name: vinculos_institucionais vinculos_institucionais_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vinculos_institucionais
    ADD CONSTRAINT vinculos_institucionais_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- PostgreSQL database dump complete
--

\unrestrict pgOMKk2o1Ka0SM2hmvMcvqlZvMUuFLMrlZiacvCr0COZTLjqF3UNETtvMGoovJG

