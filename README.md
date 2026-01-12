# CarZone.ie Crawler

A Dockerized Python crawler designed to scrape car listing pages from `carzone.ie`. It utilizes `curl_cffi` to mimic real browser TLS fingerprints (Chrome), effectively bypassing anti-bot protections (like Cloudflare or 403 blocks) while extracting HTML content.

## ✨ Features

- **🛡️ Anti-Bot Bypass**: Uses `curl_cffi` to impersonate a Chrome browser (TLS Fingerprinting).
- **🐳 Dockerized**: Zero-setup deployment.
- **🔄 Proxy Support**: Fully configurable via environment variables.
- **⏱️ Smart Rate Limiting**: Random delays (1.5s - 2s) to behave like a human user.
- **💾 Local Storage**: Saves raw HTML files and source URLs locally.

## 🛠️ Prerequisites

- **Docker** installed on your machine.

## 🚀 Quick Start

### 1. Build the Docker Image

First, build the image locally.

```bash
docker build -t carzone-crawler .
```

### 2. Run the Crawler

Run the container to start crawling. The data will be saved to your local `./output` folder.

**Windows (PowerShell):**

```powershell
# Create output folder
mkdir output

# Run crawler
docker run --rm -v "${PWD}/output:/app/output" carzone-crawler
```

**Linux/Mac:**

```bash
docker run --rm -v "$(pwd)/output:/app/output" carzone-crawler
```

### 3. Run with Proxy (Optional)

To route requests through a proxy server:

```bash
docker run --rm \
  -v "${PWD}/output:/app/output" \
  -e PROXY_URL="http://user:pass@proxy-host:port" \
  carzone-crawler
```

---

## ⚙️ Configuration

You can configure the crawler behavior using Environment Variables:

| Variable     | Description                              | Default                  |
| :----------- | :--------------------------------------- | :----------------------- |
| `MAX_PAGES`  | Total number of car listings to crawl    | `200`                    |
| `PROXY_URL`  | HTTP/HTTPS Proxy URL                     | `None`                   |
| `BASE_URL`   | Target website URL                       | `https://www.carzone.ie` |
| `OUTPUT_DIR` | Internal container path for saving files | `/app/output`            |

---

## 📂 Project Structure

```text
├── crawler.py           # Main logic (curl_cffi, bs4, logging)
├── Dockerfile           # Optimized setup (non-root user, multi-stage)
├── requirements.txt     # Dependencies (curl_cffi, lxml, bs4)
├── README.md            # Documentation
└── output/              # (Generated) Stores .html pages and .txt metadata
```

## 🧠 Technical Details

1.  **Impersonation**: The crawler replaces standard `requests` with `curl_cffi` to send a TLS Client Hello that matches Google Chrome. This prevents the server from identifying the client as a Python script.
2.  **Discovery Loop**: It iterates through search pagination (`/used-cars?page=X`) to find unique car listing URLs.
3.  **Extraction**: Once a unique car URL is found, it downloads the HTML content using the `lxml` parser for speed.
4.  **Resilience**: Robust error handling captures HTTP errors (like 403s or 500s) without crashing the entire process.

## ⚠️ Troubleshooting

**Getting `403 Forbidden` errors?**

- Ensure you are using the latest version of the code (check `requirements.txt` includes `curl_cffi`).
- Rebuild your Docker image to ensure no old cache is used: `docker build --no-cache -t carzone-crawler .`
