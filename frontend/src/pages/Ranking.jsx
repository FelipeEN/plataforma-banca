
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { buscarContextoInstituicao } from '../utils/instituicao'
import API_URL from '../api.js'

function Ranking() {
    const { bancaId } = useParams()
    const navigate = useNavigate()

    const [banca, setBanca] = useState(null)
    const [ranking, setRanking] = useState([])
    const [totalProjetosRanqueados, setTotalProjetosRanqueados] = useState(0)
    const [nomeInstituicao, setNomeInstituicao] = useState('')
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')
    const [erroInstituicao, setErroInstituicao] = useState('')
    const [erroExportacao, setErroExportacao] = useState('')

    useEffect(() => {
        async function buscarRanking() {
            try {
                const token = sessionStorage.getItem('token')
                const { instituicaoId } = await buscarContextoInstituicao(token)

                try {
                    const respostaInstituicoes = await fetch(
                        `${API_URL}/instituicoes`
                    )
                    const instituicoes = await respostaInstituicoes.json()

                    if (!respostaInstituicoes.ok) {
                        throw new Error(
                            'Não foi possível carregar o nome da instituição.'
                        )
                    }

                    const instituicao = Array.isArray(instituicoes)
                        ? instituicoes.find(
                            (item) => Number(item.id) === instituicaoId
                        )
                        : null

                    if (!instituicao?.nome) {
                        throw new Error(
                            'Não foi possível identificar o nome da instituição.'
                        )
                    }

                    setNomeInstituicao(instituicao.nome)
                    setErroInstituicao('')
                } catch (erroBuscaInstituicao) {
                    setErroInstituicao(
                        erroBuscaInstituicao instanceof Error
                            ? erroBuscaInstituicao.message
                            : 'Não foi possível carregar o nome da instituição.'
                    )
                }

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
                const projetosRanqueados = Array.isArray(dados.ranking)
                    ? dados.ranking
                    : []
                setRanking(projetosRanqueados)
                setTotalProjetosRanqueados(
                    dados.total_projetos_ranqueados
                )
            } catch (erroBusca) {
                setErro(
                    erroBusca instanceof Error
                        ? erroBusca.message
                        : 'Não foi possível carregar o ranking.'
                )
            } finally {
                setCarregando(false)
            }
        }

        buscarRanking()
    }, [bancaId])

    async function baixarRankingPDF() {
        if (!banca || !ranking.length || !nomeInstituicao) {
            return
        }

        setErroExportacao('')

        try {
            const { jsPDF } = await import('jspdf')
            const documento = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            })
            const larguraPagina = documento.internal.pageSize.getWidth()
            const alturaPagina = documento.internal.pageSize.getHeight()
            const margem = 14
            const larguraConteudo = larguraPagina - margem * 2
            const colunas = [
                { titulo: 'Posição', largura: 22 },
                { titulo: 'Projeto', largura: 145 },
                { titulo: 'Total de avaliações', largura: 58 },
                { titulo: 'Média final', largura: 44 }
            ]
            const alturaCabecalhoTabela = 13
            const alturaRodape = 12
            let y

            function desenharCabecalho(primeiraPagina) {
                documento.setTextColor(44, 36, 41)
                documento.setFont('helvetica', 'bold')
                documento.setFontSize(primeiraPagina ? 17 : 12)
                documento.text(
                    'Ranking final da banca',
                    margem,
                    primeiraPagina ? 18 : 15
                )

                documento.setFont('helvetica', 'normal')
                documento.setFontSize(9)
                documento.text(
                    documento.splitTextToSize(
                        nomeInstituicao,
                        larguraConteudo
                    ),
                    margem,
                    primeiraPagina ? 25 : 21
                )

                if (primeiraPagina) {
                    const dataEmissao = new Intl.DateTimeFormat('pt-BR', {
                        dateStyle: 'long'
                    }).format(new Date())
                    const linhasBanca = documento.splitTextToSize(
                        `Banca: ${banca.nome} (ID: ${banca.id})`,
                        larguraConteudo
                    )
                    let yInformacoes = 34

                    documento.text(linhasBanca, margem, yInformacoes)
                    yInformacoes += linhasBanca.length * 4.5
                    documento.text(
                        `Status da banca: ${banca.status}`,
                        margem,
                        yInformacoes
                    )
                    yInformacoes += 4.5
                    documento.text(
                        `Data de emissão: ${dataEmissao}`,
                        margem,
                        yInformacoes
                    )
                    yInformacoes += 4.5
                    documento.text(
                        `Total de projetos ranqueados: ${totalProjetosRanqueados}`,
                        margem,
                        yInformacoes
                    )
                    y = yInformacoes + 8
                } else {
                    y = 29
                }

                desenharCabecalhoTabela()
            }

            function desenharCabecalhoTabela() {
                let x = margem
                documento.setFont('helvetica', 'bold')
                documento.setFontSize(8)
                documento.setTextColor(255, 255, 255)

                colunas.forEach((coluna) => {
                    documento.setFillColor(78, 57, 150)
                    documento.rect(
                        x,
                        y,
                        coluna.largura,
                        alturaCabecalhoTabela,
                        'F'
                    )
                    const linhas = documento.splitTextToSize(
                        coluna.titulo,
                        coluna.largura - 4
                    )
                    documento.text(linhas, x + 2, y + 5)
                    x += coluna.largura
                })

                y += alturaCabecalhoTabela
            }

            desenharCabecalho(true)

            ranking.forEach((projeto) => {
                const linhasTitulo = documento.splitTextToSize(
                    String(projeto.titulo),
                    colunas[1].largura - 4
                )
                const alturaLinha = Math.max(
                    10,
                    linhasTitulo.length * 4.5 + 4
                )

                if (y + alturaLinha > alturaPagina - margem - alturaRodape) {
                    documento.addPage()
                    desenharCabecalho(false)
                }

                const valores = [
                    `${projeto.posicao}º`,
                    linhasTitulo,
                    String(projeto.total_avaliacoes),
                    Number(projeto.media_final).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })
                ]
                let x = margem

                valores.forEach((valor, indice) => {
                    documento.setDrawColor(222, 218, 232)
                    documento.rect(
                        x,
                        y,
                        colunas[indice].largura,
                        alturaLinha
                    )
                    documento.setFont(
                        'helvetica',
                        indice === 0 ? 'bold' : 'normal'
                    )
                    documento.setFontSize(9)
                    documento.setTextColor(55, 49, 61)
                    documento.text(
                        Array.isArray(valor) ? valor : String(valor),
                        x + 2,
                        y + 5
                    )
                    x += colunas[indice].largura
                })

                y += alturaLinha
            })

            const totalPaginas = documento.internal.getNumberOfPages()

            for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
                documento.setPage(pagina)
                documento.setFont('helvetica', 'normal')
                documento.setFontSize(8)
                documento.setTextColor(100, 94, 108)
                documento.text(
                    `Página ${pagina} de ${totalPaginas}`,
                    larguraPagina - margem,
                    alturaPagina - 6,
                    { align: 'right' }
                )
            }

            documento.save(`ranking-banca-${banca.id}.pdf`)
        } catch (erro) {
            setErroExportacao(
                erro instanceof Error
                    ? erro.message
                    : 'Não foi possível gerar o PDF do ranking.'
            )
        }
    }

    const colocacoesPodio = [3, 2, 1]
        .map((posicao) => ({
            posicao,
            projetos: ranking.filter(
                (projeto) => Number(projeto.posicao) === posicao
            )
        }))
        .filter((colocacao) => colocacao.projetos.length > 0)

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
                <button
                    className="botao-exportar-ranking"
                    type="button"
                    onClick={baixarRankingPDF}
                    disabled={
                        carregando ||
                        ranking.length === 0 ||
                        !nomeInstituicao
                    }
                >
                    Baixar ranking em PDF
                </button>
            </header>

            {erroInstituicao && (
                <p className="mensagem-erro" role="alert">
                    {erroInstituicao} O PDF ficará indisponível até que
                    o nome da instituição seja carregado.
                </p>
            )}

            {erroExportacao && (
                <p className="mensagem-erro" role="alert">
                    Não foi possível gerar o PDF: {erroExportacao}
                </p>
            )}

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
                                    <strong>
                                        {totalProjetosRanqueados}
                                    </strong>
                                </p>

                                {colocacoesPodio.length > 0 && (
                                    <section
                                        className="podio-ranking"
                                        aria-label="Pódio dos projetos classificados"
                                    >
                                        <h3>Projetos em destaque</h3>
                                        <div className="podio-ranking-lugares">
                                            {colocacoesPodio.map((colocacao) => (
                                                <article
                                                    className={`podio-ranking-lugar podio-ranking-lugar-${colocacao.posicao}`}
                                                    key={colocacao.posicao}
                                                >
                                                    <span className="podio-ranking-medalha" aria-hidden="true">
                                                        {colocacao.posicao === 1 ? '🥇' : colocacao.posicao === 2 ? '🥈' : '🥉'}
                                                    </span>
                                                    <h4>
                                                        {colocacao.posicao}º lugar
                                                        {colocacao.posicao === 1 && ' — Ouro'}
                                                        {colocacao.posicao === 2 && ' — Prata'}
                                                        {colocacao.posicao === 3 && ' — Bronze'}
                                                    </h4>
                                                    {colocacao.projetos.length > 1 && (
                                                        <p className="podio-ranking-empate">
                                                            Empate nesta posição
                                                        </p>
                                                    )}
                                                    <ul>
                                                        {colocacao.projetos.map((projeto) => (
                                                            <li key={projeto.projeto_id}>
                                                                <strong>{projeto.titulo}</strong>
                                                                <span>
                                                                    Média:{' '}
                                                                    {Number(projeto.media_final).toLocaleString(
                                                                        'pt-BR',
                                                                        {
                                                                            minimumFractionDigits: 2,
                                                                            maximumFractionDigits: 2
                                                                        }
                                                                    )}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </article>
                                            ))}
                                        </div>
                                    </section>
                                )}

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
