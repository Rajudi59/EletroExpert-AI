const express = require('express');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

/**
 * BUSCA INTELIGENTE EM TODAS AS SUBPASTAS
 */
async function buscarNoAcervo() {
    try {
        const acervoPath = path.join(process.cwd(), 'frontend', 'acervo');
        let conhecimentoExtraido = "";

        if (!fs.existsSync(acervoPath)) return "Acervo não configurado.";

        // Função que varre todas as subpastas em busca de manuais
        const varrerPastas = async (diretorio) => {
            const itens = fs.readdirSync(diretorio);
            for (const item of itens) {
                const caminhoCompleto = path.join(diretorio, item);
                const stat = fs.lstatSync(caminhoCompleto);

                if (stat.isDirectory()) {
                    await varrerPastas(caminhoCompleto); // Entra na próxima pasta (ex: inversores)
                } else if (item.toLowerCase().endsWith('.pdf')) {
                    console.log(`📖 Lendo manual: ${item}`);
                    const buffer = fs.readFileSync(caminhoCompleto);
                    const data = await pdf(buffer);
                    // Pega os primeiros 10 mil caracteres para segurança e velocidade
                    conhecimentoExtraido += `\n--- FONTE (${item}): ---\n${data.text.substring(0, 10000)}\n`;
                }
            }
        };

        await varrerPastas(acervoPath);
        return conhecimentoExtraido || "Nenhum manual PDF encontrado nas pastas.";
    } catch (error) {
        console.error("Erro no Scanner:", error);
        return "Erro ao processar manuais técnicos.";
    }
}

app.post('/chat', async (req, res) => {
    try {
        const { question, image } = req.body;
        
        // O sistema vasculha as pastas (Inversores e outras que você criar)
        const acervo = await buscarNoAcervo();
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const promptSistema = `Você é o ElectroExpert-AI.
        Abaixo está o conteúdo dos manuais técnicos encontrados no seu acervo (Pastas: Inversores e outros).
        
        ACERVO:
        ${acervo}

        REGRAS:
        1. Se a informação sobre o parâmetro (ex: P0101) estiver no ACERVO, use-a e cite o manual.
        2. Se não estiver, use seu conhecimento geral mas avise que não localizou no acervo técnico.
        3. Priorize SEMPRE a segurança do técnico (NR-10).
        
        PERGUNTA: ${question}`;

        const result = await model.generateContent([
            promptSistema,
            ...(image ? [{ inlineData: { data: image, mimeType: "image/jpeg" }}] : [])
        ]);

        res.json({ answer: result.response.text() });
    } catch (error) {
        console.error("Erro Chat:", error);
        res.status(500).json({ answer: "⚠️ Erro ao processar. O manual pode ser muito pesado ou o servidor esgotou o tempo." });
    }
});

app.listen(port, () => console.log(`⚡ ElectroExpert pronto para expansão de acervo`));