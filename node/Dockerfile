# REQUIREMENT: Être entièrement exécutable via un Dockerfile
FROM node:20-slim

# REQUIREMENT: Le Dockerfile doit permettre de définir dynamiquement une URL de proxy
ARG PROXY_URL=""
ENV PROXY_URL=${PROXY_URL}

# REQUIREMENT: Stocker les fichiers HTML dans un dossier local monté depuis l'hôte
ENV OUTPUT_DIR="/app/output"

# REQUIREMENT: Crawler 200 pages
ENV MAX_PAGES=200

ENV BASE_URL="https://www.carzone.ie"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# REQUIREMENT: Stocker les fichiers HTML dans un dossier local monté depuis l'hôte
RUN mkdir -p /app/output && chmod 777 /app/output

# The volume where HTML files will be stored
VOLUME ["/app/output"]

# REQUIREMENT: Une fois l'image construite et le conteneur lancé, l'exécution doit automatiquement
# Utiliser le proxy spécifié ; Crawler les 200 pages ; Stocker les fichiers HTML
CMD ["node", "dist/crawler.js"]
