# REQUIREMENT: Être entièrement exécutable via un Dockerfile
FROM node:20-slim

# Axios/Cheerio implementation - no Chromium needed
# System deps (CA certs for HTTPS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# REQUIREMENT: Le Dockerfile doit permettre de définir dynamiquement une URL de proxy
ARG PROXY_URL=""
ENV PROXY_URL=${PROXY_URL}

# REQUIREMENT: Stocker les fichiers HTML dans un dossier local monté depuis l'hôte
ENV OUTPUT_DIR="/app/output"

# REQUIREMENT: Crawler 200 pages
ENV MAX_PAGES=200

# Base URL configuration
ENV BASE_URL="https://www.carzone.ie"

# Default runtime configuration (can be overridden at runtime)
# ENV START_URLS=https://www.carzone.ie/cars \
ENV START_URLS=https://www.carzone.ie \
    CRAWL_DELAY_MIN=0.5 \
    CRAWL_DELAY_MAX=2.0 \
    REQUEST_TIMEOUT=20 \
    LOG_LEVEL=INFO

# REQUIREMENT: Stocker les fichiers HTML dans un dossier local monté depuis l'hôte
# RUN mkdir -p /app/html && chmod 777 /app/html

# # The volume where HTML files will be stored (html directory)
# VOLUME ["/app/html"]


# Create and set permissions for output directory
RUN mkdir -p ${OUTPUT_DIR} && chmod 777 ${OUTPUT_DIR}

# The volume where crawl results will be stored
VOLUME ["${OUTPUT_DIR}"]


# Create non-root user for security
# RUN useradd -m -u 1000 crawler && chown -R crawler:crawler /app
# USER crawler


CMD ["node", "dist/index2.js"]
# CMD ["node", "dist/index.js"]