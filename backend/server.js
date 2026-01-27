const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let sessoesDeChat = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

function listarDiagramas() {
    try {
        const caminho = path.join(__dirname, '../frontend/acervo/diagramas');
        if (!fs.existsSync(caminho)) return "Sem diagramas.";
        return fs.readdirSync(caminho).filter(f => f.match(/\.(jpg|jpeg|png)$/i)).join(', ');
    } catch (err) { return ""; }
}

function lerArquivosTecnicos() {
    try {
        const caminho = path.join(__dirname, '../frontend/acervo/inversores');
        if (!fs.existsSync(caminho)) return "";
        return fs.readdirSync(caminho).filter(f => f.endsWith('.txt'))
                 .map(f => `[MANUAL: ${f}]\n${fs.readFileSync(path.join(caminho, f), 'utf-8')}`).join('\n');
    } catch (err) { return ""; }
}

app.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const sessionId = "usuario_unico";

        if (!sessoesDeChat[sessionId]) {
            sessoesDeChat[sessionId] = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: `Você é o ElectroExpert-AI.
                        
                        REGRAS RÍGIDAS DE SEGURANÇA E CONTEXTO:
                        1. NÃO MISTURE ASSUNTOS: Se falamos de inversores, não mostre diagramas de lâmpadas.
                        2. DIAGRAMAS: Só use [MOSTRAR_DIAGRAMA: nome] se o diagrama for EXATAMENTE sobre o que o usuário perguntou. Na dúvida, NÃO mostre imagem.
                        3. EXEMPLOS: Se o usuário pedir um exemplo (sem modelo), use o Siemens V20 ou Weg CFW500 como base educativa.
                        4. VÍDEOS: Se o usuário pedir "vídeo" ou "tutorial", use APENAS o comando [BUSCAR_YOUTUBE: termo]. Não mostre imagens do acervo se ele pediu vídeo.
                        5. MEMÓRIA: Mantenha o fio da meada. Se ele disse "interruptor simples" após falar de "lâmpada", foque no conjunto.
                        
                        ACERVO: ${lerArquivosTecnicos()}
                        IMAGENS DISPONÍVEIS: ${listarDiagramas()}` }]
                    },
                    {
                        role: "model",
                        parts: [{ text: "Entendido. Serei rigoroso com os diagramas e manterei o contexto da conversa sem misturar assuntos. Prioridade total à segurança e clareza técnica." }]
                    }
                ],
            });
        }

        const result = await sessoesDeChat[sessionId].sendMessage(question);
        res.json({ answer: result.response.text() });

    } catch (error) {
        res.status(500).json({ answer: "⚠️ Erro de conexão." });
    }
});

app.listen(port, () => console.log(`🚀 ElectroExpert rodando na porta ${port}`));