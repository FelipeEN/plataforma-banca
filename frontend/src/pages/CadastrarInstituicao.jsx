import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './CadastrarInstituicao.css'
import API_URL from '../api.js'

function CadastrarInstituicao() {
  const navigate = useNavigate()

  const [nomeInstituicao, setNomeInstituicao] = useState('')
  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mensagem, setMensagem] = useState('')

async function cadastrarInstituicao(event) {
  event.preventDefault()
  setMensagem('')

  if (senha !== confirmarSenha) {
    setMensagem('As senhas não coincidem.')
    return
  }

  if (senha.length < 8) {
    setMensagem('A senha deve ter pelo menos 8 caracteres.')
    return
  }

  try {
    const resposta = await fetch(
      `${API_URL}/instituicoes/cadastrar`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nomeInstituicao,
          nomeResponsavel,
          email,
          senha
        })
      }
    )

    const dados = await resposta.json()

    if (!resposta.ok) {
      setMensagem(dados.erro || 'Não foi possível cadastrar a instituição.')
      return
    }

    setMensagem('Instituição cadastrada com sucesso! Você já pode entrar.')

    setNomeInstituicao('')
    setNomeResponsavel('')
    setEmail('')
    setSenha('')
    setConfirmarSenha('')

  } catch (erro) {
    console.error('Erro ao cadastrar instituição:', erro)
    setMensagem('Não foi possível conectar à API. Verifique se o backend está funcionando.')
  }
}
  return (
    <main className="cadastro-instituicao">
      <section className="cadastro-instituicao-apresentacao">
        <Link to="/login" className="cadastro-instituicao-marca">
          <strong>EstudaNet</strong>
          <span>Gestão de projetos acadêmicos</span>
        </Link>

        <div>
          <span>FAÇA PARTE DA PLATAFORMA</span>
          <h1>Transforme ideias em projetos acadêmicos.</h1>
          <p>
            Cadastre sua instituição para organizar projetos,
            conectar avaliadores e acompanhar resultados.
          </p>
        </div>
      </section>

      <section className="cadastro-instituicao-formulario-area">
        <form
          className="cadastro-instituicao-formulario"
          onSubmit={cadastrarInstituicao}
        >
          <div>
            <span>CADASTRO INSTITUCIONAL</span>
            <h2>Cadastre sua instituição</h2>
            <p>Você poderá administrar a instituição após concluir o cadastro.</p>
          </div>

          <label htmlFor="nomeInstituicao">Nome da instituição</label>
          <input
            id="nomeInstituicao"
            value={nomeInstituicao}
            onChange={(event) => setNomeInstituicao(event.target.value)}
            placeholder="Ex.: Universidade de Teste"
            required
          />

          <label htmlFor="nomeResponsavel">Nome do administrador</label>
          <input
            id="nomeResponsavel"
            value={nomeResponsavel}
            onChange={(event) => setNomeResponsavel(event.target.value)}
            placeholder="Seu nome completo"
            autoComplete="name"
            required
          />

          <label htmlFor="emailInstituicao">E-mail do administrador</label>
          <input
            id="emailInstituicao"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            required
          />

          <label htmlFor="senhaInstituicao">Senha</label>
          <input
            id="senhaInstituicao"
            type="password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <label htmlFor="confirmarSenha">Confirmar senha</label>
          <input
            id="confirmarSenha"
            type="password"
            value={confirmarSenha}
            onChange={(event) => setConfirmarSenha(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />

          {mensagem && (
            <p className="cadastro-instituicao-mensagem" role="alert">
              {mensagem}
            </p>
          )}

          <button type="submit">
            Continuar cadastro
          </button>

          <p>
            Já tem uma conta? <Link to="/login">Entrar</Link>
          </p>
        </form>
      </section>
    </main>
  )
}

export default CadastrarInstituicao