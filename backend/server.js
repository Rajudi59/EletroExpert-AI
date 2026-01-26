const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

/* =========================
   CONFIGURAÇÃO IA (GEMINI)
========================= */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* =========================
   MIDDLEWARES & SEGURANÇA
========================= */
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

/* =========================
   GERENCIAMENTO DE ACERVO
========================= */

function listarDiagramas() {
    try {
        const caminhoDiagramas = path.join(frontendPath, 'acervo', 'diagramas');
        if (!fs.existsSync(caminhoDiagramas)) return "Nenhum diagrama visual disponível.";
        const arquivos = fs.readdirSync(caminhoDiagramas);
        const imagens = arquivos.filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i));
        return imagens.length > 0 
            ? imagens.map(f => `- Diagrama disponível: ${f}`).join('\n')
            : "Pasta de diagramas vazia.";
    } catch (err) { return "Erro ao ler diagramas."; }
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
                conteudoTotal += `\n[MANUAL LOCAL - MARCA/MODELO: ${arquivo}]\n${texto}\n`;
            }
        });
        return conteudoTotal || "Acervo de manuais vazio.";
    } catch (err) { return "Erro ao acessar base técnica local."; }
}

/* =========================
   ROTA PRINCIPAL (CHAT IA)
========================= */
app.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const acervoLocal = lerArquivosTecnicos();
        const listaDiagramas = listarDiagramas();

        const promptSistema = `
Você é o ElectroExpert-AI, especialista sênior em sistemas elétricos.

ESTRATÉGIA DE BUSCA RIGOROSA (Priorize a Segurança):
1. Verifique qual MARCA o usuário mencionou (ex: Siemens, Weg, ABB).
2. Use o ACERVO LOCAL abaixo apenas se os manuais forem da MARCA EXATA pedida:
${acervoLocal}

3. REGRA DE OURO: Se o usuário pedir Siemens e você só tiver manuais da Weg no acervo, IGNORE o acervo local e faça uma PESQUISA EXTERNA. Nunca dê parâmetros de uma marca usando manuais de outra.

4. IDENTIFICAÇÃO NA RESPOSTA:
   - Resposta com manual correto: "✅ [ACERVO LOCAL - MARCA CONFIRMADA]"
   - Resposta via web (marca diferente ou não cadastrada): "🌐 [PESQUISA EXTERNA - PROCEDER COM CAUTELA]"

DIAGRAMAS:
${listaDiagramas}
(Se relevante, use: [MOSTRAR_DIAGRAMA: nome-do-arquivo.jpg])

SEGURANÇA:
Sempre cite NR-10 e EPIs. Errar um parâmetro de inversor pode causar danos graves.

Pergunta: ${question}`;

        const result = await model.generateContent(promptSistema);
        res.json({ answer: result.response.text() });

    } catch (error) {
        res.status(500).json({ answer: "⚠️ Erro de conexão com a IA." });
    }
});

app.get('*', (req, res) => { res.sendFile(path.join(frontendPath, 'index.html')); });

app.listen(port, () => {
    console.log(`🚀 ElectroExpert Online em http://localhost:${port}`);
});