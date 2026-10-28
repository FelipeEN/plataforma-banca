
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'
import { buscarContextoInstituicao } from '../utils/instituicao'
import API_URL from '../api.js'

const PERFIS_QUE_PODEM_CRIAR = [
  'admin',
  'coordenador',
  'orientador',
  'aluno'
]

function Projetos() {
  const navigate = useNavigate()

  const [projetos, setProjetos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [instituicaoId, setInstituicaoId] = useState(null)
  const [perfil, setPerfil] = useState('')
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroCriacao, setErroCriacao] = useState('')
  const [sucessoCriacao, setSucessoCriacao] = useState('')
  const envioEmAndamento = useRef(false)
  const podeCriarProjeto = PERFIS_QUE_PODEM_CRIAR.includes(perfil)

  useEffect(() => {
    async function buscarProjetos() {
      try {
        const token = sessionStorage.getItem('token')
        const contexto = await buscarContextoInstituicao(token)
        const instituicaoAtivaId = contexto.instituicaoId

        setInstituicaoId(instituicaoAtivaId)
        setPerfil(contexto.vinculo.perfil)

        const resposta = await fetch(
          `${API_URL}/projetos/${instituicaoAtivaId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        if (resposta.status === 401) {
          sessionStorage.removeItem('token')
          navigate('/login', { replace: true })
          return
        }

        if (!resposta.ok) {
          throw new Error('Não foi possível carregar os projetos.')
        }

        const dados = await resposta.json()
        setProjetos(dados.projetos)
      } catch (error) {
        setErro(error.message)
      } finally {
        setCarregando(false)
      }
    }

    buscarProjetos()
  }, [navigate])

  async function criarProjeto(event) {
    event.preventDefault()

    if (envioEmAndamento.current) {
      return
    }

    if (!podeCriarProjeto || !instituicaoId) {
      setErroCriacao('Você não tem permissão para criar projetos nesta instituição.')
      return
    }

    const token = sessionStorage.getItem('token')

    if (!token) {
      sessionStorage.removeItem('token')
      navigate('/login', { replace: true })
      return
    }

    envioEmAndamento.current = true
    setEnviando(true)
    setErroCriacao('')
    setSucessoCriacao('')

    try {
      const resposta = await fetch(
        `${API_URL}/projetos/${instituicaoId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ titulo, descricao })
        }
      )

      if (resposta.status === 401) {
        sessionStorage.removeItem('token')
        navigate('/login', { replace: true })
        return
      }

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível criar o projeto.')
      }

      if (!dados.projeto) {
        throw new Error('A API não retornou o projeto criado.')
      }

      setProjetos((projetosAtuais) => [
        dados.projeto,
        ...projetosAtuais.filter(
          (projeto) => projeto.id !== dados.projeto.id
        )
      ])
      setTitulo('')
      setDescricao('')
      setFormularioAberto(false)
      setSucessoCriacao(dados.mensagem || 'Projeto criado com sucesso!')
    } catch (error) {
      setErroCriacao(
        error instanceof Error
          ? error.message
          : 'Não foi possível criar o projeto.'
      )
    } finally {
      envioEmAndamento.current = false
      setEnviando(false)
    }
  }

  function formatarStatus(status) {
    const statusFormatados = {
      rascunho: 'Rascunho',
      submetido: 'Submetido',
      em_avaliacao: 'Em avaliação',
      avaliado: 'Avaliado',
      arquivado: 'Arquivado'
    }

    return statusFormatados[status] || status
  }

  if (carregando) {
    return (
      <main className="pagina-projetos">
        <p>Carregando projetos...</p>
      </main>
    )
  }

  if (erro) {
    return (
      <main className="pagina-projetos">
        <h1>Projetos</h1>
        <p role="alert">{erro}</p>
        <button className="botao-voltar" onClick={() => navigate('/dashboard')}>
          Voltar ao dashboard
        </button>
      </main>
    )
  }

  return (
    <main className="pagina-projetos">
      <header className="projetos-cabecalho">
        <div>
          <span className="subtitulo">GESTÃO ACADÊMICA</span>
          <h1>Projetos</h1>
          <p>Consulte e acompanhe os projetos da instituição.</p>
        </div>

        <div className="acoes-cabecalho-projetos">
          {podeCriarProjeto && (
            <button
              className="botao-criar-projeto"
              type="button"
              onClick={() => {
                setFormularioAberto((aberto) => !aberto)
                setErroCriacao('')
                setSucessoCriacao('')
              }}
            >
              {formularioAberto ? 'Cancelar' : 'Criar projeto'}
            </button>
          )}

          <button
            className="botao-voltar"
            onClick={() => navigate('/dashboard')}
          >
            ← Dashboard
          </button>
        </div>
      </header>

      {formularioAberto && podeCriarProjeto && (
        <form
          className="formulario-criar-projeto"
          onSubmit={criarProjeto}
        >
          <label htmlFor="titulo-projeto">Título</label>
          <input
            id="titulo-projeto"
            name="titulo"
            type="text"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            maxLength={200}
            required
            disabled={enviando}
          />

          <label htmlFor="descricao-projeto">Descrição (opcional)</label>
          <textarea
            id="descricao-projeto"
            name="descricao"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            disabled={enviando}
          />

          <button type="submit" disabled={enviando || !titulo.trim()}>
            {enviando ? 'Criando projeto...' : 'Salvar projeto'}
          </button>

          {erroCriacao && (
            <p className="mensagem-erro" role="alert">
              {erroCriacao}
            </p>
          )}
        </form>
      )}

      {sucessoCriacao && (
        <p className="mensagem-sucesso" role="status">
          {sucessoCriacao}
        </p>
      )}

      <section className="projetos-resumo">
        <span>Total de projetos cadastrados</span>
        <strong>{projetos.length}</strong>
      </section>

      {projetos.length === 0 ? (
        <section className="projetos-vazio">
          <h2>Nenhum projeto encontrado</h2>
          <p>Os projetos cadastrados aparecerão nesta página.</p>
        </section>
      ) : (
        <section className="lista-projetos">
          {projetos.map((projeto) => (
            <article className="projeto-card" key={projeto.id}>
              <div className="projeto-card-topo">
                <div className="projeto-icone">▣</div>

                <span
                  className={`projeto-status status-${projeto.status}`}
                >
                  {formatarStatus(projeto.status)}
                </span>
              </div>

              <h2>{projeto.titulo}</h2>

              <p className="projeto-identificador">
                Projeto #{projeto.id}
              </p>

              <button
                className="botao-detalhes"
                onClick={() =>
                  navigate(`/projetos/${projeto.id}`)
                }
              >
                Ver detalhes →
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

export default Projetos
