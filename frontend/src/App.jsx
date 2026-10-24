import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Projetos from './pages/Projetos.jsx'
import DetalhesProjeto from './pages/DetalhesProjeto.jsx'
import Bancas from './pages/Bancas.jsx'
import DetalhesBanca from './pages/DetalhesBanca.jsx'
import AvaliarProjeto from './pages/AvaliarProjeto.jsx'
import Ranking from './pages/Ranking.jsx'
import Avaliacoes from './pages/Avaliacoes'
import AssociarUsuario from './pages/AssociarUsuario.jsx'
import ConsultaAvaliacoes from './pages/ConsultaAvaliacoes.jsx'
import CriarUsuario from './pages/CriarUsuario.jsx'
import CadastroPublico from './pages/CadastroPublico.jsx'
import ConfirmarEmail from './pages/ConfirmarEmail.jsx'
import ResultadoAluno from './pages/ResultadoAluno.jsx'
import CadastrarInstituicao from './pages/CadastrarInstituicao.jsx'




function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<CadastroPublico />} />
      <Route path="/confirmar-email" element={<ConfirmarEmail />} />

      <Route
        path="/dashboard"
        element={
          sessionStorage.getItem('token')
            ? <Dashboard />
            : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/projetos"
        element={
          sessionStorage.getItem('token')
            ? <Projetos />
            : <Navigate to="/login" replace />
        }
      />

        <Route
            path="/bancas"
            element={
                sessionStorage.getItem('token')
                    ? <Bancas />
                    : <Navigate to="/login" replace />
            }
        />


        <Route
            path="/bancas/:bancaId"
            element={
                sessionStorage.getItem('token')
                    ? <DetalhesBanca />
                    : <Navigate to="/login" replace />
            }
        />
      <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/projetos/:projetoId"
          element={
            sessionStorage.getItem('token')
              ? <DetalhesProjeto />
              : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/bancas/:bancaId/projetos/:projetoId/avaliar"
          element={
              sessionStorage.getItem('token')
                  ? <AvaliarProjeto />
                  : <Navigate to="/login" replace />
          }
      />

      <Route
        path="/bancas/:bancaId/projetos/:projetoId/avaliacoes"
        element={
          sessionStorage.getItem('token')
            ? <ConsultaAvaliacoes />
            : <Navigate to="/login" replace />
        }
      />


      <Route
        path="/bancas/:bancaId/ranking"
        element={
          sessionStorage.getItem('token')
            ? <Ranking />
            : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/avaliacoes"
        element={
          sessionStorage.getItem('token')
            ? <Avaliacoes />
            : <Navigate to="/login" replace />
        }
      />


      <Route
          path="/bancas/:bancaId/projetos/:projetoId/resultado"
          element={
              sessionStorage.getItem('token')
                  ? <ResultadoAluno />
                  : <Navigate to="/login" replace />
          }
      />

<Route
  path="/usuarios/novo"
  element={
    sessionStorage.getItem('token')
      ? <CriarUsuario />
      : <Navigate to="/login" replace />
  }
/>

<Route
  path="/usuarios/associar"
  element={
    sessionStorage.getItem('token')
      ? <AssociarUsuario />
      : <Navigate to="/login" replace />
  }
/>


<Route
  path="/instituicoes/cadastrar"
  element={<CadastrarInstituicao />}
/>

            <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App