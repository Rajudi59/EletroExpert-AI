const express = require('express');
const path = require('path');
const fs = require('fs'); // Adicionado para ler seus manuais
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Configuração da IA - Usa a chave que você colocou na Railway
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
// Ajuste no caminho do frontend para garantir que o site carregue
app.use(express.static(path.join(__dirname, '../frontend')));

// FUNÇÃO PARA LER SEUS MANUAIS (Pasta Inversores)
function lerArquivosTecnicos() {
    try {
        const caminhoAcervo = path.join(__dirname, '../frontend', 'acervo', 'inversores');
        let conteudoTotal = "";
        
        if (fs.existsSync(caminhoAcervo)) {
            const arquivos = fs.readdirSync(caminhoAcervo);
            arquivos.forEach(arquivo => {
                if (arquivo.endsWith('.txt')) {
                    const texto = fs.readFileSync(path.join(caminhoAcervo, arquivo), 'utf-8');
                    conteudoTotal += `\n[ARQUIVO: ${arquivo}]\n${texto}\n`;
                }
            });
        }
        return conteudoTotal || "Nenhum manual encontrado na pasta.";
    } catch (err) {
        return "Erro ao ler acervo técnico.";
    }
}

app.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        const acervo = lerArquivosTecnicos(); // Busca os dados dos seus .txt
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // PROMPT PERSONALIZADO: Segurança e Conhecimento Técnico
        const promptSistema = `Você é o ElectroExpert-AI. 
        Use o seguinte acervo técnico para responder em PORTUGUÊS:
        ${acervo}

        DIRETRIZ DE SEGURANÇA: Sempre priorize a segurança do eletricista. 
        Se a dúvida for sobre manutenção, mencione a necessidade de EPIs e conformidade com a NR-10.
        Pergunta do técnico: ${question}`;

        const result = await model.generateContent(promptSistema);
        res.json({ answer: result.response.text() });
    } catch (error) {
        console.error("ERRO NA API:", error);
        // Resposta amigável para o técnico em caso de falha
        res.status(500).json({ answer: "⚠️ Falha na conexão com a IA. Verifique se a chave GEMINI_API_KEY está correta na Railway e faça o Redeploy." });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(port, () => console.log(`🚀 Sistema Técnico Online na porta ${port}`));