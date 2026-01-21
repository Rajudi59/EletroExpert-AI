const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function buscarConhecimentoTecnico() {
  const baseDir = path.join(__dirname, '../../acervo');
  let textoAcumulado = "";

  // Pastas que queremos monitorar automaticamente
  const pastas = ['Inversores', 'Motores', 'CLP_Logica', 'Diagramas', 'Normas_Regulamentadoras'];

  for (const pasta of pastas) {
    const caminhoPasta = path.join(baseDir, pasta);
    if (fs.existsSync(caminhoPasta)) {
      const arquivos = fs.readdirSync(caminhoPasta);
      
      for (const arquivo of arquivos) {
        if (arquivo.toLowerCase().endsWith('.pdf')) {
          const caminhoArquivo = path.join(caminhoPasta, arquivo);
          const dataBuffer = fs.readFileSync(caminhoArquivo);
          try {
            const data = await pdf(dataBuffer);
            textoAcumulado += `\n--- Conteúdo do Manual: ${arquivo} ---\n${data.text}\n`;
          } catch (e) {
            console.error(`Erro ao ler ${arquivo}:`, e);
          }
        }
      }
    }
  }
  return textoAcumulado;
}

module.exports = { buscarConhecimentoTecnico };
