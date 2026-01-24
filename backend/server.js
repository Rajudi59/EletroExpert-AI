const express = require('express');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuração de limites e arquivos estáticos
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

/**
 * FUNÇÃO DE BUSCA FILTRADA:
 * Em vez de ler o manual todo, ela filtra apenas linhas com 'P', 'F' ou 'Erro'.
 * Isso evita que o servidor da Railway trave por tempo (Timeout).
 */
async function buscarParametroNoManual(pergunta) {
    try {
        const acervoPath = path.join(process.cwd(), 'frontend', 'acervo', 'inversores');
        if (!fs.existsSync(acervoPath)) return "Aviso: Pasta de inversores não localizada.";

        const arquivos = fs.readdirSync(acervoPath);
        let resumoParaIA = "";

        for (const arquivo of arquivos) {
            if (arquivo.toLowerCase().endsWith('.pdf')) {
                const dataBuffer = fs.readFileSync(path.join(acervoPath, arquivo));
                const data = await pdf(dataBuffer);
                
                // Transforma o PDF em linhas e filtra apenas o que parece ser parâmetro ou erro
                const linhas = data.text.split('\n');
                const filtro = linhas.filter(l => 
                    l.includes('P0') || 
                    l.includes('Parâmetro') || 
                    l.includes('Erro') || 
                    l.includes('F0')
                );

                // Pega as primeiras 150 linhas relevantes para não estourar a memória
                resumoParaIA += `\n[FONTE: ${arquivo}]\n` + filtro.slice(0, 150).join('\n');
            }
        }
        return resumoParaIA || "Nenhum dado técnico específico extraído.";
    } catch (e) {
        console.error("Erro na extração:", e);
        return "Erro ao processar os arquivos PDF.";
    }
}

app.post('/chat', async (req, res) => {
    try {
        const { question, image } = req.body;
        
        // Aciona a busca inteligente nos manuais
        const contextoTecnico = await buscarParametroNoManual(question);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const promptSistema = `Você é o ElectroExpert-AI.
        Use os dados extraídos dos manuais abaixo para responder ao técnico.
        Se o parâmetro (ex: P0101) estiver nos dados, explique exatamente o que o manual diz.
        
        DADOS DO ACERVO:
        ${contextoTecnico}

        REGRAS:
        1. Cite o nome do manual.
        2. Priorize a segurança (NR-10/NR-12).
        3. Se não encontrar o parâmetro nos dados acima, use seu conhecimento geral WEG mas avise o usuário.
        
        PERGUNTA: ${question}`;

        const result = await model.generateContent([
            promptSistema,
            ...(image ? [{ inlineData: { data: image, mimeType: "image/jpeg" }}] : [])
        ]);

        res.json({ answer: result.response.text() });
    } catch (error) {
        console.error("Erro no Chat:", error);
        res.status(500).json({ answer: "⚠️ O servidor demorou muito para ler o manual. Tente ser mais específico na pergunta." });
    }
});

app.listen(port, () => console.log(`⚡ ElectroExpert Online na porta ${port}`));