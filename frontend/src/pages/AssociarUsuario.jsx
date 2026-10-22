import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './AssociarUsuario.css'
import { buscarContextoInstituicao } from '../utils/instituicao'

const API = 'http://localhost:3000'

function AssociarUsuario() {
  const navigate = useNavigate()

  const [usuarios, setUsuarios] = useState([])
  const [usuarioId, setUsuarioId] = useState('')
  const [perfil, setPerfil] = useState('avaliador')
  const [perfilAtual, setPerfilAtual] = useState('')
  const [instituicaoId, setInstituicaoId] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)

const [vinculos, setVinculos] = useState([])
const [vinculoId, setVinculoId] = useState('')
const [modoEdicao, setModoEdicao] = useState(false)

  useEffect(() => {
    async function buscarDados() {
      try {
        const token = sessionStorage.getItem('token')

        if (!token) {
          navigate('/login', { replace: true })
          return
        }

        const contexto = await buscarContextoInstituicao(token)
        const vinculo = contexto.vinculo
        setInstituicaoId(contexto.instituicaoId)

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

        const respostaVinculos = await fetch(`${API}/vinculos/${contexto.instituicaoId}`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
})

const dadosVinculos = await respostaVinculos.json()

if (!respostaVinculos.ok) {
  throw new Error(
    dadosVinculos.erro || 'Não foi possível carregar os vínculos.'
  )
}

setVinculos(dadosVinculos)
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

    // Se já existe vínculo, atualiza o perfil.
    // Caso contrário, cria uma nova associação.
    const url = modoEdicao
        ? `${API}/vinculos/${instituicaoId}/${vinculoId}/perfil`
        : `${API}/vinculos/${instituicaoId}/associar`

    const metodo = modoEdicao ? 'PATCH' : 'POST'

    const corpo = modoEdicao
      ? { perfil }
      : {
          usuario_id: Number(usuarioId),
          perfil
        }

    const resposta = await fetch(url, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(corpo)
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      throw new Error(
        dados.erro || 'Não foi possível salvar a associação.'
      )
    }

    const usuarioSelecionado = usuarios.find(
      (usuario) => Number(usuario.id) === Number(usuarioId)
    )

    if (modoEdicao) {
      setVinculos((lista) =>
        lista.map((item) =>
          Number(item.id) === Number(vinculoId)
            ? { ...item, perfil: dados.vinculo.perfil }
            : item
        )
      )

      setMensagem(
        `Perfil de ${usuarioSelecionado?.nome ?? 'usuário'} atualizado para ${perfil}.`
      )
    } else {
      setVinculos((lista) => [...lista, dados.vinculo])

      setMensagem(
        `${usuarioSelecionado?.nome ?? 'Usuário'} foi associado como ${perfil}.`
      )
    }

    setUsuarioId('')
    setVinculoId('')
    setModoEdicao(false)
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
  onChange={(event) => {
    const idSelecionado = event.target.value
    setUsuarioId(idSelecionado)

    const vinculoExistente = vinculos.find(
      (item) => Number(item.usuario_id) === Number(idSelecionado)
    )

    if (vinculoExistente) {
      setVinculoId(String(vinculoExistente.id))
      setModoEdicao(true)
      setPerfil(vinculoExistente.perfil)
    } else {
      setVinculoId('')
      setModoEdicao(false)
      setPerfil('avaliador')
    }
  }}
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
                {enviando
                    ? 'Salvando...'
                    : modoEdicao
                    ? 'Atualizar perfil'
                    : 'Associar usuário'}
                </button>
            </form>
          )}
        </section>
      </section>
    </main>
  )
}

export default AssociarUsuario
