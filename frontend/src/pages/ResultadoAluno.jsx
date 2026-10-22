
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import '../App.css'

function ResultadoAluno() {
    const { bancaId, projetoId } = useParams()
    const navigate = useNavigate()

    const [resultado, setResultado] = useState(null)
    const [banca, setBanca] = useState(null)
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

    useEffect(() => {
        async function buscarResultado() {
            try {
                const token = sessionStorage.getItem('token')

                const resposta = await fetch(
                    `http://localhost:3000/avaliacoes/1/${bancaId}/${projetoId}/resultado-aluno`,
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
                        dados.mensagem ||
                        'Não foi possível consultar o resultado.'
                    )
                }

                setBanca(dados.banca)
                setResultado(dados.resultado)
            } catch (erroBusca) {
                setErro(erroBusca.message)
            } finally {
                setCarregando(false)
            }
        }

        buscarResultado()
    }, [bancaId, projetoId])

    if (carregando) {
        return (
            <main className="pagina-projetos">
                <p>Carregando resultado...</p>
            </main>
        )
    }

    return (
        <main className="pagina-projetos">
            <button
                className="botao-voltar"
                onClick={() => navigate('/dashboard')}
            >
                ← Voltar ao dashboard
            </button>

            <header className="projetos-cabecalho">
                <div>
                    <span className="subtitulo">
                        RESULTADO DA AVALIAÇÃO
                    </span>
                    <h1>Meu resultado</h1>
                </div>
            </header>

            {erro ? (
                <section className="projetos-vazio">
                    <h2>Resultado indisponível</h2>
                    <p role="alert">{erro}</p>
                </section>
            ) : resultado ? (
                <section className="detalhes-card">
                    <h2>{resultado.titulo}</h2>

                    <p>
                        <strong>Banca:</strong> {banca?.nome}
                    </p>

                    <p>
                        <strong>Status da banca:</strong>{' '}
                        {banca?.status}
                    </p>

                    <p>
                        <strong>Média final:</strong>{' '}
                        {Number(resultado.media_final).toLocaleString(
                            'pt-BR',
                            {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }
                        )}
                    </p>

                    <p>
                        <strong>Total de avaliações:</strong>{' '}
                        {resultado.total_avaliacoes}
                    </p>

                    <p>
                        <strong>Posição no ranking:</strong>{' '}
                        {resultado.posicao != null
                            ? `${resultado.posicao}º lugar`
                            : 'Não informada'}
                    </p>
                </section>
            ) : (
                <section className="projetos-vazio">
                    <p>Não há resultado disponível.</p>
                </section>
            )}
        </main>
    )
}

export default ResultadoAluno
