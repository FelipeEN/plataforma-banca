
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './CriarUsuario.css'
import API_URL from '../api.js'

function CriarUsuario() {
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function cadastrarUsuario(event) {
    event.preventDefault()

    setMensagem('')
    setErro('')

    if (senha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    try {
      setCarregando(true)

      const resposta = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          nome,
          email,
          senha
        })
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível cadastrar o usuário.'
        )
      }

      setMensagem(`Usuário ${dados.nome} cadastrado com sucesso!`)
      setNome('')
      setEmail('')
      setSenha('')
      setConfirmarSenha('')
    } catch (error) {
      setErro(
        error.message === 'Failed to fetch'
          ? 'Não foi possível conectar à API. Verifique se o backend está funcionando.'
          : error.message
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="pagina-criar-usuario">
      <header className="cabecalho-cadastro">
        <Link to="/dashboard" className="marca-cadastro">
          <span className="marca-icone-cadastro">PA</span>

          <span className="marca-texto-cadastro">
            <strong>Acadêmica</strong>
            <small>Gestão de projetos</small>
          </span>
        </Link>

        <button
          type="button"
          className="botao-voltar-cadastro"
          onClick={() => navigate('/dashboard')}
        >
          ← Voltar ao dashboard
        </button>
      </header>

      <section className="conteudo-cadastro">
        <div className="introducao-cadastro">
          <span className="etiqueta-cadastro">
            GESTÃO DE USUÁRIOS
          </span>

          <h1>Cadastrar usuário</h1>

          <p>
            Crie uma nova conta para fazer parte da plataforma
            de gestão acadêmica.
          </p>
        </div>

        <section className="cartao-cadastro">
          <div className="icone-cadastro">
            ♙
          </div>

          <div className="titulo-formulario-cadastro">
            <h2>Dados do usuário</h2>
            <p>Preencha todos os campos abaixo.</p>
          </div>

          {mensagem && (
            <div
              role="status"
              className="mensagem-cadastro mensagem-sucesso-cadastro"
            >
              <span>✓</span>
              <p>{mensagem}</p>
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

          <form onSubmit={cadastrarUsuario} className="formulario-cadastro">
            <div className="campo-cadastro">
              <label htmlFor="nome">Nome completo</label>
              <input
                id="nome"
                type="text"
                placeholder="Digite o nome completo"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="campo-cadastro">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="campo-cadastro">
              <label htmlFor="senha">Senha</label>
              <input
                id="senha"
                type="password"
                placeholder="Mínimo de 8 caracteres"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
              <small className="ajuda-campo">
                Utilize pelo menos 8 caracteres.
              </small>
            </div>

            <div className="campo-cadastro">
              <label htmlFor="confirmarSenha">Confirmar senha</label>
              <input
                id="confirmarSenha"
                type="password"
                placeholder="Digite a senha novamente"
                value={confirmarSenha}
                onChange={(event) =>
                  setConfirmarSenha(event.target.value)
                }
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="botao-cadastrar-usuario"
              disabled={carregando}
            >
              {carregando ? (
                <>
                  <span className="indicador-carregamento" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <span>+</span>
                  Cadastrar usuário
                </>
              )}
            </button>
          </form>

          <p className="rodape-formulario-cadastro">
            Os dados serão enviados com segurança para a API
            do EstudaNet.
          </p>
        </section>

        <footer className="rodape-cadastro">
          <span>EstudaNet</span>
          <span>Gestão acadêmica</span>
        </footer>
      </section>
    </main>
  )
}

export default CriarUsuario
