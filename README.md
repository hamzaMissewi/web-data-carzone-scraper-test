# CarZone.ie Crawler

A Dockerized Node.js crawler designed to scrape car listing pages from `carzone.ie`. It utilizes `Axios` with `Cheerio` for HTML parsing and includes proxy support with smart rate limiting to effectively bypass anti-bot protections while extracting HTML content.

## ✨ Features

- **🛡️ Anti-Bot Bypass**: Uses random User-Agent rotation and proxy support to mimic real browser behavior.
- **🐳 Dockerized**: Zero-setup deployment with optimized multi-stage build.
- **🔄 Proxy Support**: Fully configurable HTTP/HTTPS and SOCKS proxy support via environment variables.
- **⏱️ Smart Rate Limiting**: Random delays (0.5s - 2s) to behave like a human user.
- **💾 Local Storage**: Saves raw HTML files with numbered filenames to local volume.
- **🔍 TypeScript**: Written in TypeScript for better type safety and maintainability.

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
├── src/
│   ├── index.ts           # Main entry point and configuration
│   ├── crawler.ts         # Core crawler logic (Axios, Cheerio, proxy)
│   ├── logger.ts          # Logging utility
│   └── utils.ts           # Helper functions (URL normalization, etc.)
├── dist/                  # Compiled JavaScript (generated)
├── Dockerfile             # Optimized setup (non-root user, security)
├── package.json           # Node.js dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── README.md              # Documentation
└── output/                # (Generated) Stores .html pages with numbered filenames
```

## 🧠 Technical Details

1.  **User-Agent Rotation**: The crawler randomly selects from a pool of realistic browser User-Agents to mimic different Chrome/Firefox browsers and avoid detection.
2.  **Proxy Integration**: Supports both HTTP/HTTPS and SOCKS proxies with proper agent configuration for request routing.
3.  **Discovery Loop**: Iterates through search pagination (`/cars`, `/used-cars`, etc.) to find unique car listing URLs using Cheerio for link extraction.
4.  **Extraction**: Once a unique car URL is found, it downloads the HTML content using Axios with proper timeout and retry handling.
5.  **Resilience**: Robust error handling captures HTTP errors (like 403s or 500s) without crashing the entire process.
6.  **TypeScript**: Full type safety with compiled JavaScript output for production deployment.

## ⚠️ Troubleshooting

**Getting `403 Forbidden` errors?**

- Ensure you are using the latest version of the code (check `package.json` includes `axios`, `cheerio`, and proxy agents).
- Try using a proxy server with the `PROXY_URL` environment variable.
- Rebuild your Docker image to ensure no old cache is used: `docker build --no-cache -t carzone-crawler .`
- Check that the User-Agent rotation is working by examining the debug logs.

**Build issues?**

- Make sure you have Node.js 20+ and TypeScript installed for local development.
- Run `npm ci` to install dependencies and `npm run build` to compile TypeScript.
- All dependencies are production-ready and optimized for Docker deployment.
