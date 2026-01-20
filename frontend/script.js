async function enviarPergunta() {
    const pergunta = document.getElementById("pergunta").value;
    const respostaDiv = document.getElementById("resposta");

    if (!pergunta.trim()) {
        alert("Digite uma pergunta antes de enviar!");
        return;
    }

    respostaDiv.innerText = "Enviando pergunta...";

    try {
        const response = await fetch("http://localhost:3000/api/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: pergunta })
        });

        const data = await response.json();

        if (data.arquivos && data.arquivos.length > 0) {
            // Exibe cada PDF encontrado e seus trechos
            const html = data.arquivos.map(a => `
                <div style="margin-bottom:15px;">
                    <strong>${a.nome}</strong>
                    <ul>
                        ${a.trechos.map(t => `<li>${t}</li>`).join("")}
                    </ul>
                </div>
            `).join("");

            respostaDiv.innerHTML = `<strong>${data.answer}</strong><br>${html}`;
        } else {
            respostaDiv.innerText = data.answer;
        }

    } catch (error) {
        respostaDiv.innerText = "Erro ao conectar com o backend.";
        console.error(error);
    }
}
