const fs = require('fs');
const path = require('path');

async function buscarConhecimentoTecnico() {
  try {
    // Usamos process.cwd() para garantir que começamos da RAIZ do projeto
    const acervoPath = path.join(process.cwd(), 'acervo');
    
    let listaManuais = "O técnico possui os seguintes manuais no acervo: ";
    
    if (fs.existsSync(acervoPath)) {
      const pastas = fs.readdirSync(acervoPath);
      pastas.forEach(pasta => {
        const caminhoPasta = path.join(acervoPath, pasta);
        if (fs.lstatSync(caminhoPasta).isDirectory()) {
          const arquivos = fs.readdirSync(caminhoPasta);
          listaManuais += `\n- Na pasta ${pasta}: ${arquivos.join(', ')}`;
        }
      });
    } else {
      console.log("⚠️ Pasta acervo não encontrada no caminho:", acervoPath);
    }

    return listaManuais + "\nInstrução: Responda como especialista se baseando nesses manuais e na NR-10.";

  } catch (error) {
    console.error("Erro leve no acervo:", error);
    return "Base de manuais offline. Siga protocolos de segurança padrão.";
  }
}

module.exports = { buscarConhecimentoTecnico };