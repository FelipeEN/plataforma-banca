
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

function DetalhesBanca() {
    const { bancaId } = useParams()
    const navigate = useNavigate()

    const [banca, setBanca] = useState(null)
    const [projetos, setProjetos] = useState([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

    const [perfilUsuario, setPerfilUsuario] = useState('')
    const [criterios, setCriterios] = useState([])
    const [carregandoCriterios, setCarregandoCriterios] = useState(true)
    const [erroCriterios, setErroCriterios] = useState('')


    const [nomeCriterio, setNomeCriterio] = useState('')
    const [pesoCriterio, setPesoCriterio] = useState('1')
    const [notaMaximaCriterio, setNotaMaximaCriterio] = useState('10')
    const [salvandoCriterio, setSalvandoCriterio] = useState(false)

    const [projetoSelecionado, setProjetoSelecionado] = useState('')

    const [projetosDisponiveis, setProjetosDisponiveis] = useState([])
    const [carregandoDisponiveis, setCarregandoDisponiveis] = useState(true)
    const [associandoProjeto, setAssociandoProjeto] = useState(false)


    const [avaliadores, setAvaliadores] = useState([])
    const [avaliadoresDisponiveis, setAvaliadoresDisponiveis] = useState([])
    const [carregandoAvaliadores, setCarregandoAvaliadores] = useState(true)
    const [erroAvaliadores, setErroAvaliadores] = useState('')
    const [avaliadorSelecionado, setAvaliadorSelecionado] = useState('')
    const [associandoAvaliador, setAssociandoAvaliador] = useState(false)

    async function adicionarProjeto() {
    if (!projetoSelecionado) {
        alert('Selecione um projeto primeiro.')
        return
    }

    try {
        setAssociandoProjeto(true)

        const token = sessionStorage.getItem('token')

        const resposta = await fetch(
            `http://localhost:3000/bancas/1/${bancaId}/projetos`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    projeto_id: Number(projetoSelecionado)
                })
            }
        )

        const dados = await resposta.json()

        
        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível associar o projeto.'
            )
        }

        alert('Projeto associado à banca com sucesso!')
        window.location.reload()
        } catch (erro) {
            alert(erro.message)
        } finally {
            setAssociandoProjeto(false)
        }
    }

    async function adicionarAvaliador() {
    if (!avaliadorSelecionado) {
        alert('Selecione um avaliador primeiro.')
        return
    }

    try {
        setAssociandoAvaliador(true)

        const token = sessionStorage.getItem('token')

        const resposta = await fetch(
            `http://localhost:3000/bancas/1/${bancaId}/avaliadores`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    usuario_id: Number(avaliadorSelecionado)
                })
            }
        )

        const dados = await resposta.json()

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível associar o avaliador.'
            )
        }

        alert('Avaliador associado à banca com sucesso!')
        window.location.reload()

    } catch (erro) {
        alert(erro.message)
    } finally {
        setAssociandoAvaliador(false)
    }
}

    async function cadastrarCriterio(evento) {
    evento.preventDefault()

    if (!nomeCriterio.trim()) {
        alert('Digite o nome do critério.')
        return
    }

    try {
        setSalvandoCriterio(true)

        const token = sessionStorage.getItem('token')

        const resposta = await fetch(
            `http://localhost:3000/bancas/1/${bancaId}/criterios`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    nome: nomeCriterio.trim(),
                    peso: Number(pesoCriterio),
                    nota_maxima: Number(notaMaximaCriterio)
                })
            }
        )

        const dados = await resposta.json()

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível cadastrar o critério.'
            )
        }

        alert('Critério cadastrado com sucesso!')

        setNomeCriterio('')
        setPesoCriterio('1')
        setNotaMaximaCriterio('10')

        const respostaCriterios = await fetch(
            `http://localhost:3000/bancas/1/${bancaId}/criterios`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        const dadosCriterios = await respostaCriterios.json()

        if (!respostaCriterios.ok) {
            throw new Error('Critério cadastrado, mas não foi possível atualizar a lista.')
        }

        setCriterios(dadosCriterios.criterios || [])
        setErroCriterios('')
    } catch (erro) {
        alert(erro.message)
    } finally {
        setSalvandoCriterio(false)
    }
}

