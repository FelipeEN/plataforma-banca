import API_URL from '../api.js'

const INSTITUICAO_ATIVA_KEY = 'instituicaoAtivaId'

export async function buscarContextoInstituicao(token) {
  if (!token) {
    throw new Error('Token de autenticação não informado.')
  }

  const resposta = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  const dados = await resposta.json()

  if (!resposta.ok) {
    if (resposta.status === 401) {
      sessionStorage.removeItem('token')
      window.location.replace('/login')
    }

    throw new Error(dados.erro || 'Não foi possível identificar a instituição.')
  }

  const usuario = dados.usuario
  const vinculosAprovados = (usuario?.vinculos || []).filter(
    (vinculo) =>
      vinculo.status === 'aprovado' &&
      Number.isInteger(Number(vinculo.instituicao_id)) &&
      Number(vinculo.instituicao_id) > 0
  )
  const instituicaoSalva = Number(
    sessionStorage.getItem(INSTITUICAO_ATIVA_KEY)
  )
  const vinculoAtivo =
    vinculosAprovados.find(
      (vinculo) => Number(vinculo.instituicao_id) === instituicaoSalva
    ) || vinculosAprovados[0]

  if (!vinculoAtivo) {
    throw new Error('Você não possui vínculo aprovado com uma instituição.')
  }

  const instituicaoId = Number(vinculoAtivo.instituicao_id)
  sessionStorage.setItem(INSTITUICAO_ATIVA_KEY, String(instituicaoId))

  return {
    usuario,
    vinculo: vinculoAtivo,
    instituicaoId
  }
}
