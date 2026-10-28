
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buscarContextoInstituicao } from '../utils/instituicao'
import API_URL from '../api.js'

function Bancas() {
    const navigate = useNavigate()

    const [bancas, setBancas] = useState([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

const [usuario, setUsuario] = useState(null)
const [instituicaoId, setInstituicaoId] = useState(null)

const perfilUsuario = usuario?.vinculos?.find(
    (vinculo) =>
        Number(vinculo.instituicao_id) === instituicaoId &&
        vinculo.status === 'aprovado'
)?.perfil

    const [nomeNovaBanca, setNomeNovaBanca] = useState('')
    const [salvandoBanca, setSalvandoBanca] = useState(false)
const [encerrandoBancaId, setEncerrandoBancaId] = useState(null)


useEffect(() => {
    async function buscarBancas() {
        try {
            const token = sessionStorage.getItem('token')

            if (!token) {
                navigate('/login', { replace: true })
                return
            }

            const contexto = await buscarContextoInstituicao(token)
            const usuarioLogado = contexto.usuario
            setUsuario(usuarioLogado)
            const idInstituicao = contexto.instituicaoId
            setInstituicaoId(idInstituicao)

            // 3. Busca as bancas da instituição correta
            const resposta = await fetch(
                `${API_URL}/bancas/${idInstituicao}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            const dados = await resposta.json()

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

    async function abrirBanca(bancaId) {
    try {
        const token = sessionStorage.getItem('token')
        if (!instituicaoId) {
            throw new Error('Não foi possível identificar a instituição ativa.')
        }

        const resposta = await fetch(
    `${API_URL}/bancas/${instituicaoId}/${bancaId}/abrir`,
    {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
)
        const dados = await resposta.json()

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível abrir a banca.'
            )
        }

        setBancas((bancasAtuais) =>
            bancasAtuais.map((banca) =>
                banca.id === bancaId
                    ? { ...banca, status: dados.banca.status }
                    : banca
            )
        )
    } catch (erro) {
        setErro(erro.message)
    }
}



async function encerrarBanca(bancaId) {
    const confirmar = window.confirm(
        'Tem certeza de que deseja encerrar esta banca?'
    )

    if (!confirmar) return

    try {
        setEncerrandoBancaId(bancaId)

        const token = sessionStorage.getItem('token')
        if (!instituicaoId) {
            throw new Error('Não foi possível identificar a instituição ativa.')
        }

        const resposta = await fetch(
            `${API_URL}/bancas/${instituicaoId}/${bancaId}/encerrar`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        const dados = await resposta.json()

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível encerrar a banca.'
            )
        }

        setBancas((bancasAtuais) =>
            bancasAtuais.map((banca) =>
                banca.id === bancaId
                    ? { ...banca, status: dados.banca.status }
                    : banca
            )
        )

        window.alert('Banca encerrada com sucesso!')
    } catch (erro) {
        window.alert(erro.message)
    } finally {
        setEncerrandoBancaId(null)
    }
}


async function publicarBanca(bancaId) {
    const confirmar = window.confirm(
        'Deseja publicar os resultados desta banca?'
    )

    if (!confirmar) return

    try {
        setErro('')

        const token = sessionStorage.getItem('token')
        if (!instituicaoId) {
            throw new Error('Não foi possível identificar a instituição ativa.')
        }

        const resposta = await fetch(
            `${API_URL}/bancas/${instituicaoId}/${bancaId}/publicar`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        const dados = await resposta.json()

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível publicar os resultados.'
            )
        }

        setBancas((bancasAtuais) =>
            bancasAtuais.map((banca) =>
                banca.id === bancaId
                    ? { ...banca, status: dados.banca.status }
                    : banca
            )
        )

        window.alert('Resultados publicados com sucesso!')
    } catch (erro) {
        window.alert(erro.message)
    }
}


async function cadastrarBanca(evento) {
    evento.preventDefault()

    try {
        setSalvandoBanca(true)
        setErro('')

        const token = sessionStorage.getItem('token')
        if (!instituicaoId) {
            throw new Error('Não foi possível identificar a instituição ativa.')
        }

        const resposta = await fetch(
            `${API_URL}/bancas/${instituicaoId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    nome: nomeNovaBanca
                })
            }
        )

        const dados = await resposta.json()

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível cadastrar a banca.'
            )
        }

        setBancas((bancasAtuais) => [
            dados.banca,
            ...bancasAtuais
        ])

        setNomeNovaBanca('')
    } catch (erro) {
        setErro(erro.message)
    } finally {
        setSalvandoBanca(false)
    }
}

    return (
        <main className="pagina-projetos">
            <button
                className="botao-voltar"
                onClick={() => navigate('/dashboard')}
            >
                ← Voltar ao dashboard
            </button>
            <header>
                <h1>Bancas de Avaliação</h1>

                {perfilUsuario === 'avaliador' ? (
                    <p>
                        Consulte as bancas e encontre os projetos disponíveis
                        para suas avaliações.
                    </p>
                ) : (
                    <p>
                        Consulte as bancas e acompanhe o status das avaliações.
                    </p>
                )}
            </header>

            <section className="detalhes-card">
                <h2>Minhas bancas</h2>

                {['admin', 'coordenador'].includes(perfilUsuario) && (
                    <form
                        onSubmit={cadastrarBanca}
                        className="formulario-banca"
                    >
                        <label htmlFor="nomeNovaBanca">
                            Nome da nova banca
                        </label>

                        <input
                            id="nomeNovaBanca"
                            type="text"
                            value={nomeNovaBanca}
                            onChange={(e) => setNomeNovaBanca(e.target.value)}
                            placeholder="Ex.: Banca de Projetos 2027"
                            required
                        />

                        <button type="submit" disabled={salvandoBanca}>
                            {salvandoBanca ? 'Cadastrando...' : 'Cadastrar banca'}
                        </button>
                    </form>
                )}

                {carregando && <p>Carregando bancas...</p>}

                {erro && <p role="alert">Erro: {erro}</p>}

                {!carregando && !erro && bancas.length === 0 && (
                    <p>Nenhuma banca cadastrada nesta instituição.</p>
                )}

                {!carregando && !erro && bancas.length > 0 && (
                    <div className="lista-bancas">
                        {bancas.map((banca) => (
                            <article
                                className="banca-card"
                                key={banca.id}
                            >
                                <h3>{banca.nome}</h3>

                              <p className="status-banca">
                                    <strong>Status:</strong>

                                    <span className={`status-badge status-${banca.status}`}>
                                        {banca.status === 'rascunho' && 'Em preparação'}
                                        {banca.status === 'aberta' && 'Aberta'}
                                        {banca.status === 'encerrada' && 'Encerrada'}
                                        {banca.status === 'publicada' && 'Resultados publicados'}

                                        {!['rascunho', 'aberta', 'encerrada', 'publicada'].includes(banca.status) &&
                                            banca.status}
                                    </span>
                                </p>

                                <p>
                                    <strong>Criada em:</strong>{' '}
                                    {new Date(
                                        banca.criada_em
                                    ).toLocaleDateString('pt-BR')}
                                </p>
                                    <button
                                        className="botao-gerenciar-banca"
                                        type="button"
                                        onClick={() => navigate(`/bancas/${banca.id}`)}
                                    >
                                        {banca.status === 'aberta'
                                            ? 'Acessar banca →'
                                            : banca.status === 'publicada'
                                                ? 'Ver resultados →'
                                                : banca.status === 'encerrada'
                                                    ? 'Consultar banca →'
                                                    : 'Gerenciar banca →'}
                                    </button>

                                    {['admin', 'coordenador'].includes(perfilUsuario) &&
                                            banca.status === 'publicada' && (
                                                <button
                                                   className="botao-ranking"
                                                type="button"
                                                onClick={() =>
                                                    navigate(`/bancas/${banca.id}/ranking`)
                                                }
                                                >
                                                Ver ranking →
                                             </button>
                                    )}
                                {['admin', 'coordenador'].includes(perfilUsuario) &&
                                    banca.status === 'rascunho' && (

                                        <button
                                            className="botao-abrir-banca"
                                            type="button"
                                            onClick={() => abrirBanca(banca.id)}
                                        >
                                            Abrir banca
                                        </button>
                                    )}


                                    
                                {['admin', 'coordenador'].includes(perfilUsuario) &&
                                    banca.status === 'aberta' && (
                                        <button
                                            className="botao-encerrar-banca"
                                            type="button"
                                            onClick={() => encerrarBanca(banca.id)}
                                            disabled={encerrandoBancaId === banca.id}
                                        >
                                            {encerrandoBancaId === banca.id
                                                ? 'Encerrando...'
                                                : 'Encerrar banca'}
                                        </button>
                                    )}
                                    
                                    {['admin', 'coordenador'].includes(perfilUsuario) &&
                                        banca.status === 'encerrada' && (
                                            <button
                                                    className="botao-publicar-banca"
                                                type="button"
                                                onClick={() => publicarBanca(banca.id)}
                                            >
                                                Publicar resultados
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

export default Bancas