useEffect(() => {
    async function buscarPerfilUsuario() {
        try {
            const token = sessionStorage.getItem('token')

            const resposta = await fetch(
                'http://localhost:3000/auth/me',
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            const dados = await resposta.json()
console.log('Status HTTP:', resposta.status)
console.log('Resposta completa de /auth/me:', dados)
console.log('Tipo da resposta:', typeof dados)
console.log('É um array?', Array.isArray(dados))
            if (!resposta.ok) {
                throw new Error(
                    'Não foi possível identificar o usuário.'
                )
            }
console.log('Vínculos recebidos:', dados.vinculos)

console.log(
    'Instituição do vínculo:',
    dados.vinculos?.[0]?.instituicao_id,
    typeof dados.vinculos?.[0]?.instituicao_id
)

console.log(
    'Status do vínculo:',
    dados.vinculos?.[0]?.status
)

const vinculo = dados.vinculos?.find(
    (item) =>
        Number(item.instituicao_id) === 1 &&
        item.status === 'aprovado'
)

console.log('Vínculo selecionado:', vinculo)

            console.log('Vínculo selecionado:', vinculo)

            const perfil = vinculo?.perfil || ''

            setPerfilUsuario(perfil)
        } catch (erro) {
            console.error('Erro ao buscar perfil:', erro.message)
        }
    }

    buscarPerfilUsuario()
}, [])

const podeGerenciarBanca = [
    'admin',
    'coordenador'
].includes(perfilUsuario)

console.log('Perfil atual:', perfilUsuario)
console.log('Pode gerenciar banca:', podeGerenciarBanca)

    useEffect(() => {
        async function buscarProjetos() {
            try {
                const token = sessionStorage.getItem('token')

                const resposta = await fetch(
                    `http://localhost:3000/bancas/1/${bancaId}/projetos`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                const dados = await resposta.json()

                if (!resposta.ok) {
                    throw new Error(
                        dados.erro || 'Não foi possível carregar os projetos.'
                    )
                }

                setBanca(dados.banca)
                setProjetos(dados.projetos)

                const respostaCriterios = await fetch(
                        `http://localhost:3000/bancas/1/${bancaId}/criterios`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    )

                    const dadosCriterios = await respostaCriterios.json()

                    if (!respostaCriterios.ok) {
                        setErroCriterios(
                            dadosCriterios.erro || 'Não foi possível carregar os critérios.'
                        )
                    } else {
                        setCriterios(dadosCriterios.criterios || [])
                    }
                    const respostaAvaliadores = await fetch(
                        `http://localhost:3000/bancas/1/${bancaId}/avaliadores`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    )

                const dadosAvaliadores = await respostaAvaliadores.json()

                if (!respostaAvaliadores.ok) {
                    setErroAvaliadores(
                        dadosAvaliadores.erro || 'Não foi possível carregar os avaliadores.'
                    )
                } else {
                    setAvaliadores(dadosAvaliadores.avaliadores || [])
                }


                    const respostaDisponiveis = await fetch(
    'http://localhost:3000/usuarios/avaliadores/1',
    {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
)

const dadosDisponiveis = await respostaDisponiveis.json()

if (!respostaDisponiveis.ok) {
    setErroAvaliadores(
        dadosDisponiveis.erro ||
        'Não foi possível carregar os avaliadores disponíveis.'
    )
} else {
    setAvaliadoresDisponiveis(dadosDisponiveis)
}
             const respostaProjetos = await fetch(
    'http://localhost:3000/projetos/1',
    {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
)

if (!respostaProjetos.ok) {
    throw new Error(
        'Não foi possível carregar os projetos disponíveis.'
    )
}

const dadosProjetos = await respostaProjetos.json()

setProjetosDisponiveis(
    dadosProjetos.projetos.filter(
        (projeto) =>
            !dados.projetos.some(
                (associado) => associado.id === projeto.id
            )
    )
)

 

            } catch (erro) {
                setErro(erro.message)
            } finally {
           setCarregando(false)
    setCarregandoCriterios(false)
    setCarregandoDisponiveis(false)
    setCarregandoAvaliadores(false)
            }
        }

        buscarProjetos()
    }, [bancaId])

    return (
        <main className="pagina-projetos">
            <button
                className="botao-voltar"
                onClick={() => navigate('/bancas')}
            >
                ← Voltar às bancas
            </button>

            <header>
                <h1>{banca ? banca.nome : 'Gerenciar banca'}</h1>

{banca && (
    <p className="status-banca">
        <strong>Status:</strong>

        <span className={`status-badge status-${banca.status}`}>
            {banca.status === 'rascunho' && 'Em preparação'}
            {banca.status === 'aberta' && 'Aberta para avaliações'}
            {banca.status === 'encerrada' && 'Avaliações encerradas'}
            {banca.status === 'publicada' && 'Resultados publicados'}

            {!['rascunho', 'aberta', 'encerrada', 'publicada'].includes(banca.status) &&
                banca.status}
        </span>
    </p>
)}
            </header>



                <section className="detalhes-card">
                    <h2>Critérios de avaliação</h2>
                    {podeGerenciarBanca && (
                        <form className="formulario-banca" onSubmit={cadastrarCriterio}>
                            <label htmlFor="nomeCriterio">Nome do critério</label>
                            <input
                                id="nomeCriterio"
                                type="text"
                                placeholder="Ex.: Inovação"
                                value={nomeCriterio}
                                onChange={(evento) => setNomeCriterio(evento.target.value)}
                                required
                            />

                            <label htmlFor="pesoCriterio">Peso do critério</label>
                            <input
                                id="pesoCriterio"
                                type="number"
                                min="1"
                                step="1"
                                value={pesoCriterio}
                                onChange={(evento) => setPesoCriterio(evento.target.value)}
                                required
                            />

                            <label htmlFor="notaMaximaCriterio">Nota máxima</label>
                            <input
                                id="notaMaximaCriterio"
                                type="number"
                                min="1"
                                step="any"
                                value={notaMaximaCriterio}
                                onChange={(evento) => setNotaMaximaCriterio(evento.target.value)}
                                required
                            />

                            <button type="submit" disabled={salvandoCriterio}>
                                {salvandoCriterio ? 'Salvando critério...' : 'Cadastrar critério'}
                            </button>
                        </form>
                        )}

                    {carregandoCriterios ? (
                        <p>Carregando critérios...</p>
                    ) : erroCriterios ? (
                        <p role="alert">Erro: {erroCriterios}</p>
                    ) : criterios.length === 0 ? (
                        <p>Nenhum critério cadastrado nesta banca.</p>
                    ) : (
                        <>
                            <p>Total de critérios: {criterios.length}</p>

                            <div className="lista-bancas">
                                {criterios.map((criterio) => (
                                    <article
                                        className="banca-card"
                                        key={criterio.id}
                                    >
                                        <h3>{criterio.nome}</h3>

                                        <p>
                                            <strong>Peso:</strong> {criterio.peso}
                                        </p>

                                        <p>
                                            <strong>Nota máxima:</strong>{' '}
                                            {criterio.nota_maxima}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </section>

                <section className="detalhes-card">
                        <h2>Avaliadores da banca</h2>

                        {erroAvaliadores && (
                            <p className="mensagem-erro">
                                {erroAvaliadores}
                            </p>
                        )}

                        {podeGerenciarBanca && (

                            <form
                                className="associar-projeto"
                                onSubmit={(evento) => {
                                    evento.preventDefault()
                                    adicionarAvaliador()
                                }}
                            >
                                <select
                                    value={avaliadorSelecionado}
                                    onChange={(evento) =>
                                        setAvaliadorSelecionado(evento.target.value)
                                    }
                                    disabled={carregandoAvaliadores || associandoAvaliador}
                                >
                                    <option value="">Selecione um avaliador</option>

                                    {avaliadoresDisponiveis
                                        .filter(
                                            (disponivel) =>
                                                !avaliadores.some(
                                                    (associado) =>
                                                        associado.usuario_id === disponivel.id
                                                )
                                        )
                                        .map((avaliador) => (
                                            <option
                                                key={avaliador.id}
                                                value={avaliador.id}
                                            >
                                                {avaliador.nome} — {avaliador.email}
                                            </option>
                                        ))}
                                </select>

                                <button
                                    type="submit"
                                    disabled={
                                        !avaliadorSelecionado ||
                                        carregandoAvaliadores ||
                                        associandoAvaliador
                                    }
                                >
                                    {associandoAvaliador
                                        ? 'Associando...'
                                        : 'Associar avaliador'}
                                </button>
                            </form>
                        )}

                        <h3>Avaliadores associados</h3>

                        {carregandoAvaliadores ? (
                            <p>Carregando avaliadores...</p>
                        ) : avaliadores.length === 0 ? (
                            <p>Nenhum avaliador associado a esta banca.</p>
                        ) : (
                            <div className="lista-bancas">
                                {avaliadores.map((avaliador) => (
                                    <div
                                        className="banca-card"
                                        key={avaliador.usuario_id}
                                    >
                                        <h3>{avaliador.nome}</h3>
                                        <p>{avaliador.email}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

            <section className="detalhes-card">
    <h2>Projetos associados</h2>

    {podeGerenciarBanca && (
        <>
            <div className="associar-projeto">
                <h3>Adicionar projeto à banca</h3>

                {carregandoDisponiveis ? (
                    <p>Carregando projetos disponíveis...</p>
                ) : projetosDisponiveis.length === 0 ? (
                    <p>
                        Não há projetos disponíveis para associar.
                    </p>
                ) : (
                    <select
                        value={projetoSelecionado}
                        onChange={(evento) =>
                            setProjetoSelecionado(evento.target.value)
                        }
                    >
                        <option value="">
                            Selecione um projeto
                        </option>

                        {projetosDisponiveis.map((projeto) => (
                            <option
                                key={projeto.id}
                                value={projeto.id}
                            >
                                #{projeto.id} — {projeto.titulo}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <button
                type="button"
                onClick={adicionarProjeto}
                disabled={
                    !projetoSelecionado ||
                    associandoProjeto
                }
            >
                {associandoProjeto
                    ? 'Adicionando projeto...'
                    : 'Adicionar projeto à banca'}
            </button>
        </>
    )}

    {carregando && <p>Carregando projetos...</p>}

    {erro && <p role="alert">Erro: {erro}</p>}

    {!carregando && !erro && projetos.length === 0 && (
        <p>
            Nenhum projeto está associado a esta banca.
        </p>
    )}

    {!carregando && !erro && projetos.length > 0 && (
        <>
            <p>Total de projetos: {projetos.length}</p>

            <div className="lista-bancas">
                {projetos.map((projeto) => (
                    <article
                        className="banca-card"
                        key={projeto.id}
                    >
                        <h3>{projeto.titulo}</h3>

                        <p>
                            <strong>Projeto:</strong> #{projeto.id}
                        </p>

                        <p>
                            <strong>Status:</strong> {projeto.status}
                        </p>

                        <p>
                            {projeto.descricao ||
                                'Sem descrição cadastrada.'}
                        </p>

                        <button
                            className="botao-detalhes-projeto"
                            type="button"
                            onClick={() =>
                                navigate(
                                    `/bancas/${bancaId}/projetos/${projeto.id}/avaliar`
                                )
                            }
                        >
                            Avaliar projeto →
                        </button>
                    </article>
                ))}
            </div>
        </>
    )}
</section>
        </main>
    )
}

export default DetalhesBanca
