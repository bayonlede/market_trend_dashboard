FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Default values — Railway overrides PORT and API_BASE_URL at runtime via Variables tab
ENV PORT=8501
ENV API_BASE_URL=http://localhost:8000

# Railway reads EXPOSE at build time — must be hardcoded
EXPOSE 8501

# Plain shell form — $PORT is injected by Railway at runtime.
# PORT must be set to 8501 in Railway's Variables tab.
CMD streamlit run app.py --server.port $PORT --server.address :: --server.headless true --browser.gatherUsageStats false
