
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Bancas() {
    const navigate = useNavigate()

    const [bancas, setBancas] = useState([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

const [usuario, setUsuario] = useState(null)

const perfilUsuario = usuario?.vinculos?.find(
    (vinculo) =>
        vinculo.instituicao_id === 1 &&
        vinculo.status === 'aprovado'
)?.perfil

    const [nomeNovaBanca, setNomeNovaBanca] = useState('')
    const [salvandoBanca, setSalvandoBanca] = useState(false)
const [encerrandoBancaId, setEncerrandoBancaId] = useState(null)


    useEffect(() => {
        async function buscarBancas() {
            try {
                const token = sessionStorage.getItem('token')

                const respostaUsuario = await fetch(
    'http://localhost:3000/auth/me',
    {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
)

const dadosUsuario = await respostaUsuario.json()

if (!respostaUsuario.ok) {
    throw new Error(
        dadosUsuario.erro || 'Não foi possível carregar o usuário.'
    )
}

setUsuario(dadosUsuario.usuario)
                const resposta = await fetch(
                    'http://localhost:3000/bancas/1',
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

                setBancas(dados)
            } catch (erro) {
                setErro(erro.message)
            } finally {
                setCarregando(false)
            }
        }

        buscarBancas()
    }, [])

    async function abrirBanca(bancaId) {
    try {
        const token = sessionStorage.getItem('token')

        const resposta = await fetch(
            `http://localhost:3000/bancas/1/${bancaId}/abrir`,
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

        const resposta = await fetch(
            `http://localhost:3000/bancas/1/${bancaId}/encerrar`,
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


async function cadastrarBanca(evento) {
    evento.preventDefault()

    try {
        setSalvandoBanca(true)
        setErro('')

        const token = sessionStorage.getItem('token')

        const resposta = await fetch(
            'http://localhost:3000/bancas/1',
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
                                    banca.status === 'rascunho' && (
                                        <button
                                            type="button"
                                            onClick={() => abrirBanca(banca.id)}
                                        >
                                            Abrir banca
                                        </button>
                                    )}


                                    
                                {['admin', 'coordenador'].includes(perfilUsuario) &&
                                    banca.status === 'aberta' && (
                                        <button
                                            type="button"
                                            onClick={() => encerrarBanca(banca.id)}
                                            disabled={encerrandoBancaId === banca.id}
                                        >
                                            {encerrandoBancaId === banca.id
                                                ? 'Encerrando...'
                                                : 'Encerrar banca'}
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
