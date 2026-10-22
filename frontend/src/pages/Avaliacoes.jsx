import '../App.css'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buscarContextoInstituicao } from '../utils/instituicao'
import API_URL from '../api.js'

function Avaliacoes() {
  const navigate = useNavigate()

  const [bancas, setBancas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function buscarBancas() {
      try {
        const token = sessionStorage.getItem('token')
        const { instituicaoId } = await buscarContextoInstituicao(token)

        const resposta = await fetch(
          `${API_URL}/bancas/${instituicaoId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const dados = await resposta.json()

        if (resposta.status === 401) {
          sessionStorage.removeItem('token')
          navigate('/login', { replace: true })
          return
        }

        if (!resposta.ok) {
          throw new Error(
            dados.erro || 'Não foi possível carregar as bancas.'
          )
        }

        setBancas(Array.isArray(dados) ? dados : dados.bancas || [])
      } catch (erro) {
        setErro(erro.message)
      } finally {
        setCarregando(false)
      }
    }

    buscarBancas()
  }, [navigate])

return (
  <main className="pagina-avaliacoes">
    <header className="cabecalho-avaliacoes">
      <div>
        <span className="subtitulo">GESTÃO ACADÊMICA</span>
        <h1>Avaliações</h1>
        <p>
          Consulte as bancas e acompanhe o processo de avaliação
          dos projetos.
        </p>
      </div>

      <button
        className="botao-voltar-avaliacoes"
        onClick={() => navigate('/dashboard')}
      >
        ← Voltar ao Dashboard
      </button>
    </header>

    {carregando && (
      <div className="estado-avaliacoes">
        Carregando bancas...
      </div>
    )}

    {erro && (
      <div className="erro-avaliacoes" role="alert">
        {erro}
      </div>
    )}

    {!carregando && !erro && bancas.length === 0 && (
      <div className="estado-avaliacoes">
        Nenhuma banca encontrada.
      </div>
    )}

    {!carregando && !erro && bancas.length > 0 && (
      <section className="lista-avaliacoes">
        {bancas.map((banca) => (
          <article className="cartao-avaliacao" key={banca.id}>
            <div className="cartao-avaliacao-topo">
              <div className="icone-avaliacao">☑</div>

              <span
                className={`status-avaliacao ${banca.status}`}
              >
                {banca.status}
              </span>
            </div>

            <h2>{banca.nome}</h2>

            <p className="cartao-avaliacao-descricao">
              Consulte os projetos e as informações disponíveis
              nesta banca de avaliação.
            </p>

            <button
              className="botao-consultar-avaliacao"
              onClick={() => navigate(`/bancas/${banca.id}`)}
            >
              Consultar banca →
            </button>
          </article>
        ))}
      </section>
    )}
  </main>
)
}

export default Avaliacoes