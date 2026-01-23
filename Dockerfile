FROM node:18

# Define o local de trabalho dentro do servidor
WORKDIR /app

# Copia as dependências e instala
COPY package*.json ./
RUN npm install

# Copia TODOS os arquivos e pastas (frontend, acervo, backend, etc.)
COPY . .

# Informa a porta que a Railway utiliza
EXPOSE 3000

# AJUSTE AQUI: O diagnóstico mostrou que o app.js está na raiz do servidor
CMD ["node", "app.js"]