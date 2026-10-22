
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import '../App.css'
import { buscarContextoInstituicao } from '../utils/instituicao'
import API_URL from '../api.js'

function DetalhesProjeto() {
    const { projetoId } = useParams()
    const navigate = useNavigate()

    const [projeto, setProjeto] = useState(null)
    const [membros, setMembros] = useState([])

    // Estados para editar as informações do projeto
    const [editando, setEditando] = useState(false)
    const [tituloEditado, setTituloEditado] = useState('')
    const [descricaoEditada, setDescricaoEditada] = useState('')
    const [salvandoEdicao, setSalvandoEdicao] = useState(false)
    const [mensagemEdicao, setMensagemEdicao] = useState('')
    const [erroEdicao, setErroEdicao] = useState('')

    const [orientadores, setOrientadores] = useState([])
    const [orientadorSelecionado, setOrientadorSelecionado] = useState('')
    const [perfil, setPerfil] = useState('')
    const [instituicaoId, setInstituicaoId] = useState(null)
    const [carregandoOrientadores, setCarregandoOrientadores] = useState(false)
    const [associando, setAssociando] = useState(false)
    const [mensagem, setMensagem] = useState('')
    const [erroAssociacao, setErroAssociacao] = useState('')

    const [carregando, setCarregando] = useState(true)
    const [carregandoMembros, setCarregandoMembros] = useState(true)

    const [erro, setErro] = useState('')
    const [erroMembros, setErroMembros] = useState('')

    const [alunos, setAlunos] = useState([])
    const [alunoSelecionado, setAlunoSelecionado] = useState('')
    const [carregandoAlunos, setCarregandoAlunos] = useState(false)
    const [associandoAluno, setAssociandoAluno] = useState(false)
    const [mensagemAluno, setMensagemAluno] = useState('')
    const [erroAssociacaoAluno, setErroAssociacaoAluno] = useState('')


    const [removendoUsuarioId, setRemovendoUsuarioId] = useState(null)
    const [mensagemRemocao, setMensagemRemocao] = useState('')
    const [erroRemocao, setErroRemocao] = useState('')


    
    useEffect(() => {
    async function buscarPerfil() {
        const token = sessionStorage.getItem('token')

        try {
            const contexto = await buscarContextoInstituicao(token)
            setInstituicaoId(contexto.instituicaoId)
            setPerfil(contexto.vinculo.perfil)
        } catch (erro) {
            console.error('Erro ao buscar perfil:', erro.message)
            setPerfil('')
        }
    }

    buscarPerfil()
}, [navigate])

useEffect(() => {
    if (
        !instituicaoId ||
        (perfil !== 'admin' && perfil !== 'coordenador')
    ) {
        return
    }

    async function buscarOrientadores() {
        const token = sessionStorage.getItem('token')

        setCarregandoOrientadores(true)
        setErroAssociacao('')

        try {
            const resposta = await fetch(
                `${API_URL}/usuarios/orientadores/${instituicaoId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            if (resposta.status === 401) {
                sessionStorage.removeItem('token')
                navigate('/login')
                return
            }

            const dados = await resposta.json()

            if (!resposta.ok) {
                throw new Error(
                    dados.erro || 'Não foi possível carregar os orientadores.'
                )
            }

            setOrientadores(Array.isArray(dados) ? dados : [])
        } catch (erro) {
            setErroAssociacao(erro.message)
        } finally {
            setCarregandoOrientadores(false)
        }
    }

        buscarOrientadores()
    }, [perfil, instituicaoId, navigate])

    useEffect(() => {
    if (
        !instituicaoId ||
        (perfil !== 'admin' && perfil !== 'coordenador')
    ) {
        return
    }

    async function buscarAlunos() {
        try {
            setCarregandoAlunos(true)

            const token = sessionStorage.getItem('token')

            const resposta = await fetch(
                `${API_URL}/usuarios/alunos/${instituicaoId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            if (!resposta.ok) {
                throw new Error('Não foi possível carregar os alunos.')
            }

            const dados = await resposta.json()
            setAlunos(dados)
        } catch (erro) {
            setErroAssociacaoAluno(erro.message)
        } finally {
            setCarregandoAlunos(false)
        }
    }

    buscarAlunos()
}, [perfil, instituicaoId])


    useEffect(() => {
        async function buscarProjeto() {
            const token = sessionStorage.getItem('token')

            try {
                const contexto = await buscarContextoInstituicao(token)
                const instituicaoId = contexto.instituicaoId
                const resposta = await fetch(
                    `${API_URL}/projetos/${instituicaoId}/${projetoId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                if (resposta.status === 401) {
                    sessionStorage.removeItem('token')
                    navigate('/login')
                    return
                }

                const dados = await resposta.json()

                if (!resposta.ok) {
                    throw new Error(
                        dados.mensagem || 'Não foi possível carregar o projeto.'
                    )
                }

                setProjeto(dados.projeto)
            } catch (erro) {
                setErro(erro.message || 'Erro ao carregar o projeto.')
            } finally {
                setCarregando(false)
            }
        }

        buscarProjeto()
    }, [projetoId, navigate])

    useEffect(() => {
        async function buscarMembros() {
            const token = sessionStorage.getItem('token')

            try {
                const contexto = await buscarContextoInstituicao(token)
                const instituicaoId = contexto.instituicaoId
                const resposta = await fetch(
                    `${API_URL}/projetos/${instituicaoId}/${projetoId}/membros`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                if (resposta.status === 401) {
                    sessionStorage.removeItem('token')
                    navigate('/login')
                    return
                }

                const dados = await resposta.json()

                if (!resposta.ok) {
                    throw new Error(
                        dados.mensagem || 'Não foi possível carregar os integrantes.'
                    )
                }

                setMembros(Array.isArray(dados) ? dados : dados.membros || [])
            } catch (erro) {
                setErroMembros(
                    erro.message || 'Erro ao carregar os integrantes.'
                )
            } finally {
                setCarregandoMembros(false)
            }
        }

        buscarMembros()
    }, [projetoId, navigate])

    async function associarOrientador() {
    if (!orientadorSelecionado) {
        setErroAssociacao('Selecione um orientador.')
        return
    }

    const token = sessionStorage.getItem('token')

    setAssociando(true)
    setErroAssociacao('')
    setMensagem('')

    try {
        const resposta = await fetch(
            `${API_URL}/projetos/${instituicaoId}/${projetoId}/orientadores`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuario_id: Number(orientadorSelecionado)
                })
            }
        )

        if (resposta.status === 401) {
            sessionStorage.removeItem('token')
            navigate('/login')
            return
        }

        const dados = await resposta.json()

        if (!resposta.ok) {
            throw new Error(
                dados.erro ||
                dados.mensagem ||
                'Não foi possível associar o orientador.'
            )
        }

        setMensagem('Orientador associado com sucesso!')
        setOrientadorSelecionado('')

        // Atualiza a lista de integrantes do projeto.
        const respostaMembros = await fetch(
            `${API_URL}/projetos/${instituicaoId}/${projetoId}/membros`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        const dadosMembros = await respostaMembros.json()

        if (respostaMembros.ok) {
            setMembros(
                Array.isArray(dadosMembros)
                    ? dadosMembros
                    : dadosMembros.membros || []
            )
        }
    } catch (erro) {
        setErroAssociacao(erro.message)
    } finally {
        setAssociando(false)
    }
}

async function associarAluno() {
    if (!alunoSelecionado) {
        setErroAssociacaoAluno('Selecione um aluno.')
        return
    }

    const token = sessionStorage.getItem('token')

    setAssociandoAluno(true)
    setErroAssociacaoAluno('')
    setMensagemAluno('')

    try {
        const resposta = await fetch(
            `${API_URL}/projetos/${instituicaoId}/${projetoId}/alunos`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuario_id: Number(alunoSelecionado)
                })
            }
        )

        if (resposta.status === 401) {
            sessionStorage.removeItem('token')
            navigate('/login')
            return
        }

        const dados = await resposta.json()

        if (!resposta.ok) {
            throw new Error(
                dados.erro ||
                'Não foi possível associar o aluno ao projeto.'
            )
        }

        setMensagemAluno('Aluno associado com sucesso!')
        setAlunoSelecionado('')

        const respostaMembros = await fetch(
            `${API_URL}/projetos/${instituicaoId}/${projetoId}/membros`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        const dadosMembros = await respostaMembros.json()

        if (respostaMembros.ok) {
            setMembros(
                Array.isArray(dadosMembros)
                    ? dadosMembros
                    : dadosMembros.membros || []
            )
        }
    } catch (erro) {
        setErroAssociacaoAluno(erro.message)
    } finally {
        setAssociandoAluno(false)
    }
}

async function removerIntegrante(usuarioId) {
    const confirmar = window.confirm(
        'Tem certeza que deseja remover este integrante do projeto?'
    )

    if (!confirmar) {
        return
    }

    setRemovendoUsuarioId(usuarioId)
    setMensagemRemocao('')
    setErroRemocao('')

    try {

        const token = sessionStorage.getItem('token')

        const resposta = await fetch(
            `${API_URL}/projetos/${instituicaoId}/${projetoId}/membros/${usuarioId}`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        const dados = await resposta.json()

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível remover o integrante.'
            )
        }

        setMembros((membrosAtuais) =>
            membrosAtuais.filter(
                (membro) => membro.usuario_id !== usuarioId
            )
        )

        setMensagemRemocao(dados.mensagem)

    } catch (erro) {
        setErroRemocao(erro.message)
    } finally {
        setRemovendoUsuarioId(null)
    }
}


async function salvarEdicao() {
    const token = sessionStorage.getItem('token')

    setSalvandoEdicao(true)
    setMensagemEdicao('')
    setErroEdicao('')

    try {
        const resposta = await fetch(
            `${API_URL}/projetos/${instituicaoId}/${projetoId}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    titulo: tituloEditado,
                    descricao: descricaoEditada
                })
            }
        )

        const dados = await resposta.json()

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível editar o projeto.'
            )
        }

        setProjeto(dados.projeto)
        setMensagemEdicao(dados.mensagem)
        setEditando(false)

    } catch (erro) {
        setErroEdicao(erro.message)
    } finally {
        setSalvandoEdicao(false)
    }
}
    if (carregando) {
        return <p>Carregando projeto...</p>
    }

    

    if (erro) {
        return (
            <main className="detalhes-projeto">
                <p>{erro}</p>
                <button
                    className="botao-voltar"
                    onClick={() => navigate('/projetos')}
                >
                    Voltar para projetos
                </button>
            </main>
        )
    }

    if (!projeto) {
        return <p>Projeto não encontrado.</p>
    }

    function formatarStatus(status) {
        const statusLegiveis = {
            rascunho: 'Rascunho',
            submetido: 'Submetido',
            em_avaliacao: 'Em avaliação',
            avaliado: 'Avaliado',
            arquivado: 'Arquivado'
        }

        return statusLegiveis[status] || status
    }

    function formatarData(data) {
        if (!data) return 'Data não disponível'

        return new Date(data).toLocaleString('pt-BR')
    }

    return (
        <main className="detalhes-projeto">
            <button
                className="botao-voltar"
                onClick={() => navigate('/projetos')}
            >
                ← Voltar para projetos
            </button>

            <header className="detalhes-cabecalho">
                <p>Detalhes do projeto</p>

                <h1>{projeto.titulo}</h1>

                <span className={`projeto-status status-${projeto.status}`}>
                    {formatarStatus(projeto.status)}
                </span>

                {['admin', 'coordenador'].includes(perfil) && (
                    <button
                           className="botao-editar-projeto"
                        type="button"
                        onClick={() => {
                            setTituloEditado(projeto.titulo || '')
                            setDescricaoEditada(projeto.descricao || '')
                            setMensagemEdicao('')
                            setErroEdicao('')
                            setEditando(true)
                        }}
                    >
                        Editar projeto
                    </button>
                )}

                {perfil === 'avaliador' && (
                    <button
                        type="button"
                            className="botao-acessar-bancas"
                        onClick={() => navigate(`/bancas`)}
                    >
                        Acessar bancas para avaliar
                    </button>
                )}
            </header>
            {mensagemEdicao && (
            <p className="mensagem-sucesso">{mensagemEdicao}</p>
        )}

        {erroEdicao && (
            <p className="mensagem-erro">{erroEdicao}</p>
        )}
            {editando && (
                <section className="detalhes-card">
                    <h2>Editar informações do projeto</h2>

                    <form
                         className="formulario-edicao-projeto"
                        onSubmit={(e) => {
                            e.preventDefault()
                            salvarEdicao()
                        }}
                    >
                        <div className="detalhes-campo">
                            <label htmlFor="tituloEditado">
                                Título do projeto
                            </label>

                            <input
                                id="tituloEditado"
                                type="text"
                                value={tituloEditado}
                                onChange={(e) => setTituloEditado(e.target.value)}
                                required
                            />
                        </div>

                        <div className="detalhes-campo">
                            <label htmlFor="descricaoEditada">
                                Descrição do projeto
                            </label>

                            <textarea
                                id="descricaoEditada"
                                value={descricaoEditada}
                                onChange={(e) => setDescricaoEditada(e.target.value)}
                                rows={4}
                            />
                        </div>
                        <div className="acoes-edicao-projeto">
                            <button
                            type="submit"
                            disabled={salvandoEdicao}
                            >
                            {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
                            </button>

                            <button
                            type="button"
                            onClick={() => setEditando(false)}
                            disabled={salvandoEdicao}
                            >
                            Cancelar
                            </button>
                        </div>
         
                    </form>

                </section>
            )}

            {(perfil === 'admin' || perfil === 'coordenador') && (
       <section className="detalhes-card">
            <h2>Adicionar orientador</h2>

            <p>
                Selecione um orientador para adicioná-lo à equipe deste projeto.
            </p>

            {carregandoOrientadores ? (
                <p>Carregando orientadores...</p>
            ) : (
            <div className="formulario-orientador">
                  <select
                      value={orientadorSelecionado}
                      onChange={(e) => setOrientadorSelecionado(e.target.value)}
                  >
                      <option value="">Selecione um orientador</option>

                      {orientadores
                          .filter((orientador) => {
                              return !membros.some((membro) => {
                                  return (
                                      Number(membro.usuario_id) === Number(orientador.id) &&
                                      membro.funcao === 'orientador'
                                  )
                              })
                          })
                          .map((orientador) => (
                              <option
                                  key={orientador.id}
                                  value={orientador.id}
                              >
                                  {orientador.nome} — {orientador.email}
                              </option>
                          ))}
                  </select>

                      <button
                          type="button"
                          onClick={associarOrientador}
                          disabled={associando || !orientadorSelecionado}
                      >
                          {associando
                              ? 'Adicionando...'
                              : 'Adicionar orientador'}
                      </button>
            </div>



                )}

                  {erroAssociacao && (
                      <p className="mensagem-erro">{erroAssociacao}</p>
                  )}

                  {mensagem && (
                      <p className="mensagem-sucesso">{mensagem}</p>
                  )}

                  {!carregandoOrientadores && orientadores.length === 0 && (
                      <p>Nenhum orientador disponível para esta instituição.</p>
                  )}
            </section>
          )}



          {(perfil === 'admin' || perfil === 'coordenador') && (
    <section className="detalhes-card">
        <h2>Adicionar aluno</h2>

        <p>
            Selecione um aluno para adicioná-lo à equipe deste projeto.
        </p>

        {carregandoAlunos ? (
            <p>Carregando alunos...</p>
        ) : (
            <form
                className="formulario-orientador"
                onSubmit={(e) => e.preventDefault()}
            >
                <select
                    value={alunoSelecionado}
                    onChange={(e) => setAlunoSelecionado(e.target.value)}
                >
                    <option value="">Selecione um aluno</option>

                    {alunos
                        .filter(
                            (aluno) =>
                                !membros.some(
                                    (membro) =>
                                        Number(membro.usuario_id) ===
                                            Number(aluno.id) &&
                                        membro.funcao === 'aluno'
                                )
                        )
                        .map((aluno) => (
                            <option key={aluno.id} value={aluno.id}>
                                {aluno.nome} — {aluno.email}
                            </option>
                        ))}
                </select>
                    <button
                        type="button"
                        onClick={associarAluno}
                        disabled={!alunoSelecionado || associandoAluno}
                    >
                        {associandoAluno
                            ? 'Adicionando...'
                            : 'Associar aluno'}
                    </button>
            </form>
        )}

        {erroAssociacaoAluno && (
            <p className="mensagem-erro">{erroAssociacaoAluno}</p>
        )}

        {mensagemAluno && (
            <p className="mensagem-sucesso">{mensagemAluno}</p>
        )}

        {!carregandoAlunos && alunos.length === 0 && !erroAssociacaoAluno && (
            <p>Nenhum aluno disponível nesta instituição.</p>
        )}
    </section>
)}
            <section className="detalhes-card">
                <h2>Informações do projeto</h2>

                <div className="detalhes-campo">
                    <strong>ID do projeto</strong>
                    <p>{projeto.id}</p>
                </div>

                <div className="detalhes-campo">
                    <strong>Descrição</strong>
                    <p>{projeto.descricao || 'Nenhuma descrição informada.'}</p>
                </div>

                <div className="detalhes-campo">
                    <strong>Criado em</strong>
                    <p>{formatarData(projeto.criado_em)}</p>
                </div>
            </section>

            <section className="detalhes-card">
                <h2>Integrantes da equipe</h2>

                {mensagemRemocao && (
    <p className="mensagem-sucesso">{mensagemRemocao}</p>
)}

{erroRemocao && (
    <p className="mensagem-erro">{erroRemocao}</p>
)}
                <p>Veja quem participa deste projeto e a função de cada integrante.</p>

                {carregandoMembros ? (
                    <p>Carregando integrantes...</p>
                ) : erroMembros ? (
                    <p>{erroMembros}</p>
                ) : membros.length === 0 ? (
                    <p>Nenhum integrante cadastrado neste projeto.</p>
                ) : (
                    <div className="lista-projetos">
                        {membros.map((membro) => (
                            <article
                                className="projeto-card"
                                key={membro.usuario_id}
                            >
                                <div className="projeto-card-topo">
                                    <div>
                                        <h3>{membro.nome}</h3>
                                        <p>{membro.email}</p>
                                    </div>
                                </div>

                                <div className="detalhes-campo">
                                    <strong>Função na equipe</strong>
                                    <p>{membro.funcao}</p>
                                </div>

                                {['admin', 'coordenador'].includes(perfil) && (
                                        <button
                                            type="button"
                                            className="botao-remover-integrante"
                                            onClick={() => removerIntegrante(membro.usuario_id)}
                                            disabled={removendoUsuarioId === membro.usuario_id}
                                        >
                                            {removendoUsuarioId === membro.usuario_id
                                                ? 'Removendo...'
                                                : 'Remover integrante'}
                                        </button>
                                )}
                            </article>
                            ))}
                        </div>
                )}
            </section>
        </main>
    )
}

export default DetalhesProjeto
