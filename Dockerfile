# Use uma imagem Node.js oficial mais recente e segura
FROM node:20-bullseye-slim

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema necessárias para o Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libgconf-2-4 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libgconf-2-4 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copiar package.json e package-lock.json (se existir)
COPY package*.json ./

# Instalar dependências do Node.js
RUN npm install

# Instalar navegadores do Playwright
RUN npx playwright install chromium

# Instalar dependências do sistema para os navegadores
RUN npx playwright install-deps chromium

# Copiar código-fonte
COPY . .

# Criar diretório para screenshots se necessário
RUN mkdir -p /app/screenshots

# Expor porta
EXPOSE 3000

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
