const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

/* =========================
   GEMINI 2.0
========================= */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* =========================
   MIDDLEWARES
========================= */
app.use(express.json());

// 🔴 MUITO IMPORTANTE: desativa cache em desenvolvimento
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// 🔴 FRONTEND CORRETO
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

/* =========================
   ACERVO TÉCNICO
========================= */
function lerArquivosTecnicos() {
    try {
        const caminhoAcervo = path.join(frontendPath, 'acervo', 'inversores');

        if (!fs.existsSync(caminhoAcervo)) {
            return "Aviso: Pasta de manuais não encontrada.";
        }

        const arquivos = fs.readdirSync(caminhoAcervo);
        let conteudoTotal = "";

        arquivos.forEach(arquivo => {
            if (arquivo.endsWith('.txt')) {
                const texto = fs.readFileSync(
                    path.join(caminhoAcervo, arquivo),
                    'utf-8'
                );
                conteudoTotal += `\n[MANUAL: ${arquivo}]\n${texto}\n`;
            }
        });

        return conteudoTotal || "Acervo vazio.";
    } catch (err) {
        console.error("Erro ao ler acervo:", err);
        return "Erro ao acessar base de dados técnica.";
    }
}

/* =========================
   ROTA DA IA
========================= */
app.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash"
        });

        const acervo = lerArquivosTecnicos();

        const promptSistema = `
Você é o ElectroExpert-AI, especialista em inversores e segurança elétrica.

Use este acervo técnico:
${acervo}

REGRA DE SEGURANÇA:
Sempre mencione uso de EPIs, EPCs e conformidade com a NR-10.

Pergunta do usuário:
${question}
        `;

        const result = await model.generateContent(promptSistema);

        res.json({
            answer: result.response.text()
        });

    } catch (error) {
        console.error("ERRO DETALHADO IA:", error);
        res.status(500).json({
            answer: "⚠️ Erro ao conectar com o motor IA."
        });
    }
});

/* =========================
   SPA / INDEX
========================= */
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

/* =========================
   START
========================= */
app.listen(port, () => {
    console.log(`🚀 ElectroExpert AI rodando em http://localhost:${port}`);
});
