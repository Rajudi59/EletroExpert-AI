const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// FUNÇÃO QUE LÊ APENAS ARQUIVOS .TXT (Rápida e Segura)
function carregarManuaisTexto() {
    try {
        const acervoPath = path.join(process.cwd(), 'frontend', 'acervo');
        let textoFinal = "";

        if (!fs.existsSync(acervoPath)) return "Acervo não encontrado.";

        // Função que vasculha todas as pastas (Inversores, etc)
        const lerPastas = (diretorio) => {
            const itens = fs.readdirSync(diretorio);
            itens.forEach(item => {
                const caminho = path.join(diretorio, item);
                if (fs.statSync(caminho).isDirectory()) {
                    lerPastas(caminho);
                } else if (item.toLowerCase().endsWith('.txt')) {
                    const conteudo = fs.readFileSync(caminho, 'utf8');
                    // Adicionamos o nome do arquivo para a IA saber a origem
                    textoFinal += `\n--- MANUAL: ${item} ---\n${conteudo.substring(0, 20000)}\n`;
                }
            });
        };

        lerPastas(acervoPath);
        return textoFinal || "Nenhum arquivo .txt localizado.";
    } catch (error) {
        console.error("Erro na leitura:", error);
        return "Erro ao processar manuais técnicos.";
    }
}

app.post('/chat', async (req, res) => {
    try {
        const { question, image } = req.body;
        
        // Carrega o conteúdo dos manuais em milissegundos
        const conhecimento = carregarManuaisTexto();
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const promptSistema = `Você é o ElectroExpert-AI, especialista em manutenção elétrica.
        Aqui estão os dados técnicos extraídos dos manuais disponíveis nas pastas:
        ${conhecimento}

        REGRAS IMPORTANTES:
        1. Responda com base nos manuais acima. Se encontrar a solução, cite o nome do arquivo.
        2. Priorize SEMPRE a segurança do técnico e as normas (NR-10).
        3. Se a pergunta for sobre um parâmetro (ex: P0101), procure nos dados acima.
        
        PERGUNTA DO TÉCNICO: ${question}`;

        const result = await model.generateContent([
            promptSistema,
            ...(image ? [{ inlineData: { data: image, mimeType: "image/jpeg" }}] : [])
        ]);

        res.json({ answer: result.response.text() });
    } catch (error) {
        console.error("Erro Chat:", error);
        res.status(500).json({ answer: "⚠️ Erro interno. Verifique a conexão com a API do Google." });
    }
});

app.listen(port, () => console.log(`⚡ ElectroExpert operando com manuais TXT na porta ${port}`));