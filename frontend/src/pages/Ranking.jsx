
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { buscarContextoInstituicao } from '../utils/instituicao'
import API_URL from '../api.js'

function Ranking() {
    const { bancaId } = useParams()
    const navigate = useNavigate()

    const [banca, setBanca] = useState(null)
    const [ranking, setRanking] = useState([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

    useEffect(() => {
        async function buscarRanking() {
            try {
                const token = sessionStorage.getItem('token')
                const { instituicaoId } = await buscarContextoInstituicao(token)

                const resposta = await fetch(
                    `${API_URL}/avaliacoes/${instituicaoId}/${bancaId}/ranking`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                const dados = await resposta.json()

                if (!resposta.ok) {
                    throw new Error(
                        dados.erro ||
                        'Não foi possível carregar o ranking.'
                    )
                }

                setBanca(dados.banca)
                setRanking(
                    Array.isArray(dados.ranking)
                        ? dados.ranking
                        : []
                )
            } catch (erroBusca) {
                setErro(erroBusca.message)
            } finally {
                setCarregando(false)
            }
        }

        buscarRanking()
    }, [bancaId])

    return (
        <main className="pagina-projetos pagina-ranking">
            <button
                className="botao-voltar"
                type="button"
                onClick={() => navigate('/bancas')}
            >
                ← Voltar às bancas
            </button>

            <header>
                <h1>Ranking da banca</h1>
                <p>
                    Classificação dos projetos conforme
                    a média final das avaliações.
                </p>
            </header>

            <section className="detalhes-card">
                {carregando && (
                    <p>Carregando ranking...</p>
                )}

                {erro && (
                    <p role="alert">
                        Não foi possível carregar o ranking: {erro}
                    </p>
                )}

                {!carregando && !erro && banca && (
                    <>
                        <h2>{banca.nome}</h2>

                        <p>
                            <strong>Status da banca:</strong>{' '}
                            {banca.status}
                        </p>

                        {ranking.length === 0 ? (
                            <p>
                                Ainda não há projetos com todas
                                as avaliações finalizadas para
                                compor o ranking.
                            </p>
                        ) : (
                            <>
                                <p>
                                    Projetos classificados:{' '}
                                    <strong>{ranking.length}</strong>
                                </p>

                                <div className="tabela-responsiva">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Posição</th>
                                                <th>Projeto</th>
                                                <th>Avaliações</th>
                                                <th>Média final</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {ranking.map((projeto) => (
                                                <tr key={projeto.projeto_id}>
                                                    <td>
                                                        <strong>
                                                            {projeto.posicao}º
                                                        </strong>
                                                    </td>

                                                    <td>{projeto.titulo}</td>

                                                    <td>
                                                        {projeto.total_avaliacoes}
                                                    </td>

                                                    <td>
                                                        {Number(
                                                            projeto.media_final
                                                        ).toLocaleString(
                                                            'pt-BR',
                                                            {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            }
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </>
                )}
            </section>
        </main>
    )
}

export default Ranking
