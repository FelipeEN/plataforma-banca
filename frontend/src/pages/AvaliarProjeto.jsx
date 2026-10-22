import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { buscarContextoInstituicao } from '../utils/instituicao'
import API_URL from '../api.js'

function AvaliarProjeto() {
    const { bancaId, projetoId } = useParams()
    const navigate = useNavigate()

    const [banca, setBanca] = useState(null)
    const [projeto, setProjeto] = useState(null)
    const [criterios, setCriterios] = useState([])

    const [notas, setNotas] = useState({})
    const [comentario, setComentario] = useState('')

    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

    const [enviando, setEnviando] = useState(false)
    const [mensagem, setMensagem] = useState('')

const totalCriterios = criterios.length

        const criteriosPreenchidos = criterios.filter((criterio) => {
            const nota = notas[criterio.id]

            return (
                nota !== undefined &&
                nota !== '' &&
                Number.isFinite(Number(nota)) &&
                Number(nota) >= 0 &&
                Number(nota) <= Number(criterio.nota_maxima)
            )
        }).length

        const progresso = totalCriterios > 0
            ? (criteriosPreenchidos / totalCriterios) * 100
            : 0
    
    useEffect(() => {
        async function carregarDados() {
            try {
                const token = sessionStorage.getItem('token')
                const { instituicaoId } = await buscarContextoInstituicao(token)

                const respostaBanca = await fetch(
                    `${API_URL}/bancas/${instituicaoId}/${bancaId}/projetos`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                const dadosBanca = await respostaBanca.json()

                if (!respostaBanca.ok) {
                    throw new Error(
                        dadosBanca.erro || 'Não foi possível carregar a banca.'
                    )
                }

                setBanca(dadosBanca.banca)

                const projetoEncontrado = dadosBanca.projetos.find(
                    (item) => Number(item.id) === Number(projetoId)
                )

                if (!projetoEncontrado) {
                    throw new Error(
                        'Este projeto não está associado à banca selecionada.'
                    )
                }

                setProjeto(projetoEncontrado)

                const respostaCriterios = await fetch(
                    `${API_URL}/bancas/${instituicaoId}/${bancaId}/criterios`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                const dadosCriterios = await respostaCriterios.json()

                if (!respostaCriterios.ok) {
                    throw new Error(
                        dadosCriterios.erro || 'Não foi possível carregar os critérios.'
                    )
                }

                setCriterios(dadosCriterios.criterios || [])
            } catch (erro) {
                setErro(erro.message)
            } finally {
                setCarregando(false)
            }
        }

        carregarDados()
    }, [bancaId, projetoId])


async function enviarAvaliacao() {
    setErro('')
    setMensagem('')

    if (criterios.length === 0) {
        setErro('Esta banca não possui critérios para avaliar.')
        return
    }

    const notasIncompletas = criterios.some((criterio) => {
        const nota = notas[criterio.id]

        return (
            nota === undefined ||
            nota === '' ||
            !Number.isFinite(Number(nota)) ||
            Number(nota) < 0 ||
            Number(nota) > Number(criterio.nota_maxima)
        )
    })

    if (notasIncompletas) {
        setErro('Preencha todas as notas dentro dos limites de cada critério.')
        return
    }

    try {
        setEnviando(true)

        const token = sessionStorage.getItem('token')
        const { instituicaoId } = await buscarContextoInstituicao(token)

        const resposta = await fetch(
            `${API_URL}/avaliacoes/${instituicaoId}/${bancaId}/${projetoId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    comentario,
                    notas: criterios.map((criterio) => ({
                        criterio_id: Number(criterio.id),
                        nota: Number(notas[criterio.id])
                    }))
                })
            }
        )

        const dados = await resposta.json()

        if (!resposta.ok) {
            throw new Error(
                dados.erro || dados.mensagem || 'Não foi possível enviar a avaliação.'
            )
        }

        const respostaFinalizacao = await fetch(
            `${API_URL}/avaliacoes/${instituicaoId}/${bancaId}/${projetoId}/finalizar`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        const dadosFinalizacao = await respostaFinalizacao.json()

        if (!respostaFinalizacao.ok) {
            throw new Error(
                dadosFinalizacao.erro ||
                dadosFinalizacao.mensagem ||
                'A avaliação foi registrada, mas não foi possível finalizá-la.'
            )
        }

        setMensagem('Avaliação enviada e finalizada com sucesso!')
    } catch (erro) {
        setErro(erro.message)
    } finally {
        setEnviando(false)
    }
}

    if (carregando) {
        return <main className="pagina-projetos"><p>Carregando avaliação...</p></main>
    }



    return (
        <main className="pagina-projetos pagina-avaliar">
            <button
                className="botao-voltar"
                onClick={() => navigate(`/bancas/${bancaId}`)}
            >
                ← Voltar à banca
            </button>

            <header>
                <h1>Avaliar projeto</h1>
                <p><strong>Banca:</strong> {banca.nome}</p>
                <p><strong>Projeto:</strong> {projeto.titulo}</p>
            </header>

            <section className="detalhes-card">
                <h2>Critérios de avaliação</h2>

                {criterios.length === 0 ? (
                    <p>Esta banca ainda não possui critérios cadastrados.</p>
                ) : (
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

                                <label htmlFor={`nota-${criterio.id}`}>
                                    Sua nota (0 a {criterio.nota_maxima})
                                </label>

                                <input
                                    id={`nota-${criterio.id}`}
                                    type="number"
                                    min="0"
                                    max={criterio.nota_maxima}
                                    step="any"
                                    value={notas[criterio.id] ?? ''}
                                    onChange={(evento) => {
                                        setNotas((notasAtuais) => ({
                                            ...notasAtuais,
                                            [criterio.id]: evento.target.value
                                        }))
                                    }}
                                    required
                                />
                            </article>
                        ))}
                    </div>
                )}
            </section>

    
<section className="detalhes-card">
    <h2>Critérios de avaliação</h2>

    <div className="progresso-avaliacao">
        <div className="progresso-informacoes">
            <span>Critérios preenchidos</span>
            <strong>
                {criteriosPreenchidos} de {totalCriterios}
            </strong>
        </div>

        <div
            className="progresso-trilho"
            role="progressbar"
            aria-label="Progresso do preenchimento dos critérios"
            aria-valuemin={0}
            aria-valuemax={totalCriterios}
            aria-valuenow={criteriosPreenchidos}
        >
            <div
                className="progresso-preenchimento"
                style={{ width: `${progresso}%` }}
            />
        </div>

        <p>
            {criteriosPreenchidos === totalCriterios && totalCriterios > 0
                ? 'Todos os critérios estão preenchidos!'
                : `Você preencheu ${Math.round(progresso)}% da avaliação.`}
        </p>
    </div>


                            <label htmlFor="comentario">
                                Observações sobre o projeto
                            </label>

                            <textarea
                                id="comentario"
                                rows="5"
                                placeholder="Descreva os pontos positivos e o que pode ser melhorado..."
                                value={comentario}
                                onChange={(evento) => {
                                    setComentario(evento.target.value)
                                }}
                            />
                        </section>

                        <div className="acoes-avaliacao">
                            <button
                                type="button"
                                className="botao-principal"
                                onClick={enviarAvaliacao}
                                disabled={enviando}
                            >
                                {enviando ? 'Enviando avaliação...' : 'Enviar avaliação'}
                            </button>

                                {mensagem && (
                                    <div className="mensagem-avaliacao mensagem-sucesso" role="status">
                                        <strong>✓ Avaliação concluída</strong>
                                        <p>{mensagem}</p>
                                    </div>
                                )}

                                {erro && (
                                    <div className="mensagem-avaliacao mensagem-erro" role="alert">
                                        <strong>Não foi possível concluir</strong>
                                        <p>{erro}</p>
                                    </div>
                                )}
                        </div>
        </main>
    )
}

export default AvaliarProjeto