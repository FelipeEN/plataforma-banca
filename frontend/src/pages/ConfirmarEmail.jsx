import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import API_URL from '../api.js'
import './CriarUsuario.css'

function ConfirmarEmail() {
  const [email, setEmail] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const confirmouToken = useRef(false)

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.hash.slice(1))
    const token = parametros.get('token')

    if (!token || confirmouToken.current) {
      return
    }

    confirmouToken.current = true
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}`
    )

    async function confirmar() {
      setCarregando(true)
      setErro('')

      try {
        const resposta = await fetch(`${API_URL}/usuarios/cadastro/confirmar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        })
        const dados = await resposta.json()

        if (!resposta.ok) {
          throw new Error(dados.erro || 'Não foi possível confirmar o e-mail.')
        }

        setMensagem(dados.mensagem)
      } catch (error) {
        setErro(
          error instanceof TypeError
            ? 'Não foi possível conectar ao servidor. Tente novamente.'
            : error instanceof Error
              ? error.message
              : 'Não foi possível confirmar o e-mail.'
        )
      } finally {
        setCarregando(false)
      }
    }

    confirmar()
  }, [])

  async function reenviarConfirmacao(event) {
    event.preventDefault()
    setMensagem('')
    setErro('')

    try {
      setCarregando(true)
      const resposta = await fetch(`${API_URL}/usuarios/cadastro/reenviar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      })
      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível processar a solicitação.')
      }

      setMensagem(dados.mensagem)
      setEmail('')
    } catch (error) {
      setErro(
        error instanceof TypeError
          ? 'Não foi possível conectar ao servidor. Tente novamente.'
          : error instanceof Error
            ? error.message
            : 'Não foi possível processar a solicitação.'
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
        <Link to="/login" className="botao-voltar-cadastro">
          Voltar ao login
        </Link>
      </header>

      <section className="conteudo-cadastro">
        <div className="introducao-cadastro">
          <span className="etiqueta-cadastro">CONFIRMAÇÃO DE E-MAIL</span>
          <h1>Confirme seu endereço</h1>
          <p>
            A confirmação comprova o acesso ao e-mail, mas não cria nem aprova
            um vínculo institucional.
          </p>
        </div>

        <section className="cartao-cadastro">
          <div className="titulo-formulario-cadastro">
            <h2>{carregando ? 'Processando...' : 'Solicitar novo link'}</h2>
            <p>
              Se sua conta ainda precisar de confirmação, enviaremos um novo
              link. Links já enviados continuam válidos até expirarem ou o
              e-mail ser confirmado.
            </p>
          </div>

          {mensagem && (
            <div
              role="status"
              className="mensagem-cadastro mensagem-sucesso-cadastro"
            >
              <p>{mensagem}</p>
            </div>
          )}

          {erro && (
            <div
              role="alert"
              className="mensagem-cadastro mensagem-erro-cadastro"
            >
              <p>{erro}</p>
            </div>
          )}

          <form onSubmit={reenviarConfirmacao} className="formulario-cadastro">
            <div className="campo-cadastro">
              <label htmlFor="email-confirmacao">E-mail</label>
              <input
                id="email-confirmacao"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                maxLength={255}
                required
              />
            </div>
            <button
              type="submit"
              className="botao-cadastrar-usuario"
              disabled={carregando}
            >
              {carregando ? 'Enviando...' : 'Reenviar confirmação'}
            </button>
          </form>
        </section>
      </section>
    </main>
  )
}

export default ConfirmarEmail
