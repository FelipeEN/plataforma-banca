import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './AssociarUsuario.css'
import { buscarContextoInstituicao } from '../utils/instituicao'
import API_URL from '../api.js'

function AssociarUsuario() {
  const navigate = useNavigate()

  const [usuarios, setUsuarios] = useState([])
  const [usuariosGerenciados, setUsuariosGerenciados] = useState([])
  const [emailCandidato, setEmailCandidato] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [perfil, setPerfil] = useState('avaliador')
  const [perfilAtual, setPerfilAtual] = useState('')
  const [instituicaoId, setInstituicaoId] = useState(null)
  const [idUsuarioAutenticado, setIdUsuarioAutenticado] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [mensagemExclusao, setMensagemExclusao] = useState('')
  const [erroExclusao, setErroExclusao] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [buscandoCandidato, setBuscandoCandidato] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [usuariosExcluindo, setUsuariosExcluindo] = useState([])
  const exclusoesEmAndamento = useRef(new Set())

const [vinculos, setVinculos] = useState([])
const [vinculoId, setVinculoId] = useState('')
const [statusVinculoCandidato, setStatusVinculoCandidato] = useState('')
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
        const usuarioIdAutenticado = Number(contexto.usuario?.id)
        setInstituicaoId(contexto.instituicaoId)
        if (
          Number.isSafeInteger(usuarioIdAutenticado) &&
          usuarioIdAutenticado > 0
        ) {
          setIdUsuarioAutenticado(usuarioIdAutenticado)
        }

        if (
          !vinculo ||
          !['admin', 'coordenador'].includes(vinculo.perfil)
        ) {
          setErro('Você não tem permissão para associar usuários.')
          return
        }

        setPerfilAtual(vinculo.perfil)

        const respostaUsuariosGerenciados = await fetch(
          `${API_URL}/usuarios/${contexto.instituicaoId}/gerenciar`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )
        const dadosUsuariosGerenciados =
          await respostaUsuariosGerenciados.json()

        if (!respostaUsuariosGerenciados.ok) {
          throw new Error(
            dadosUsuariosGerenciados.erro ||
              'Não foi possível carregar os usuários desta instituição.'
          )
        }

        setUsuariosGerenciados(dadosUsuariosGerenciados)

        const respostaVinculos = await fetch(`${API_URL}/vinculos/${contexto.instituicaoId}`, {
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

async function buscarCandidato(event) {
  event.preventDefault()
  setMensagem('')
  setErro('')

  const email = emailCandidato.trim()

  if (!email) {
    setErro('Informe o e-mail da conta que deseja associar.')
    return
  }

  const token = sessionStorage.getItem('token')

  if (!token) {
    setErro('Sua sessão expirou. Entre novamente para continuar.')
    navigate('/login', { replace: true })
    return
  }

  try {
    setBuscandoCandidato(true)
    setUsuarios([])
    setUsuarioId('')
    setVinculoId('')
    setStatusVinculoCandidato('')
    setModoEdicao(false)

    const resposta = await fetch(
      `${API_URL}/usuarios/${instituicaoId}/candidatos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      }
    )
    const dados = await resposta.json()

    if (!resposta.ok) {
      if (resposta.status === 401) {
        sessionStorage.removeItem('token')
        navigate('/login', { replace: true })
        return
      }

      throw new Error(
        dados.erro || 'Não foi possível buscar uma conta com esse e-mail.'
      )
    }

    setUsuarios([dados])
    setUsuarioId(String(dados.id))

    const vinculoExistente = vinculos.find(
      (item) => Number(item.usuario_id) === Number(dados.id)
    )

    setStatusVinculoCandidato(vinculoExistente?.status || '')

    if (vinculoExistente && perfilAtual === 'admin') {
      setVinculoId(String(vinculoExistente.id))
      setModoEdicao(vinculoExistente.status === 'aprovado')
      setPerfil(vinculoExistente.perfil)
    } else {
      setVinculoId('')
      setModoEdicao(false)
      if (!vinculoExistente) {
        setPerfil('avaliador')
      } else {
        setPerfil(vinculoExistente.perfil)
      }
    }
  } catch (error) {
    setErro(
      error instanceof TypeError
        ? 'Não foi possível conectar à API.'
        : error instanceof Error
          ? error.message
          : 'Não foi possível buscar uma conta.'
    )
  } finally {
    setBuscandoCandidato(false)
  }
}

async function excluirVinculo(usuario) {
  const vinculoIdParaExcluir = Number(usuario.vinculo_id)
  const usuarioIdParaExcluir = Number(usuario.id)

  if (
    !['admin', 'coordenador'].includes(perfilAtual) ||
    !Number.isSafeInteger(vinculoIdParaExcluir) ||
    vinculoIdParaExcluir <= 0 ||
    !Number.isSafeInteger(usuarioIdParaExcluir) ||
    usuarioIdParaExcluir <= 0 ||
    idUsuarioAutenticado === null ||
    usuarioIdParaExcluir === idUsuarioAutenticado ||
    exclusoesEmAndamento.current.has(vinculoIdParaExcluir)
  ) {
    return
  }

  const confirmado = window.confirm(
    `Remover ${usuario.nome} desta instituição? A conta global, o histórico acadêmico e os vínculos com outras instituições serão preservados.`
  )

  if (!confirmado) {
    return
  }

  exclusoesEmAndamento.current.add(vinculoIdParaExcluir)
  setUsuariosExcluindo((ids) => [...ids, vinculoIdParaExcluir])
  setMensagemExclusao('')
  setErroExclusao('')

  try {
    const token = sessionStorage.getItem('token')

    if (!token) {
      setErroExclusao('Sua sessão expirou. Entre novamente para continuar.')
      navigate('/login', { replace: true })
      return
    }

    const resposta = await fetch(
      `${API_URL}/vinculos/${instituicaoId}/${vinculoIdParaExcluir}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: ['Bearer', token].join(' ')
        }
      }
    )
    const dados = await resposta.json()

    if (!resposta.ok) {
      if (resposta.status === 401) {
        sessionStorage.removeItem('token')
        navigate('/login', { replace: true })
        return
      }

      if (resposta.status === 400) {
        throw new Error(dados.erro || 'O ID do vínculo é inválido.')
      }

      if (resposta.status === 403) {
        throw new Error(
          dados.erro || 'Você não tem permissão para remover este vínculo.'
        )
      }

      if (resposta.status === 404) {
        throw new Error(dados.erro || 'Vínculo não encontrado nesta instituição.')
      }

      if (resposta.status === 409) {
        throw new Error(dados.erro || 'Não foi possível remover este vínculo.')
      }

      if (resposta.status === 500) {
        throw new Error(
          dados.erro || 'O servidor não conseguiu remover o vínculo.'
        )
      }

      throw new Error(
        dados.erro || 'Não foi possível remover o vínculo.'
      )
    }

    setUsuariosGerenciados((lista) =>
      lista.filter(
        (item) => Number(item.vinculo_id) !== vinculoIdParaExcluir
      )
    )
    setVinculos((lista) =>
      lista.filter((item) => Number(item.id) !== vinculoIdParaExcluir)
    )

    if (Number(usuarioId) === usuarioIdParaExcluir) {
      setUsuarioId('')
      setVinculoId('')
      setStatusVinculoCandidato('')
      setModoEdicao(false)
      setPerfil('avaliador')
    }

    setMensagemExclusao(
      dados.mensagem ||
        `O vínculo de ${usuario.nome} com esta instituição foi removido. A conta e o histórico foram preservados.`
    )
  } catch (error) {
    setErroExclusao(
      error instanceof TypeError
        ? 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
        : error instanceof Error
          ? error.message
          : 'Não foi possível remover o vínculo.'
    )
  } finally {
    exclusoesEmAndamento.current.delete(vinculoIdParaExcluir)
    setUsuariosExcluindo((ids) =>
      ids.filter((id) => id !== vinculoIdParaExcluir)
    )
  }
}

async function associarUsuario(event) {
  event.preventDefault()
  setMensagem('')
  setErro('')

  if (!usuarioId || !perfil) {
    setErro('Selecione um usuário e um perfil.')
    return
  }

  const vinculoExistente = vinculos.some(
    (item) => Number(item.usuario_id) === Number(usuarioId)
  )
  const dadosVinculoExistente = vinculos.find(
    (item) => Number(item.usuario_id) === Number(usuarioId)
  )

  if (vinculoExistente && perfilAtual !== 'admin') {
    setErro(
      'Somente administradores podem aprovar, reativar ou atualizar vínculos existentes.'
    )
    return
  }

  const reativandoRejeitado =
    dadosVinculoExistente?.status === 'rejeitado'

  if (
    reativandoRejeitado &&
    !window.confirm(
      'Reativar o vínculo rejeitado nesta instituição com o perfil selecionado?'
    )
  ) {
    return
  }

  try {
    setEnviando(true)

    const token = sessionStorage.getItem('token')

    const aprovandoOuReativando =
      ['pendente', 'rejeitado'].includes(dadosVinculoExistente?.status)
    const url = aprovandoOuReativando
      ? `${API_URL}/vinculos/${instituicaoId}/${vinculoId}/aprovar`
      : modoEdicao
        ? `${API_URL}/vinculos/${instituicaoId}/${vinculoId}/perfil`
        : `${API_URL}/vinculos/${instituicaoId}/associar`

    const metodo = modoEdicao || aprovandoOuReativando ? 'PATCH' : 'POST'

    const corpo = modoEdicao || aprovandoOuReativando
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
    const vinculoSalvo = dados.vinculo || dados

    if (modoEdicao || aprovandoOuReativando) {
      setVinculos((lista) =>
        lista.map((item) =>
          Number(item.id) === Number(vinculoId)
            ? {
                ...item,
                perfil: vinculoSalvo.perfil,
                status: vinculoSalvo.status
              }
            : item
        )
      )

      setMensagem(
        dadosVinculoExistente?.status === 'rejeitado'
          ? `Vínculo de ${usuarioSelecionado?.nome ?? 'usuário'} reativado como ${perfil}.`
          : dadosVinculoExistente?.status === 'pendente'
            ? `Vínculo de ${usuarioSelecionado?.nome ?? 'usuário'} aprovado como ${perfil}.`
            : `Perfil de ${usuarioSelecionado?.nome ?? 'usuário'} atualizado para ${perfil}.`
      )
    } else {
      setVinculos((lista) => [...lista, dados.vinculo])

      setMensagem(
        `${usuarioSelecionado?.nome ?? 'Usuário'} foi associado como ${perfil}.`
      )
    }

    setUsuarios([])
    setEmailCandidato('')
    setUsuarioId('')
    setVinculoId('')
    setStatusVinculoCandidato('')
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
            <>
              <form onSubmit={buscarCandidato}>
                <div className="campo-associar">
                  <label htmlFor="emailCandidato">
                    Buscar conta pelo e-mail
                  </label>
                  <input
                    id="emailCandidato"
                    type="email"
                    value={emailCandidato}
                    onChange={(event) =>
                      setEmailCandidato(event.target.value)
                    }
                    autoComplete="email"
                    maxLength={255}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="botao-confirmar-associacao"
                  disabled={buscandoCandidato}
                >
                  {buscandoCandidato ? 'Buscando...' : 'Buscar conta'}
                </button>
              </form>

              {usuarios.length === 0 ? (
                <small>
                  Informe o e-mail de uma conta existente para associar ou
                  atualizar o perfil institucional.
                </small>
              ) : perfilAtual !== 'admin' &&
                vinculos.some(
                  (item) => Number(item.usuario_id) === Number(usuarioId)
                ) ? (
                <p role="status">
                  Esta conta já possui vínculo com a instituição. A aprovação,
                  reativação ou atualização do perfil cabe somente a um
                  administrador.
                </p>
              ) : (
                <form onSubmit={associarUsuario}>
                  {statusVinculoCandidato === 'pendente' && (
                    <p role="status">
                      Esta conta tem um vínculo pendente. Ao continuar, o
                      administrador aprovará esse vínculo com o perfil
                      selecionado.
                    </p>
                  )}
                  {statusVinculoCandidato === 'rejeitado' && (
                    <p role="status">
                      Esta conta tem um vínculo rejeitado. O administrador
                      poderá reativar o mesmo vínculo com o perfil selecionado.
                    </p>
                  )}
                  <div className="campo-associar">
                    <label htmlFor="usuarioId">Usuário</label>
                    <select
                      id="usuarioId"
                      value={usuarioId}
                      onChange={(event) => {
                        const idSelecionado = event.target.value
                        setUsuarioId(idSelecionado)

                        const vinculoExistente = vinculos.find(
                          (item) =>
                            Number(item.usuario_id) ===
                            Number(idSelecionado)
                        )

                        if (vinculoExistente) {
                          setVinculoId(String(vinculoExistente.id))
                          setStatusVinculoCandidato(vinculoExistente.status)
                          setModoEdicao(
                            perfilAtual === 'admin' &&
                              vinculoExistente.status === 'aprovado'
                          )
                          setPerfil(vinculoExistente.perfil)
                        } else {
                          setVinculoId('')
                          setStatusVinculoCandidato('')
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
                        : statusVinculoCandidato === 'pendente'
                          ? 'Aprovar vínculo'
                          : statusVinculoCandidato === 'rejeitado'
                            ? 'Reativar vínculo'
                        : 'Associar usuário'}
                  </button>
                </form>
              )}
            </>
          )}
        </section>

        {['admin', 'coordenador'].includes(perfilAtual) && (
          <section className="cartao-gerenciar-usuarios">
            <h2>Gerenciar usuários</h2>
            <p>
              Remova o vínculo com esta instituição. A conta global e o
              histórico acadêmico serão preservados.
            </p>

            {mensagemExclusao && (
              <p className="aviso-associar sucesso" role="status">
                {mensagemExclusao}
              </p>
            )}

            {erroExclusao && (
              <p className="aviso-associar falha" role="alert">
                {erroExclusao}
              </p>
            )}

            {carregando ? (
              <p role="status">Carregando lista de usuários...</p>
            ) : usuariosGerenciados.length === 0 ? (
              <p role="status">
                Não há usuários com vínculo aprovado nesta instituição.
              </p>
            ) : (
              <ul className="lista-gerenciar-usuarios">
                {usuariosGerenciados.map((usuario) => {
                  const usuarioIdAtual = Number(usuario.id)
                  const vinculoIdAtual = Number(usuario.vinculo_id)
                  const ehContaAtual =
                    idUsuarioAutenticado !== null &&
                    usuarioIdAtual === idUsuarioAutenticado
                  const excluindo =
                    usuariosExcluindo.includes(vinculoIdAtual)

                  return (
                    <li
                      className="item-gerenciar-usuario"
                      key={usuario.id}
                    >
                      <div className="dados-gerenciar-usuario">
                        <strong>{usuario.nome}</strong>
                        <span>{usuario.email}</span>
                      </div>

                      {ehContaAtual ? (
                        <span className="identificacao-conta-atual">
                          Conta atual
                        </span>
                      ) : idUsuarioAutenticado !== null ? (
                        <button
                          className="botao-excluir-usuario"
                          type="button"
                          aria-label={`Remover vínculo de ${usuario.nome}`}
                          onClick={() => excluirVinculo(usuario)}
                          disabled={excluindo}
                        >
                          {excluindo ? 'Removendo...' : 'Remover vínculo'}
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}
      </section>
    </main>
  )
}

export default AssociarUsuario
