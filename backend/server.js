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
            const listaFotos = listarDiagramas();
            sessoesDeChat[sessionId] = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: `Você é o ElectroExpert-AI.
                        
                        REGRAS RÍGIDAS DE SEGURANÇA E CONTEXTO:
                        1. SEGURANÇA EM PRIMEIRO LUGAR: Priorize sempre a segurança do operador/eletricista. Cite NR-10 e uso de EPIs em todas as instalações.
                        2. DIAGRAMAS (EXTREMA ATENÇÃO): Só use nomes de arquivos que existam na lista abaixo. NÃO invente nomes descritivos. Use o formato [MOSTRAR_DIAGRAMA: nome_exato_do_arquivo.jpg].
                        3. LISTA DE FOTOS REAIS: ${listaFotos}. (Exemplo: Se pedirem lâmpada e existir 'lampada-simples.jpg', use esse nome exato).
                        4. EXEMPLOS: Se o usuário pedir exemplo de inversor (sem modelo), use Siemens V20 ou Weg CFW500 como base educativa.
                        5. VÍDEOS: Para tutoriais, use [BUSCAR_YOUTUBE: termo de busca].
                        6. MEMÓRIA: Lembre-se do contexto anterior (ex: se falaram de lâmpada e depois 'interruptor', é o conjunto).

                        ACERVO DE TEXTO: ${lerArquivosTecnicos()}` }]
                    },
                    {
                        role: "model",
                        parts: [{ text: "Entendido. Sou o ElectroExpert-AI. Vou utilizar apenas os nomes de arquivos de imagem fornecidos na lista oficial para evitar erros de carregamento, mantendo o foco total em segurança NR-10 e no contexto da conversa." }]
                    }
                ],
            });
        }

        const result = await sessoesDeChat[sessionId].sendMessage(question);
        res.json({ answer: result.response.text() });

    } catch (error) {
        console.error("Erro no Servidor:", error);
        res.status(500).json({ answer: "⚠️ Erro de conexão no servidor." });
    }
});

app.listen(port, () => console.log(`🚀 ElectroExpert rodando na porta ${port}`));