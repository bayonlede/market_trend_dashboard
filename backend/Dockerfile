FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway reads EXPOSE at build time — must be hardcoded, not a variable
EXPOSE 8000

# Plain shell form CMD — $PORT is injected by Railway at runtime.
# PORT must be set to 8000 in Railway's Variables tab.
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
