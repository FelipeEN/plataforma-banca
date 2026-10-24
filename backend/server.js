require('dotenv').config();

const express = require('express');
const pool = require('./database/connection');

const cors = require('cors')

const instituicoesRoutes = require('./routes/instituicoes.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const vinculosRoutes = require('./routes/vinculos.routes');
const authRoutes = require('./routes/auth.routes');
const projetosRoutes = require('./routes/projetos.routes');
const bancasRoutes = require('./routes/bancas.routes');
const avaliacoesRoutes = require('./routes/avaliacoes.routes');

const app = express();
app.set('trust proxy', 1);

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://plataforma-banca.vercel.app'
    ]
}));

app.use(express.json({ limit: '100kb' }));


const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('API da Plataforma Acadêmica funcionando!');
});

async function iniciarServidor() {
    try {
        await pool.query('SELECT NOW()');

        console.log('PostgreSQL conectado com sucesso!');

        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    } catch (erro) {
        console.error('Erro ao conectar ao PostgreSQL:', erro.message);
        process.exit(1);
    }
}
app.use('/instituicoes', instituicoesRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/vinculos', vinculosRoutes);
app.use('/auth', authRoutes);
app.use('/projetos', projetosRoutes);
app.use('/bancas', bancasRoutes);
app.use('/avaliacoes', avaliacoesRoutes);



iniciarServidor();