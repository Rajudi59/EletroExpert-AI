FROM node:18

# Define o local de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./
RUN npm install

# Copia TODOS os arquivos (Isso vai levar a pasta frontend e acervo para o servidor)
COPY . .

# Informa a porta correta
EXPOSE 3000

# O COMANDO CORRETO: Aponta para a pasta backend
CMD ["node", "backend/app.js"]