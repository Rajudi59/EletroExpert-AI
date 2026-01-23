import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração da API
const API_KEY = process.env.GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: `Você é o especialista técnico sênior do ElectroExpert. 
    Priorize NR10 e NBR5410. Identifique marcas/modelos em fotos.`
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- 1. ROTAS DE API (Cérebro) ---
app.post("/api/ask", async (req, res) => {
    const { question, image } = req.body;
    try {
        const caminhoAcervo = path.join(process.cwd(), "acervo");
        const todosPDFs = buscarArquivos(caminhoAcervo);
        let contexto = "";
        for (const caminho of todosPDFs) {
            contexto += `\n--- MANUAL: ${path.basename(caminho)} ---\n${await lerPdfRobusto(caminho)}\n`;
        }
        const contentParts = [{ text: `ACERVO:\n${contexto.substring(0, 700000)}\nPERGUNTA: ${question}` }];
        if (image) contentParts.push({ inlineData: { mimeType: "image/jpeg", data: image } });

        const result = await model.generateContent(contentParts);
        res.json({ answer: result.response.text(), alerta: "Consulte a NR10." });
    } catch (error) {
        res.status(500).json({ answer: "Erro técnico na IA." });
    }
});

// --- 2. LOCALIZAÇÃO DO FRONTEND (O SALTO DE PASTA) ---
// Como o app.js está em /backend, precisamos subir um nível (..) para achar a /frontend
const raizDoProjeto = process.cwd(); 
const pastaFrontend = path.join(raizDoProjeto, "frontend");
const caminhoIndex = path.join(pastaFrontend, "index.html");

// --- 3. ENTREGA DA INTERFACE ---
if (fs.existsSync(caminhoIndex)) {
    // Serve os arquivos (CSS, JS, Imagens)
    app.use(express.static(pastaFrontend));
    
    // Rota coringa para carregar o HTML
    app.get("*", (req, res) => {
        res.sendFile(caminhoIndex);
    });
    console.log(`✅ Sucesso: Interface carregada de ${pastaFrontend}`);
} else {
    // Diagnóstico caso ainda falhe
    app.get("/", (req, res) => {
        res.status(404).send(`Erro: index.html não achado em ${pastaFrontend}. Verifique se a pasta 'frontend' subiu para o GitHub.`);
    });
}

// Funções Auxiliares
async function lerPdfRobusto(caminho) {
    try {
        const dataBuffer = new Uint8Array(fs.readFileSync(caminho));
        const loadingTask = pdfjs.getDocument({ data: dataBuffer, disableFontFace: true });
        const pdf = await loadingTask.promise;
        let texto = "";
        for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            texto += content.items.map(item => item.str).join(" ") + "\n";
        }
        return texto;
    } catch (e) { return ""; }
}

function buscarArquivos(diretorio, lista = []) {
    if (!fs.existsSync(diretorio)) return lista;
    const itens = fs.readdirSync(diretorio);
    for (const item of itens) {
        const caminho = path.join(diretorio, item);
        if (fs.statSync(caminho).isDirectory()) buscarArquivos(caminho, lista);
        else if (item.toLowerCase().endsWith(".pdf")) lista.push(caminho);
    }
    return lista;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Sistema Online na Porta ${PORT}`));