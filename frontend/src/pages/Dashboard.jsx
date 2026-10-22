
import '../App.css'

import { useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import { buscarContextoInstituicao } from '../utils/instituicao'
import API_URL from '../api.js'


function Dashboard() {

const navigate = useNavigate()
const [meusProjetos, setMeusProjetos] = useState([])
const [erroProjetosAluno, setErroProjetosAluno] = useState('')
const [usuario, setUsuario] = useState(null)
const [instituicaoId, setInstituicaoId] = useState(null)
const [carregando, setCarregando] = useState(true)

const perfilUsuario = usuario?.vinculos?.find(
    (vinculo) =>
        Number(vinculo.instituicao_id) === instituicaoId &&
        vinculo.status === 'aprovado'
)?.perfil

const [totalProjetos, setTotalProjetos] = useState(0)
const [totalBancas, setTotalBancas] = useState(0)

const [totalAvaliacoes, setTotalAvaliacoes] = useState(0)
const [totalProjetosRanqueados, setTotalProjetosRanqueados] = useState(0)
useEffect(() => {
    async function buscarUsuario() {
        try {

          
            const token = sessionStorage.getItem('token')

            const contexto = await buscarContextoInstituicao(token)
            const usuarioLogado = contexto.usuario
            const instituicaoId = contexto.instituicaoId
            const perfilAtivo = contexto.vinculo.perfil

            setUsuario(usuarioLogado)
            setInstituicaoId(instituicaoId)

if (perfilAtivo === 'aluno') {
    const respostaMeusProjetos = await fetch(
        `${API_URL}/projetos/${instituicaoId}/meus-projetos`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    )

    const dadosMeusProjetos = await respostaMeusProjetos.json()

    if (!respostaMeusProjetos.ok) {
        throw new Error(
            dadosMeusProjetos.erro ||
            'Não foi possível buscar seus projetos.'
        )
    }

    setMeusProjetos(dadosMeusProjetos.projetos ?? [])
}

            console.log('Dados do usuário:', usuarioLogado)

            const respostaProjetos = await fetch(
                 `${API_URL}/projetos/${instituicaoId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
console.log('Status da API de projetos:', respostaProjetos.status)

const dadosProjetos = await respostaProjetos.json()

console.log('Resposta da API de projetos:', dadosProjetos)

if (!respostaProjetos.ok) {
    throw new Error('Não foi possível buscar os projetos.')
}

setTotalProjetos(
    Array.isArray(dadosProjetos)
        ? dadosProjetos.length
        : dadosProjetos.projetos?.length ?? 0
)
        const respostaBancas = await fetch(
    `${API_URL}/bancas/${instituicaoId}`,
    {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
)

            if (!respostaBancas.ok) {
                throw new Error('Não foi possível buscar as bancas.')
            }

            const dadosBancas = await respostaBancas.json()

            setTotalBancas(dadosBancas.length)

const respostaAvaliacoes = await fetch(
    `${API_URL}/avaliacoes/${instituicaoId}/resumo`,
    {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
)

const dadosAvaliacoes = await respostaAvaliacoes.json()

console.log('Status da API de avaliações:', respostaAvaliacoes.status)
console.log('Resposta da API de avaliações:', dadosAvaliacoes)

if (!respostaAvaliacoes.ok) {
    throw new Error(
        dadosAvaliacoes.erro ||
        'Não foi possível buscar as avaliações.'
    )
}

setTotalAvaliacoes(dadosAvaliacoes.total_avaliacoes ?? 0)
const respostaRanking = await fetch(
    `${API_URL}/avaliacoes/${instituicaoId}/ranking/resumo`,
    {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
)

            if (respostaRanking.ok) {
              const dadosRanking = await respostaRanking.json()

              setTotalProjetosRanqueados(
                dadosRanking.total_projetos_ranqueados
              )
            }

            
        } catch (erro) {
            console.error('Erro ao buscar usuário:', erro)

            setErroProjetosAluno(erro.message)
        } finally {
            setCarregando(false)
        }
    }

    buscarUsuario()
}, [navigate])

  return (
    <div className="aplicacao">
      <aside className="menu-lateral">
        <div className="marca">
          <div className="marca-icone">PA</div>
          <div>
            <h2>Acadêmica</h2>
            <span>Gestão de projetos</span>
          </div>
        </div>

        <p className="menu-titulo">MENU PRINCIPAL</p>
        <nav className="navegacao">
          <a
            href="/dashboard"
            className="ativo"
            onClick={(evento) => {
              evento.preventDefault()
              navigate('/dashboard')
            }}
          >
            ▦ Dashboard
          </a>

          <a
            href="/projetos"
            onClick={(evento) => {
              evento.preventDefault()
              navigate('/projetos')
            }}
          >
            ▣ Projetos
          </a>

          <a
            href="/bancas"
            onClick={(evento) => {
              evento.preventDefault()
              navigate('/bancas')
            }}
          >
            ♧ Bancas
          </a>

       <a
  href="/avaliacoes"
  onClick={(evento) => {
    evento.preventDefault()
    navigate('/avaliacoes')
  }}
>
  ☑ Avaliações
</a>

<a
  href="/bancas"
  onClick={(evento) => {
    evento.preventDefault()
    navigate('/bancas')
  }}
>
  ♜ Ranking
</a>

{['admin', 'coordenador'].includes(perfilUsuario) && (
  <a
    href="/usuarios/novo"
    onClick={(evento) => {
      evento.preventDefault()
      navigate('/usuarios/novo')
    }}
  >
    ♙ Cadastrar usuário
  </a>
)}

{['admin', 'coordenador'].includes(perfilUsuario) && (
  <a
    href="/usuarios/associar"
    onClick={(evento) => {
      evento.preventDefault()
      navigate('/usuarios/associar')
    }}
  >
    ♙ Associar perfil
  </a>
)}
        </nav>
        <div className="perfil">
          <div className="avatar">FS</div>
          <div>
            
            <strong>
              {carregando
              ? 'Carregando...'
              : usuario
                  ? usuario.nome
                  : 'Usuário'}
        </strong>
            <span>{usuario ? usuario.email : 'Usuário conectado'}</span>
          </div>
        </div>
      </aside>

      <main className="conteudo">
        <header className="cabecalho">
          <div>
            <span className="subtitulo">VISÃO GERAL</span>
            <h1>Dashboard</h1>
            <p>Bem-vindo à sua plataforma de gestão acadêmica.</p>
          </div>

          <div className="status">
            <span className="status-ponto"></span>
            Sistema conectado
          </div>
        </header>

        <section className="boas-vindas">
          <div>
            <span>PLATAFORMA ACADÊMICA</span>
            <h2>Transformando ideias em projetos.</h2>
            <p>
              Gerencie projetos, acompanhe avaliações e organize
              suas bancas em um só lugar.
            </p>
          </div>

          <div className="ilustracao">🎓</div>
        </section>

        <section className="indicadores">

          <article
            className="cartao"
            onClick={() => navigate('/projetos')}
            role="button"
            tabIndex={0}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault()
                navigate('/projetos')
              }
            }}
            title="Ver projetos cadastrados"
          >
            <div className="cartao-topo">
              <span>Projetos</span>
              <span className="icone roxo">▣</span>
            </div>

            <strong>{totalProjetos}</strong>
            <p>Projetos cadastrados</p>
          </article>
          <article className="cartao">
            <div className="cartao-topo">
              <span>Bancas</span>
              <span className="icone azul">♧</span>
            </div>
            <strong>{totalBancas}</strong>
            <p>Bancas organizadas</p>
          </article>



<article
    className="cartao"
    onClick={() => navigate('/bancas')}
    role="button"
    tabIndex={0}
    onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault()
            navigate('/bancas')
        }
    }}
    title="Consultar bancas"
>
    <div className="cartao-topo">
        <span>Consultar bancas</span>
        <span className="icone azul">♧</span>
    </div>

    <strong>{totalBancas}</strong>
    <p>Bancas cadastradas na plataforma</p>
</article>

<article
    className="cartao"
    onClick={() => navigate('/bancas')}
    role="button"
    tabIndex={0}
    onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault()
            navigate('/bancas')
        }
    }}
    title="Consultar ranking das bancas"
>
    <div className="cartao-topo">
        <span>Ranking</span>
        <span className="icone roxo">♜</span>
    </div>

    <strong>{totalProjetosRanqueados}</strong>
    <p>Projetos no ranking</p>
</article>


        </section>

      
<section className="painel-inferior">
  <div>
    <h3>Seu espaço de trabalho</h3>

    <p>
      Aqui vamos apresentar os projetos recentes e as
      próximas avaliações conforme integrarmos a API.
    </p>

{perfilUsuario === 'aluno' && (
    <div>
        <h3>Meus resultados</h3>

        {erroProjetosAluno && (
            <p role="alert">{erroProjetosAluno}</p>
        )}

        {!erroProjetosAluno && meusProjetos.length === 0 && (
            <p>
                Nenhum projeto associado a uma banca foi encontrado.
            </p>
        )}

        {meusProjetos.map((projeto) => (
            <article
                className="cartao"
                key={`${projeto.banca_id}-${projeto.projeto_id}`}
            >
                <h4>{projeto.projeto_titulo}</h4>

                <p>
                    <strong>Banca:</strong> {projeto.banca_nome}
                </p>

                <p>
                    <strong>Status:</strong> {projeto.banca_status}
                </p>

                {projeto.banca_status === 'publicada' ? (
                    <button
                        className="botao-voltar"
                        onClick={() =>
                            navigate(
                                `/bancas/${projeto.banca_id}/projetos/${projeto.projeto_id}/resultado`
                            )
                        }
                    >
                        Consultar resultado
                    </button>
                ) : (
                    <p>O resultado ainda não foi publicado.</p>
                )}
            </article>
        ))}
    </div>
)}
  </div>

  <span className="etiqueta">EM DESENVOLVIMENTO</span>
</section>

      </main>
    </div>
  )
}

export default Dashboard
