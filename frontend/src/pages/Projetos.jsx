
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

function Projetos() {
  const navigate = useNavigate()

  const [projetos, setProjetos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function buscarProjetos() {
      try {
        const token = sessionStorage.getItem('token')

        const resposta = await fetch(
          'http://localhost:3000/projetos/1',
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
        <button onClick={() => navigate('/dashboard')}>
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

        <button
          className="botao-voltar"
          onClick={() => navigate('/dashboard')}
        >
          ← Dashboard
        </button>
      </header>

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
