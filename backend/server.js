const express = require('express');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse'); // Ferramenta para ler os PDFs
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

/**
 * FUNÇÃO DE BUSCA RECURSIVA: Entra em todas as subpastas do acervo
 */
async function buscarConhecimentoTecnico() {
    try {
        const acervoPath = path.resolve(__dirname, '../frontend/acervo');
        let conhecimentoExtraido = "DADOS EXTRAÍDOS DO ACERVO TÉCNICO (INCLUINDO SUBPASTAS):\n";

        if (fs.existsSync(acervoPath)) {
            // Função interna que navega por pastas e arquivos
            const lerArquivosRecursivo = async (diretorio) => {
                const itens = fs.readdirSync(diretorio);

                for (const item of itens) {
                    const caminhoCompleto = path.join(diretorio, item);
                    const stats = fs.lstatSync(caminhoCompleto);

                    if (stats.isDirectory()) {
                        // Se for uma pasta (ex: Inversores, CLP), entra nela
                        await lerArquivosRecursivo(caminhoCompleto);
                    } else {
                        // Se for PDF, extrai o texto (ideal para manuais da WEG)
                        if (item.toLowerCase().endsWith('.pdf')) {
                            console.log(`📖 Lendo PDF encontrado: ${item}`);
                            const dataBuffer = fs.readFileSync(caminhoCompleto);
                            const data = await pdf(dataBuffer);
                            // Usando 10.000 caracteres para aproveitar seus 8GB de RAM
                            conhecimentoExtraido += `\n--- CONTEÚDO DO MANUAL: ${item} ---\n${data.text.substring(0, 10000)}\n`;
                        } 
                        // Se for TXT, lê o conteúdo direto
                        else if (item.toLowerCase().endsWith('.txt')) {
                            const conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
                            conhecimentoExtraido += `\n--- DOCUMENTO: ${item} ---\n${conteudo}\n`;
                        }
                    }
                }
            };

            await lerArquivosRecursivo(acervoPath);
        } else {
            console.log("⚠️ Pasta acervo não encontrada no caminho:", acervoPath);
        }

        return conhecimentoExtraido;
    } catch (error) {
        console.error("❌ Erro ao ler acervo profundo:", error);
        return "Erro ao processar manuais. Siga sempre as normas de segurança (NR-10/NR-12).";
    }
}

app.post('/chat', async (req, res) => {
    try {
        const { question, image } = req.body;
        
        // Agora busca em todas as pastas antes de responder
        const acervo = await buscarConhecimentoTecnico();
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const promptSistema = `Você é o ElectroExpert-AI. 
        Sua base de conhecimento ATUALIZADA com seus manuais é: ${acervo}.
        Instrução: Use os dados acima para responder de forma técnica e segura.
        Pergunta do usuário: ${question}`;

        const result = await model.generateContent([
            promptSistema, 
            ...(image ? [{ inlineData: { data: image, mimeType: "image/jpeg" }}] : [])
        ]);

        res.json({ answer: result.response.text() });
    } catch (error) {
        console.error("Erro no servidor:", error);
        res.status(500).json({ answer: "⚠️ Erro no servidor ao processar a consulta." });
    }
});

app.listen(port, () => console.log(`⚡ ElectroExpert Online - Scanner de Subpastas Ativo`));