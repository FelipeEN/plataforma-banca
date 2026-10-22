import './ConsultaAvaliacoes.css'

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { buscarContextoInstituicao } from '../utils/instituicao'
function ConsultaAvaliacoes() {
    const { bancaId, projetoId } = useParams()
    const navigate = useNavigate()

    const [dados, setDados] = useState(null)
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

    useEffect(() => {
        async function buscarAvaliacoes() {
            try {
                const token = sessionStorage.getItem('token')
                const { instituicaoId } = await buscarContextoInstituicao(token)

                const resposta = await fetch(
                    `http://localhost:3000/avaliacoes/${instituicaoId}/${bancaId}/${projetoId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                const resultado = await resposta.json()

                if (!resposta.ok) {
                    throw new Error(
                        resultado.mensagem ||
                        resultado.erro ||
                        'Não foi possível consultar as avaliações.'
                    )
                }

                setDados(resultado)
            } catch (erro) {
                setErro(erro.message)
            } finally {
                setCarregando(false)
            }
        }

        buscarAvaliacoes()
    }, [bancaId, projetoId])

    if (carregando) {
        return <p>Carregando avaliações...</p>
    }

    if (erro) {
        return (
            <main>
                <p role="alert">{erro}</p>
                <button onClick={() => navigate(-1)}>
                    Voltar
                </button>
            </main>
        )
    }

   
return (
    <main className="consulta-avaliacoes">
        <div className="cabecalho-avaliacoes">
            <div>
                <button
                    className="botao-voltar"
                    onClick={() => navigate(-1)}
                >
                    ← Voltar
                </button>

                <h1>Consultar avaliações</h1>

                <p className="subtitulo-avaliacoes">
                    {dados?.banca?.nome || `Banca ${bancaId}`}
                </p>
            </div>
        </div>

        <section className="resumo-avaliacoes">
            <div>
                <p>Total de avaliações registradas</p>
                <span className="numero-avaliacoes">
                    {dados?.total_avaliacoes ?? 0}
                </span>
            </div>
        </section>

        {dados?.avaliacoes?.length > 0 ? (
            <div className="lista-avaliacoes">
                {dados.avaliacoes.map((avaliacao) => (
                    <section
                        key={avaliacao.id}
                        className="card-avaliacao"
                    >
                        <div className="topo-card-avaliacao">
                            <h3>Avaliação #{avaliacao.id}</h3>

                            <span
                                className={`status-avaliacao ${
                                    avaliacao.status === 'finalizada'
                                        ? 'status-finalizada'
                                        : 'status-rascunho'
                                }`}
                            >
                                {avaliacao.status}
                            </span>
                        </div>

                        <div className="informacoes-avaliacao">
                            <p>
                                <span className="rotulo-avaliacao">
                                    Avaliador
                                </span>
                                #{avaliacao.avaliador_id}
                            </p>

                            <p>
                                <span className="rotulo-avaliacao">
                                    Comentário
                                </span>
                                {avaliacao.comentario || 'Sem comentário.'}
                            </p>
                        </div>

                        <h4>Notas por critério</h4>

                        {avaliacao.notas?.length > 0 ? (
                            <ul className="lista-notas">
                                {avaliacao.notas.map((nota) => (
                                    <li
                                        key={nota.criterio_id}
                                        className="item-nota"
                                    >
                                        <span className="nome-criterio">
                                            {nota.criterio}
                                        </span>

                                        <div className="detalhes-nota">
                                            <span>
                                                Peso: {nota.peso}
                                            </span>

                                            <span className="valor-nota">
                                                {nota.nota ?? '—'}
                                                {' / '}
                                                {nota.nota_maxima}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>Nenhuma nota registrada.</p>
                        )}
                    </section>
                ))}
            </div>
        ) : (
            <div className="estado-vazio">
                Nenhuma avaliação encontrada para este projeto.
            </div>
        )}
    </main>
)

}

export default ConsultaAvaliacoes
