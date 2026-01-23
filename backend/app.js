import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: `Você é o especialista técnico sênior do ElectroExpert.
    1. SEGURANÇA: Use [ALERTA] para normas NR10/NBR5410. Priorize a segurança do operador.
    2. CONTEÚDO: Use [TECNICO] para detalhes.
    3. VISÃO: Identifique Marca/Modelo em fotos.
    4. ORIGEM: Cite se é ACERVO LOCAL ou PESQUISA EXTERNA.`
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- FUNÇÕES AUXILIARES (PDF E BUSCA) ---
async function lerPdfRobusto(caminho) {
    try {
        const dataBuffer = new Uint8Array(fs.readFileSync(caminho));
        const loadingTask = pdfjs.getDocument({ data: dataBuffer, disableFontFace: true });
        const pdf = await loadingTask.promise;
        let texto = "";
        for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
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

// --- 1. CIRCUITO DE API (CÉREBRO DA IA) ---
// Deve vir antes da rota coringa para não ser bloqueado
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
        const text = result.response.text();
        res.json({ answer: text, alerta: "Consulte sempre as Normas NR10." });
    } catch (error) {
        console.error("Erro na API:", error);
        res.status(500).json({ answer: "Erro técnico ao processar consulta." });
    }
});

// --- 2. LOCALIZAÇÃO DO FRONTEND (INTERFACE) ---
const caminhosParaTestar = [
    path.join(process.cwd(), "frontend"),
    path.join(__dirname, "frontend"),
    path.join(__dirname, "..", "frontend"),
    process.cwd()
];

let caminhoFinal = "";
for (const pasta of caminhosParaTestar) {
    if (fs.existsSync(path.join(pasta, "index.html"))) {
        caminhoFinal = pasta;
        break;
    }
}

// --- 3. CIRCUITO DE ENTREGA DO SITE ---
if (caminhoFinal) {
    app.use(express.static(caminhoFinal));
    
    // ROTA CORINGA: Atende qualquer pedido que não seja a API
    app.get("*", (req, res) => {
        res.sendFile(path.join(caminhoFinal, "index.html"));
    });
    console.log(`✅ Interface técnica carregada de: ${caminhoFinal}`);
} else {
    app.get("/", (req, res) => {
        res.status(404).send("Erro: Arquivo index.html não localizado no servidor.");
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Online na Porta ${PORT}!`));