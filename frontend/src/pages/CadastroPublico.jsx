import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './CriarUsuario.css'
import API_URL from '../api.js'

function CadastroPublico() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function cadastrarConta(event) {
    event.preventDefault()
    setMensagem('')
    setErro('')

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    if (new TextEncoder().encode(senha).length > 72) {
      setErro('A senha deve ter no máximo 72 bytes.')
      return
    }

    try {
      setCarregando(true)

      const resposta = await fetch(`${API_URL}/usuarios/cadastro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senha
        })
      })
      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível processar o cadastro.'
        )
      }

      setMensagem(dados.mensagem)
      setNome('')
      setEmail('')
      setSenha('')
      setConfirmarSenha('')
    } catch (error) {
      setErro(
        error instanceof TypeError
          ? 'Não foi possível conectar ao servidor. Tente novamente.'
          : error instanceof Error
            ? error.message
            : 'Não foi possível processar o cadastro.'
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="pagina-criar-usuario">
      <header className="cabecalho-cadastro">
        <Link to="/login" className="marca-cadastro">
          <span className="marca-icone-cadastro">PA</span>
          <span className="marca-texto-cadastro">
            <strong>Plataforma Banca</strong>
            <small>Gestão acadêmica</small>
          </span>
        </Link>

        <button
          type="button"
          className="botao-voltar-cadastro"
          onClick={() => navigate('/login')}
        >
          Voltar ao login
        </button>
      </header>

      <section className="conteudo-cadastro">
        <div className="introducao-cadastro">
          <span className="etiqueta-cadastro">CADASTRO DE CONTA</span>
          <h1>Crie sua conta</h1>
          <p>
            Depois do cadastro, um administrador deverá associar sua conta a
            uma instituição. O cadastro não libera acesso institucional.
          </p>
        </div>

        <section className="cartao-cadastro">
          <div className="icone-cadastro">♙</div>
          <div className="titulo-formulario-cadastro">
            <h2>Seus dados</h2>
            <p>Preencha os campos para criar uma conta na plataforma.</p>
          </div>

          {mensagem && (
            <div
              role="status"
              className="mensagem-cadastro mensagem-sucesso-cadastro"
            >
              <span>✓</span>
              <div>
                <p>{mensagem}</p>
                <p>
                  Já solicitou um link?{' '}
                  <Link to="/confirmar-email">Reenviar confirmação</Link>
                </p>
              </div>
            </div>
          )}

          {erro && (
            <div
              role="alert"
              className="mensagem-cadastro mensagem-erro-cadastro"
            >
              <span>!</span>
              <p>{erro}</p>
            </div>
          )}

          <form onSubmit={cadastrarConta} className="formulario-cadastro">
            <div className="campo-cadastro">
              <label htmlFor="nome">Nome completo</label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                autoComplete="name"
                maxLength={150}
                required
              />
            </div>

            <div className="campo-cadastro">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                maxLength={255}
                required
              />
            </div>

            <div className="campo-cadastro">
              <label htmlFor="senha">Senha</label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <small className="ajuda-campo">
                Utilize pelo menos 8 caracteres e no máximo 72 bytes.
              </small>
            </div>

            <div className="campo-cadastro">
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
            </div>

            <button
              type="submit"
              className="botao-cadastrar-usuario"
              disabled={carregando}
            >
              {carregando ? 'Enviando cadastro...' : 'Criar conta'}
            </button>
          </form>

          <p className="rodape-formulario-cadastro">
            A conta não recebe instituição, perfil ou permissões até ser
            associada por um administrador.
          </p>
        </section>
      </section>
    </main>
  )
}

export default CadastroPublico
