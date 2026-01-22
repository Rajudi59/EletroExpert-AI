const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function buscarConhecimentoTecnico() {
  // AJUSTE DE CAMINHO: __dirname garante que ele ache a pasta independente de onde rode
  const baseDir = path.join(__dirname, '..', 'acervo');
  
  let textoAcumulado = "";
  const pastas = ['Inversores', 'Motores', 'CLP_Logica', 'Diagramas', 'Normas_Regulamentadoras', 'Sensores'];

  console.log("Iniciando leitura do acervo em:", baseDir);

  for (const pasta of pastas) {
    const caminhoPasta = path.join(baseDir, pasta);
    
    if (fs.existsSync(caminhoPasta)) {
      const arquivos = fs.readdirSync(caminhoPasta);
      
      for (const arquivo of arquivos) {
        if (arquivo.toLowerCase().endsWith('.pdf')) {
          const caminhoArquivo = path.join(caminhoPasta, arquivo);
          
          try {
            const dataBuffer = fs.readFileSync(caminhoArquivo);
            const data = await pdf(dataBuffer);
            
            // Limitamos um pouco o texto para não estourar a memória da Vercel
            const textoLimpo = data.text.substring(0, 5000); 
            textoAcumulado += `\n[FONTE: ${arquivo}]\n${textoLimpo}\n`;
            
          } catch (e) {
            console.error(`Falha no arquivo ${arquivo}:`, e.message);
          }
        }
      }
    }
  }

  return textoAcumulado || "Aviso: Base de dados offline. Use o conhecimento geral de NR-10 e Manutenção.";
}

module.exports = { buscarConhecimentoTecnico };