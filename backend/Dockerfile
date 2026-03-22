FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Hardcode the exposed port — Railway reads EXPOSE at build time for health checks.
# Must be a single fixed number, not a variable.
EXPOSE 8000

# Bind to :: (IPv6 wildcard) which also accepts IPv4 on Linux.
# Railway's internal health checker connects over IPv6, so 0.0.0.0 alone fails.
# PORT env var is set to 8000 in Railway Variables tab — matches EXPOSE above.
CMD ["sh", "-c", "uvicorn main:app --host '::' --port ${PORT:-8000}"]
