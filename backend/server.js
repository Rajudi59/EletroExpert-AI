const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Configuração para o Gemini 2.0
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Função de leitura de manuais (com tratamento de erro para evitar o 500)
function lerArquivosTecnicos() {
    try {
        const caminhoAcervo = path.join(__dirname, '../frontend', 'acervo', 'inversores');
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
    } catch (err) {
        return "Erro ao acessar base de dados técnica.";
    }
}

app.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        // IMPORTANTE: Chamando o modelo 2.0 Flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const acervo = lerArquivosTecnicos();
        const promptSistema = `Você é o ElectroExpert-AI, especialista em inversores e segurança elétrica.
        Use estes manuais: ${acervo}
        REGRA DE SEGURANÇA: Sempre mencione o uso de EPIs e conformidade com NR-10.
        Pergunta: ${question}`;

        const result = await model.generateContent(promptSistema);
        res.json({ answer: result.response.text() });
    } catch (error) {
        console.error("ERRO DETALHADO:", error);
        res.status(500).json({ answer: "⚠️ Erro de conexão com o motor 2.0. Verifique a chave na Railway e faça Redeploy." });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(port, () => console.log(`🚀 Motor Gemini 2.0 Online na porta ${port}`));