const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Configuração da IA
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware essencial para o site não ficar em branco
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota para o Chat (Teste de Independência)
app.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Prompt de teste puro, sem os arquivos pesados por enquanto
        const prompt = `Você é um assistente técnico. Responda de forma breve: ${question}`;

        const result = await model.generateContent(prompt);
        res.json({ answer: result.response.text() });
    } catch (error) {
        console.error("ERRO NA API:", error);
        res.status(500).json({ answer: "A IA falhou. Verifique a chave na Railway." });
    }
} );

// Rota para garantir que o Index abra corretamente
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(port, () => console.log(`🚀 Servidor e Site Online na porta ${port}`));