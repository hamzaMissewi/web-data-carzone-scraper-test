FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System deps (CA certs for HTTPS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# App code
COPY app /app/app

# Default runtime configuration (can be overridden at runtime)
ENV OUTPUT_DIR=/data \
    PROXY_URL= \
    START_URLS=https://www.carzone.ie/cars \
    MAX_PAGES=200 \
    CRAWL_DELAY_MIN=0.5 \
    CRAWL_DELAY_MAX=2.0 \
    REQUEST_TIMEOUT=20 \
    LOG_LEVEL=INFO

# Create data dir (host should mount /data)
RUN mkdir -p /data

# Run the crawler automatically
CMD ["python", "-m", "app.crawler"]
