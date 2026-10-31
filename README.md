# Plataforma de Bancas Acadêmicas

Aplicação web para organizar projetos acadêmicos e o processo de avaliação por bancas. A plataforma reúne usuários vinculados a instituições, projetos, bancas avaliadoras, critérios de avaliação e resultados.

**Aplicação:** https://plataforma-banca.vercel.app  
**Repositório:** https://github.com/FelipeEN/plataforma-banca

## Funcionalidades

- Cadastro e autenticação de usuários.
- Cadastro e gerenciamento de instituições.
- Vínculo de usuários a instituições, com perfis e aprovação.
- Cadastro e consulta de projetos acadêmicos.
- Organização de bancas de avaliação.
- Associação de avaliadores e projetos às bancas.
- Definição de critérios, pesos e notas máximas.
- Registro e finalização de avaliações.
- Consulta de avaliações, resultados e ranking.
- Controle de acesso conforme perfil do usuário.

## Tecnologias

### Front-end
- React
- Vite
- React Router
- JavaScript
- CSS
- jsPDF para geração de documentos PDF

### Back-end
- Node.js
- Express
- PostgreSQL
- pg (node-postgres)
- JWT para autenticação
- bcrypt para hash de senhas
- dotenv para variáveis de ambiente

## Estrutura do projeto

```
plataforma-banca/
├── backend/
│   ├── database/
│   ├── middlewares/
│   ├── routes/
│   ├── services/
│   ├── test/
│   ├── estrutura.sql
│   ├── server.js
│   └── package.json
└── frontend/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── pages/
    │   ├── utils/
    │   ├── App.jsx
    │   └── api.js
    ├── package.json
    └── vite.config.js
```

## Como executar localmente

### Pré-requisitos

- Node.js e npm
- PostgreSQL
- Git

### 1. Clone o repositório

```bash
git clone https://github.com/FelipeEN/plataforma-banca.git
cd plataforma-banca
```

### 2. Configure o banco de dados

Crie um banco PostgreSQL e execute o script de estrutura:

```bash
psql -U SEU_USUARIO -d NOME_DO_BANCO -f backend/estrutura.sql
```

### 3. Configure o back-end

```bash
cd backend
npm install
```

Crie um arquivo `.env` dentro de `backend/`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nome_do_banco
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
JWT_SECRET=uma_chave_secreta_forte
```

Inicie a API:

```bash
npm run dev
```

A API ficará disponível, por padrão, em http://localhost:3000.

### 4. Configure o front-end

Em outro terminal:

```bash
cd frontend
npm install
```

Opcionalmente, crie um arquivo `.env` dentro de `frontend/`:

```env
VITE_API_URL=http://localhost:3000
```

Inicie a aplicação:

```bash
npm run dev
```

O Vite exibirá o endereço local no terminal.

## Scripts disponíveis

### Front-end

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção |
| `npm run preview` | Executa uma prévia da build |
| `npm run lint` | Executa o Oxlint |

### Back-end

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia a API com Nodemon |
| `npm start` | Inicia a API |
| `npm test` | Executa os testes automatizados |

## Perfis de acesso

- Administrador
- Coordenador
- Orientador
- Avaliador
- Aluno

As permissões e operações disponíveis dependem do perfil e do vínculo do usuário com a instituição.

## Observações

- Não compartilhe o arquivo `.env` nem credenciais do banco de dados.
- Configure o PostgreSQL e as variáveis de ambiente antes de iniciar a API.
- O projeto está em desenvolvimento e pode receber melhorias e novas funcionalidades.

## Autor

**Felipe Sena**

- GitHub: [@FelipeEN](https://github.com/FelipeEN)
