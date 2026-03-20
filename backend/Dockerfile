FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Application code
COPY . .

# Railway dynamically assigns $PORT — do NOT hardcode
EXPOSE $PORT

# Shell form required so $PORT env var is expanded at runtime
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
