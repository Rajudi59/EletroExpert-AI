const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());

app.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // TESTE PURO: Sem ler arquivos, apenas a IA respondendo
        const prompt = `Você é um assistente técnico. Responda: ${question}`;

        const result = await model.generateContent(prompt);
        res.json({ answer: result.response.text() });
    } catch (error) {
        console.error("ERRO DIRETO NA API:", error);
        res.status(500).json({ answer: "A IA independente falhou. O problema é a Chave API ou a conexão com o Google." });
    }
});

app.listen(port, () => console.log(`🚀 Teste de IA Independente na porta ${port}`));