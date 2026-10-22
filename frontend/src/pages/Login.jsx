import { useState } from 'react'
import './Login.css'
import { useNavigate } from 'react-router-dom'
import API_URL from '../api.js'



function Login() {


const [email, setEmail] = useState('')
const [senha, setSenha] = useState('')
const [mensagem, setMensagem] = useState('')
const [carregando, setCarregando] = useState(false)

const navigate = useNavigate()

async function fazerLogin(event) {
  event.preventDefault()

  setMensagem('')
  setCarregando(true)

  try {
    const resposta = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, senha }),
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      setMensagem(dados.erro || 'Não foi possível realizar o login.')
      return
    }

  if (!dados.token) {
    setMensagem('A API não retornou o token de autenticação.')
    return
  }

  sessionStorage.setItem('token', dados.token)

  navigate('/dashboard')
  } catch (erro) {
    console.error('Erro ao conectar com a API:', erro)
    setMensagem('Não foi possível conectar ao servidor.')
  } finally {
    setCarregando(false)
  }
}

  return (
    <main className="login-container">
      <section className="login-apresentacao">
        <div className="login-marca">
          <div className="login-logo">PA</div>
          <span>Plataforma Acadêmica</span>
        </div>

        <div className="login-mensagem">
          <span>GESTÃO ACADÊMICA INTELIGENTE</span>
          <h1>Suas ideias merecem um lugar para crescer.</h1>
          <p>
            Organize projetos, conecte pessoas e acompanhe
            avaliações em uma única plataforma.
          </p>
        </div>

        <p className="login-rodape">
          Um espaço para transformar conhecimento em projetos.
        </p>
      </section>

      <section className="login-formulario-area">
        <form className="login-formulario"  onSubmit={fazerLogin} >
          <div className="login-saudacao">
            <span>SEJA BEM-VINDO</span>
            <h2>Entre na sua conta</h2>
            <p>Informe seus dados para continuar.</p>
          </div>

          <label htmlFor="email">E-mail</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="seu@email.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            />

          <label htmlFor="senha">Senha</label>
            <input
            type="password"
            id="senha"
            name="senha"
            placeholder="Digite sua senha"
            autoComplete="current-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            required
            />

            <button type="submit" disabled={carregando}>
             {carregando ? 'Entrando...' : 'Entrar na plataforma'}
            </button>

            {mensagem && <p className="login-aviso">{mensagem}</p>}

          <p className="login-aviso">
            Acesso destinado aos usuários cadastrados na plataforma.
          </p>

          <p className="login-cadastro-instituicao">
  Sua instituição ainda não tem uma conta?
  {' '}
  <button
    type="button"
    onClick={() => navigate('/instituicoes/cadastrar')}
  >
    Cadastrar instituição
  </button>
</p>
        </form>
      </section>
    </main>
  )
}

export default Login
