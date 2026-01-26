const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// FUNÇÃO PARA LISTAR DIAGRAMAS DISPONÍVEIS
function listarDiagramas() {
    try {
        const caminhoDiagramas = path.join(frontendPath, 'acervo', 'diagramas');
        if (!fs.existsSync(caminhoDiagramas)) return "Nenhum diagrama visual disponível.";
        const arquivos = fs.readdirSync(caminhoDiagramas);
        return arquivos.filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg'))
                       .map(f => `- Diagrama: ${f}`).join('\n');
    } catch (err) { return "Erro ao listar diagramas."; }
}

function lerArquivosTecnicos() {
    try {
        const caminhoAcervo = path.join(frontendPath, 'acervo', 'inversores');
        if (!fs.existsSync(caminhoAcervo)) return "Aviso: Pasta de manuais não encontrada.";
        const arquivos = fs.readdirSync(caminhoAcervo);
        let conteudoTotal = "";
        arquivos.forEach(arquivo => {
            if (arquivo.endsWith('.txt')) {
                const texto = fs.readFileSync(path.join(caminhoAcervo, arquivo), 'utf-8');
                conteudoTotal += `\n[MANUAL: ${arquivo}]\n${texto}\n`;
            }
        });
        return conteudoTotal || "Acervo vazio.";
    } catch (err) { return "Erro ao acessar base técnica."; }
}

app.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const acervo = lerArquivosTecnicos();
        const diagramas = listarDiagramas();

        const promptSistema = `
Você é o ElectroExpert-AI, especialista em inversores e segurança elétrica.
Sempre priorize a segurança do operador e normas NR-10/NBR-5410.

ACERVO DE TEXTO:
${acervo}

DIAGRAMAS VISUAIS DISPONÍVEIS (Se a explicação pedir um desenho, cite o nome do arquivo exatamente assim: [MOSTRAR_DIAGRAMA: nome-do-arquivo.jpg]):
${diagramas}

REGRA IMPORTANTE: Se o usuário perguntar sobre instalação ou conexão e houver um diagrama correspondente acima, inclua o código [MOSTRAR_DIAGRAMA: nome-do-arquivo.jpg] no final da sua resposta.

Pergunta: ${question}`;

        const result = await model.generateContent(promptSistema);
        res.json({ answer: result.response.text() });
    } catch (error) {
        res.status(500).json({ answer: "⚠️ Erro no motor IA." });
    }
});

app.get('*', (req, res) => { res.sendFile(path.join(frontendPath, 'index.html')); });

app.listen(port, () => { console.log(`🚀 ElectroExpert rodando em http://localhost:${port}`); });