const express = require('express');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse'); // O novo "leitor" de manuais potente
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

/**
 * FUNÇÃO DE BUSCA: Agora lê .txt E extrai texto de .pdf automaticamente
 */
async function buscarConhecimentoTecnico() {
    try {
        const acervoPath = path.join(__dirname, '../frontend/acervo');
        let conhecimentoExtraido = "DADOS EXTRAÍDOS DO ACERVO TÉCNICO:\n";

        if (fs.existsSync(acervoPath)) {
            // Função recursiva para ler todas as subpastas (inversores, clp, etc)
            const lerArquivos = async (diretorio) => {
                const itens = fs.readdirSync(diretorio);
                for (const item of itens) {
                    const caminhoCompleto = path.join(diretorio, item);
                    const stats = fs.lstatSync(caminhoCompleto);

                    if (stats.isDirectory()) {
                        await lerArquivos(caminhoCompleto);
                    } else {
                        // Se for PDF, extrai o texto usando a memória do Hobby Plan
                        if (item.toLowerCase().endsWith('.pdf')) {
                            const dataBuffer = fs.readFileSync(caminhoCompleto);
                            const data = await pdf(dataBuffer);
                            conhecimentoExtraido += `\n--- MANUAL (PDF): ${item} ---\n${data.text.substring(0, 7000)}\n`; 
                            // Aumentamos para 7000 caracteres pois agora temos 8GB de RAM!
                        } 
                        // Se for TXT, lê normal
                        else if (item.toLowerCase().endsWith('.txt')) {
                            const conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
                            conhecimentoExtraido += `\n--- MANUAL (TXT): ${item} ---\n${conteudo}\n`;
                        }
                    }
                }
            };
            await lerArquivos(acervoPath);
        }
        return conhecimentoExtraido;
    } catch (error) {
        console.error("Erro ao ler acervo:", error);
        return "Erro ao processar manuais. Siga as normas de segurança (NR-10).";
    }
}

app.post('/chat', async (req, res) => {
    try {
        const { question, image } = req.body;
        const acervo = await buscarConhecimentoTecnico();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const promptSistema = `Você é o ElectroExpert-AI, um assistente técnico especializado. 
        Siga rigorosamente as normas de segurança (NR-10, NR-12).
        Use este acervo técnico para responder com precisão: ${acervo}. 
        Pergunta do técnico: ${question}`;

        const result = await model.generateContent([
            promptSistema, 
            ...(image ? [{ inlineData: { data: image, mimeType: "image/jpeg" }}] : [])
        ]);
        
        res.json({ answer: result.response.text() });
    } catch (error) {
        console.error("Erro no chat:", error);
        res.status(500).json({ answer: "⚠️ Erro no servidor. Verifique a conexão e tente novamente." });
    }
});

app.listen(port, () => console.log(`⚡ ElectroExpert Online (Hobby Plan Ativo)`));