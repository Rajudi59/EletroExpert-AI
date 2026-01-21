async function enviarPergunta() {
    const perguntaInput = document.getElementById("pergunta");
    const pergunta = perguntaInput.value;
    const respostaDiv = document.getElementById("resposta");

    if (!pergunta.trim()) {
        alert("Por favor, descreva o problema ou a dúvida técnica.");
        return;
    }

    // Feedback visual rápido para o técnico
    respostaDiv.innerHTML = "<strong>⚙️ Analisando Manuais e Diagramas...</strong>";

    try {
        // AJUSTE DE ROTA: Agora aponta para o seu servidor no backend
        const response = await fetch("/server", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: pergunta })
        });

        const data = await response.json();

        // Limpa o campo de pergunta para facilitar a próxima busca
        perguntaInput.value = "";

        // Exibe a resposta da IA (que já leu seus PDFs no backend)
        if (data.answer) {
            // Usamos innerHTML e replace para manter as quebras de linha da IA
            respostaDiv.innerHTML = `<strong>💡 Instrução Técnica:</strong><br>${data.answer.replace(/\n/g, '<br>')}`;
        } else {
            respostaDiv.innerText = "A IA não conseguiu processar a resposta. Tente novamente.";
        }

    } catch (error) {
        respostaDiv.innerHTML = "<span style='color:red;'>⚠️ Erro de conexão com o servidor de manutenção. Verifique o sinal de internet.</span>";
        console.error("Erro no fetch:", error);
    }
}
