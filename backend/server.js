const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

/* =========================
   CONFIGURAÇÃO IA (GEMINI)
========================= */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Objeto para manter as conversas ativas (Memória)
let sessoesDeChat = {};

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

/* =========================
   GERENCIAMENTO DE ACERVO
========================= */

function listarDiagramas() {
    try {
        const caminho = path.join(frontendPath, 'acervo', 'diagramas');
        if (!fs.existsSync(caminho)) return "Sem diagramas.";
        const arquivos = fs.readdirSync(caminho);
        return arquivos.filter(f => f.match(/\.(jpg|jpeg|png)$/i)).join(', ');
    } catch (err) { return ""; }
}

function lerArquivosTecnicos() {
    try {
        const caminho = path.join(frontendPath, 'acervo', 'inversores');
        if (!fs.existsSync(caminho)) return "";
        const arquivos = fs.readdirSync(caminho);
        let textoTotal = "";
        arquivos.forEach(arq => {
            if (arq.endsWith('.txt')) {
                const conteudo = fs.readFileSync(path.join(caminho, arq), 'utf-8');
                textoTotal += `\n[MANUAL: ${arq}]\n${conteudo}\n`;
            }
        });
        return textoTotal;
    } catch (err) { return ""; }
}

/* =========================
   ROTA DO CHAT COM HISTÓRICO
========================= */
app.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Identificador único de sessão (neste caso simples, um fixo)
        const sessionId = "usuario_atual";

        // Se a sessão não existe, cria o chat com o histórico mestre (System Prompt)
        if (!sessoesDeChat[sessionId]) {
            const acervo = lerArquivosTecnicos();
            const diagramas = listarDiagramas();

            sessoesDeChat[sessionId] = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: `Você é o ElectroExpert-AI. 
                        
                        SUAS REGRAS DE COMPORTAMENTO:
                        1. MEMÓRIA: Mantenha o contexto das mensagens anteriores. Se eu falar sobre uma lâmpada e depois disser "interruptor simples", entenda que é o interruptor para aquela lâmpada.
                        2. EXEMPLOS: Se eu não souber o modelo do inversor ou pedir um exemplo, NÃO insista na pergunta. Forneça uma explicação baseada em um modelo comum (ex: Siemens V20 ou Weg CFW500) como exemplo educativo, deixando claro que é apenas uma referência.
                        3. ACERVO LOCAL: Use estas informações: ${acervo}.
                        4. MARCAS: Se eu pedir Siemens e você só tiver Weg no acervo, use seu conhecimento externo para Siemens, mas avise que é [PESQUISA EXTERNA].
                        5. SEGURANÇA: Priorize sempre NR-10, uso de EPIs e bloqueio de energias.
                        6. DIAGRAMAS DISPONÍVEIS: ${diagramas}. Use [MOSTRAR_DIAGRAMA: nome-do-arquivo.jpg] quando relevante.
                        7. VÍDEOS: Só sugira se eu pedir. Use [BUSCAR_YOUTUBE: termo de pesquisa].` }]
                    },
                    {
                        role: "model",
                        parts: [{ text: "Entendido. Sou o ElectroExpert-AI. Estou pronto para manter o contexto das nossas conversas e fornecer exemplos técnicos mesmo quando os modelos específicos não forem informados, sempre com foco total na segurança elétrica." }]
                    }
                ],
            });
        }

        // Envia a pergunta para a sessão de chat que já tem o histórico
        const result = await sessoesDeChat[sessionId].sendMessage(question);
        const responseText = result.response.text();

        res.json({ answer: responseText });

    } catch (error) {
        console.error("ERRO:", error);
        res.status(500).json({ answer: "⚠️ Erro de comunicação com a IA." });
    }
});

app.get('*', (req, res) => { res.sendFile(path.join(frontendPath, 'index.html')); });

app.listen(port, () => {
    console.log(`🚀 ElectroExpert Online e com Memória em http://localhost:${port}`);
});