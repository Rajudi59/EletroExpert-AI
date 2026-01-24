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
 * FUNÇÃO DE BUSCA INTELIGENTE: Navega em subpastas e evita sobrecarga
 */
async function buscarConhecimentoTecnico() {
    try {
        const acervoPath = path.join(process.cwd(), 'frontend', 'acervo');
        let conhecimentoExtraido = "LISTA DE MANUAIS DISPONÍVEIS NO ACERVO:\n";

        if (fs.existsSync(acervoPath)) {
            // Função para listar todos os arquivos em todas as subpastas
            const obterArquivos = (dir, listaDeArquivos = []) => {
                const arquivos = fs.readdirSync(dir);
                arquivos.forEach(arquivo => {
                    const caminhoCompleto = path.join(dir, arquivo);
                    if (fs.statSync(caminhoCompleto).isDirectory()) {
                        obterArquivos(caminhoCompleto, listaDeArquivos);
                    } else {
                        listaDeArquivos.push(caminhoCompleto);
                    }
                });
                return listaDeArquivos;
            };

            const todosArquivos = obterArquivos(acervoPath);
            
            // Filtramos apenas PDFs e TXTs
            const manuaisParaLer = todosArquivos.filter(f => 
                f.toLowerCase().endsWith('.pdf') || f.toLowerCase().endsWith('.txt')
            );

            // Lemos apenas os primeiros manuais para evitar "Erro 500" por tempo excedido
            // Com 8GB de RAM, podemos ler os 5 primeiros arquivos de uma vez com folga
            for (const caminho de manuaisParaLer.slice(0, 5)) {
                const nomeArquivo = path.basename(caminho);
                if (caminho.toLowerCase().endsWith('.pdf')) {
                    const dataBuffer = fs.readFileSync(caminho);
                    const data = await pdf(dataBuffer);
                    conhecimentoExtraido += `\n--- CONTEÚDO DO MANUAL (${nomeArquivo}) ---\n${data.text.substring(0, 8000)}\n`;
                } else {
                    const conteudo = fs.readFileSync(caminho, 'utf8');
                    conhecimentoExtraido += `\n--- DOCUMENTO (${nomeArquivo}) ---\n${conteudo}\n`;
                }
            }
        }
        return conhecimentoExtraido || "O acervo está vazio ou a pasta não foi encontrada.";
    } catch (error) {
        console.error("Erro ao processar acervo:", error);
        return "Erro técnico ao tentar ler os manuais do acervo.";
    }
}

app.post('/chat', async (req, res) => {
    try {
        const { question, image } = req.body;
        
        // Busca o conteúdo dos manuais
        const acervo = await buscarConhecimentoTecnico();
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const promptSistema = `Você é o ElectroExpert-AI, um assistente técnico especializado em elétrica industrial.
        
        ACERVO TÉCNICO DISPONÍVEL:
        ${acervo}

        DIRETRIZES:
        1. Se a pergunta for sobre um parâmetro ou erro, procure nos manuais acima e cite o nome do arquivo.
        2. Se não encontrar a informação exata no acervo, use seu conhecimento mas avise: "Não encontrei no acervo, mas seguindo a prática técnica..."
        3. PRIORIDADE MÁXIMA: Segurança do operador e conformidade com NR-10/NR-12.
        
        PERGUNTA DO TÉCNICO: ${question}`;

        const result = await model.generateContent([
            promptSistema,
            ...(image ? [{ inlineData: { data: image, mimeType: "image/jpeg" }}] : [])
        ]);

        res.json({ answer: result.response.text() });
    } catch (error) {
        console.error("Erro no endpoint de chat:", error);
        res.status(500).json({ answer: "⚠️ Erro no servidor. O manual pode ser muito grande ou a chave API está instável." });
    }
});

app.listen(port, () => console.log(`⚡ ElectroExpert Online - Sistema de Subpastas Operacional`));