
import '../App.css'

import { useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'


function Dashboard() {

const navigate = useNavigate()

const [usuario, setUsuario] = useState(null)
const [carregando, setCarregando] = useState(true)

const perfilUsuario = usuario?.vinculos?.find(
    (vinculo) =>
        vinculo.instituicao_id === 1 &&
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

            const resposta = await fetch('http://localhost:3000/auth/me', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (resposta.status === 401) {
                sessionStorage.removeItem('token')
                navigate('/login', { replace: true })
                return
            }

            if (!resposta.ok) {
                throw new Error('Não foi possível buscar o usuário.')
            }

            const dados = await resposta.json()
            setUsuario(dados.usuario)

            console.log('Dados do usuário:', dados.usuario)

            const respostaProjetos = await fetch(
                'http://localhost:3000/projetos/1',
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
                'http://localhost:3000/bancas/1',
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
    'http://localhost:3000/avaliacoes/1/resumo',
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
              'http://localhost:3000/avaliacoes/1/ranking/resumo',
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
            ></article>

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
          ></article>
        </section>

        <section className="painel-inferior">
          <div>
            <h3>Seu espaço de trabalho</h3>
            <p>
              Aqui vamos apresentar os projetos recentes e as
              próximas avaliações conforme integrarmos a API.
            </p>
          </div>

          <span className="etiqueta">EM DESENVOLVIMENTO</span>
        </section>
      </main>
    </div>
  )
}

export default Dashboard
