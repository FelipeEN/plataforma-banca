
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

      const resposta = await fetch('http://localhost:3000/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
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
      <section className="formulario-usuario">
        <h1>Cadastrar usuário</h1>

        <p>
          Preencha os dados para criar uma nova conta no EstudaNet.
        </p>

        {mensagem && (
          <div role="status" className="mensagem-sucesso">
            {mensagem}
          </div>
        )}

        {erro && (
          <div role="alert" className="mensagem-erro">
            {erro}
          </div>
        )}

        <form onSubmit={cadastrarUsuario}>
          <div>
            <label htmlFor="nome">Nome completo</label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirmarSenha">Confirmar senha</label>
            <input
              id="confirmarSenha"
              type="password"
              value={confirmarSenha}
              onChange={(event) =>
                setConfirmarSenha(event.target.value)
              }
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={carregando}>
            {carregando ? 'Cadastrando...' : 'Cadastrar usuário'}
          </button>
        </form>

        <Link to="/dashboard">Voltar ao dashboard</Link>
      </section>
    </main>
  )
}

export default CriarUsuario
