const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Configurações do Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json({ limit: '50mb' }));
// Serve os arquivos do frontend (HTML, CSS, JS, Acervo)
app.use(express.static(path.join(__dirname, '../frontend')));

/**
 * FUNÇÃO DE BUSCA: Lê o conteúdo real dos manuais .txt no seu acervo
 */
async function buscarConhecimentoTecnico() {
    try {
        // Caminho para a pasta acervo dentro de frontend
        const acervoPath = path.join(__dirname, '../frontend/acervo');
        let conhecimentoExtraido = "CONTEÚDO DO ACERVO TÉCNICO DISPONÍVEL:\n";

        if (fs.existsSync(acervoPath)) {
            const pastas = fs.readdirSync(acervoPath);
            pastas.forEach(pasta => {
                const caminhoSubpasta = path.join(acervoPath, pasta);
                if (fs.lstatSync(caminhoSubpasta).isDirectory()) {
                    const arquivos = fs.readdirSync(caminhoSubpasta);
                    arquivos.forEach(arquivo => {
                        // Só lê arquivos de texto (.txt) para extrair parâmetros WEG e NR-10
                        if (arquivo.endsWith('.txt')) {
                            const conteudo = fs.readFileSync(path.join(caminhoSubpasta, arquivo), 'utf8');
                            conhecimentoExtraido += `\n--- INÍCIO DO MANUAL: ${arquivo} ---\n${conteudo}\n--- FIM DO MANUAL ---\n`;
                        }
                    });
                }
            });
        }
        return conhecimentoExtraido;
    } catch (error) {
        console.error("Erro ao ler acervo:", error);
        return "Erro ao carregar base de dados técnica.";
    }
}

/**
 * ROTA /chat: O borne de conexão do seu Frontend
 */
app.post('/chat', async (req, res) => {
    try {
        const { question, image } = req.body;
        const acervo = await buscarConhecimentoTecnico();

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Instrução de Sistema focada em Segurança (NR-10) e Manuais
        const promptSistema = `
            Você é o ElectroExpert-AI, um assistente técnico especialista em elétrica industrial.
            Sua prioridade absoluta é a SEGURANÇA DO OPERADOR seguindo a NR-10.
            
            Use os dados abaixo extraídos dos manuais para responder com precisão sobre inversores WEG e normas:
            ${acervo}

            Se a pergunta for sobre um parâmetro que não está no texto acima, avise que não encontrou no acervo específico, mas dê a resposta técnica geral baseada em normas.
            Pergunta do usuário: ${question}
        `;

        const promptConfig = [promptSistema];

        // Se houver imagem (diagnóstico por foto)
        if (image) {
            promptConfig.push({
                inlineData: {
                    data: image,
                    mimeType: "image/jpeg"
                }
            });
        }

        const result = await model.generateContent(promptConfig);
        const response = await result.response;
        res.json({ answer: response.text() });

    } catch (error) {
        console.error("Erro no servidor:", error);
        res.status(500).json({ answer: "⚠️ Erro no servidor. Verifique a fiação lógica (API KEY) ou tente novamente." });
    }
});

app.listen(port, () => {
    console.log(`⚡ ElectroExpert Online na porta ${port}`);
});