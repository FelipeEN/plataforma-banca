import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './AssociarUsuario.css'

const API = 'http://localhost:3000'
const INSTITUICAO_ID = 1

function AssociarUsuario() {
  const navigate = useNavigate()

  const [usuarios, setUsuarios] = useState([])
  const [usuarioId, setUsuarioId] = useState('')
  const [perfil, setPerfil] = useState('avaliador')
  const [perfilAtual, setPerfilAtual] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    async function buscarDados() {
      try {
        const token = sessionStorage.getItem('token')

        if (!token) {
          navigate('/login', { replace: true })
          return
        }

        const respostaUsuario = await fetch(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const dadosUsuario = await respostaUsuario.json()

        if (!respostaUsuario.ok) {
          throw new Error(
            dadosUsuario.erro || 'Não foi possível validar o usuário.'
          )
        }

        const usuarioLogado = dadosUsuario.usuario

        const vinculo = usuarioLogado?.vinculos?.find(
          (item) =>
            Number(item.instituicao_id) === INSTITUICAO_ID &&
            item.status === 'aprovado'
        )

        if (
          !vinculo ||
          !['admin', 'coordenador'].includes(vinculo.perfil)
        ) {
          setErro('Você não tem permissão para associar usuários.')
          return
        }

        setPerfilAtual(vinculo.perfil)

        const respostaUsuarios = await fetch(`${API}/usuarios`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const dadosUsuarios = await respostaUsuarios.json()

        if (!respostaUsuarios.ok) {
          throw new Error(
            dadosUsuarios.erro || 'Não foi possível carregar os usuários.'
          )
        }

        setUsuarios(dadosUsuarios)
      } catch (error) {
        setErro(
          error.message === 'Failed to fetch'
            ? 'Não foi possível conectar à API.'
            : error.message
        )
      } finally {
        setCarregando(false)
      }
    }

    buscarDados()
  }, [navigate])

  async function associarUsuario(event) {
    event.preventDefault()
    setMensagem('')
    setErro('')

    if (!usuarioId || !perfil) {
      setErro('Selecione um usuário e um perfil.')
      return
    }

    try {
      setEnviando(true)

      const token = sessionStorage.getItem('token')

      const resposta = await fetch(
        `${API}/vinculos/${INSTITUICAO_ID}/associar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            usuario_id: Number(usuarioId),
            perfil
          })
        }
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível associar o usuário.'
        )
      }

      const usuarioAssociado = usuarios.find(
        (usuario) => Number(usuario.id) === Number(usuarioId)
      )

      setMensagem(
        `${usuarioAssociado?.nome ?? 'Usuário'} foi associado como ${perfil}.`
      )

      setUsuarios((lista) =>
        lista.filter((usuario) => Number(usuario.id) !== Number(usuarioId))
      )

      setUsuarioId('')
      setPerfil('avaliador')
    } catch (error) {
      setErro(
        error.message === 'Failed to fetch'
          ? 'Não foi possível conectar à API.'
          : error.message
      )
    } finally {
      setEnviando(false)
    }
  }

  const perfisDisponiveis =
    perfilAtual === 'admin'
      ? [
          { valor: 'aluno', texto: 'Aluno' },
          { valor: 'orientador', texto: 'Orientador' },
          { valor: 'avaliador', texto: 'Avaliador' },
          { valor: 'coordenador', texto: 'Coordenador' },
          { valor: 'admin', texto: 'Administrador' }
        ]
      : [
          { valor: 'aluno', texto: 'Aluno' },
          { valor: 'orientador', texto: 'Orientador' },
          { valor: 'avaliador', texto: 'Avaliador' }
        ]

  return (
    <main className="pagina-associar">
      <header className="cabecalho-associar">
        <Link to="/dashboard" className="marca-associar">
          <strong>Acadêmica</strong>
          <small>Gestão de projetos</small>
        </Link>

        <button
          type="button"
          className="botao-voltar-associar"
          onClick={() => navigate('/dashboard')}
        >
          ← Voltar ao dashboard
        </button>
      </header>

      <section className="conteudo-associar">
        <span className="etiqueta-associar">
          GESTÃO DE USUÁRIOS
        </span>

        <h1>Associar usuário</h1>

        <p>
          Escolha uma conta cadastrada e defina o perfil dela
          na instituição.
        </p>

        <section className="cartao-associar">
          <h2>Dados da associação</h2>

          {mensagem && (
            <p className="aviso-associar sucesso" role="status">
              ✓ {mensagem}
            </p>
          )}

          {erro && (
            <p className="aviso-associar falha" role="alert">
              {erro}
            </p>
          )}

          {carregando ? (
            <p>Carregando usuários...</p>
          ) : (
            <form onSubmit={associarUsuario}>
              <div className="campo-associar">
                <label htmlFor="usuarioId">Usuário</label>

                <select
                  id="usuarioId"
                  value={usuarioId}
                  onChange={(event) => setUsuarioId(event.target.value)}
                  required
                >
                  <option value="">Selecione um usuário</option>

                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nome} — {usuario.email}
                    </option>
                  ))}
                </select>

                {usuarios.length === 0 && (
                  <small>
                    Não há contas disponíveis para associar.
                  </small>
                )}
              </div>

              <div className="campo-associar">
                <label htmlFor="perfil">Perfil institucional</label>

                <select
                  id="perfil"
                  value={perfil}
                  onChange={(event) => setPerfil(event.target.value)}
                  required
                >
                  {perfisDisponiveis.map((item) => (
                    <option key={item.valor} value={item.valor}>
                      {item.texto}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="botao-confirmar-associacao"
                disabled={enviando || usuarios.length === 0}
              >
                {enviando ? 'Associando...' : 'Associar usuário'}
              </button>
            </form>
          )}
        </section>
      </section>
    </main>
  )
}

export default AssociarUsuario
