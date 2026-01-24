const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { buscarConhecimentoTecnico } = require("./services/acervoService");

const app = express();

// --- ROTA DE ESTABILIDADE (HEALTHCHECK) ---
// Responde imediatamente para a Railway não derrubar o servidor
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Configurações de Segurança e Conexão
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// LIGANDO A TELA AZUL (FRONTEND)
app.use(express.static(path.join(process.cwd(), 'frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'frontend', 'index.html'));
});

// Rota Principal de Chat
app.post('/api/chat', async (req, res) => {
    try {
        const { question, image, imageType } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ answer: "Erro: Chave API não configurada na Railway." });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let conhecimentoExtraido = "";
        try {
            conhecimentoExtraido = await buscarConhecimentoTecnico();
        } catch (e) {
            console.error("Erro no acervo:", e.message);
            conhecimentoExtraido = "Aviso: Base de manuais offline. Use normas NR-10.";
        }

        const promptPrincipal = `Você é o EletroExpert-AI, Especialista em Manutenção Elétrica.
        Responda com base no conteúdo abaixo:
        
        ${conhecimentoExtraido}

        PERGUNTA: ${question}
        
        IMPORTANTE: Priorize a segurança do operador, técnico ou eletricista, seguindo normas técnicas (NR-10, NBR-5410) para precauções legais.`;

        let payload = [promptPrincipal];
        if (image) {
            payload.push({
                inlineData: { data: image, mimeType: imageType || "image/jpeg" }
            });
        }

        const result = await model.generateContent(payload);
        res.status(200).json({ answer: result.response.text() });

    } catch (error) {
        console.error("ERRO CRÍTICO NO SERVIDOR:", error);
        res.status(500).json({ answer: "Erro no processamento. Tente novamente." });
    }
});

// Configuração de Porta para Deploy
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor EletroExpert ligado na porta ${PORT} ⚡`);
});

// Mantém a conexão estável para evitar Stopping Container
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;