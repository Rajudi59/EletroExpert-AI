const express = require('express');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

/**
 * FUNÇÃO DE BUSCA: Vasculha todas as subpastas dentro de 'acervo'
 */
async function buscarConhecimentoTecnico() {
    try {
        // O path.join resolve o problema de Windows vs Linux automaticamente
        const acervoPath = path.join(process.cwd(), 'frontend', 'acervo');
        let conhecimentoExtraido = "";

        if (fs.existsSync(acervoPath)) {
            const lerRecursivo = async (diretorio) => {
                const itens = fs.readdirSync(diretorio);
                for (const item of itens) {
                    const caminhoCompleto = path.join(diretorio, item);
                    const stats = fs.lstatSync(caminhoCompleto);

                    if (stats.isDirectory()) {
                        await lerRecursivo(caminhoCompleto); // Entra na subpasta (ex: inversores)
                    } else {
                        if (item.toLowerCase().endsWith('.pdf')) {
                            const dataBuffer = fs.readFileSync(caminhoCompleto);
                            const data = await pdf(dataBuffer);
                            // Pega uma boa parte do manual (15.000 caracteres)
                            conhecimentoExtraido += `\n--- MANUAL ENCONTRADO: ${item} ---\n${data.text.substring(0, 15000)}\n`;
                        } else if (item.toLowerCase().endsWith('.txt')) {
                            const conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
                            conhecimentoExtraido += `\n--- TEXTO ENCONTRADO: ${item} ---\n${conteudo}\n`;
                        }
                    }
                }
            };
            await lerRecursivo(acervoPath);
        }
        return conhecimentoExtraido || "AVISO: Nenhum manual foi localizado nas pastas.";
    } catch (error) {
        console.error("Erro ao ler arquivos:", error);
        return "Erro técnico na leitura do acervo.";
    }
}

app.post('/chat', async (req, res) => {
    try {
        const { question, image } = req.body;
        const acervo = await buscarConhecimentoTecnico();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const promptSistema = `Você é o ElectroExpert-AI.
        
        CONTEÚDO DO SEU ACERVO TÉCNICO:
        ${acervo}

        REGRAS:
        1. Use as informações dos manuais acima para responder.
        2. Se encontrar a resposta, cite o nome do manual (ex: "De acordo com o manual do CFW500...").
        3. Se não encontrar no acervo, avise que está usando conhecimento geral mas priorize a segurança.
        
        Pergunta: ${question}`;

        const result = await model.generateContent([
            promptSistema,
            ...(image ? [{ inlineData: { data: image, mimeType: "image/jpeg" }}] : [])
        ]);

        res.json({ answer: result.response.text() });
    } catch (error) {
        res.status(500).json({ answer: "⚠️ Erro no servidor." });
    }
});

app.listen(port, () => console.log(`⚡ Servidor ElectroExpert Ativo`));