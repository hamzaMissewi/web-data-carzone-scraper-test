Open Docker Desktop

Once Docker is running, use these commands:
Build:

# Build Docker image

docker build -t carzone-crawler .
docker build --no-cache -t carzone-crawler .
docker build -t carzone-crawler-ts .

Run (Fixed Syntax):
docker run --rm -v "${PWD}/output:/output" carzone-crawler
docker run --rm -v "${PWD}/output:/app/output" carzone-crawler-ts

# 5. Run avec proxy

docker run -e PROXY_URL="http://proxy:8080" -v $(pwd)/output:/output carzone-crawler

docker build -t carzone-crawler .

powershell -ExecutionPolicy Bypass -File test-docker.ps1
