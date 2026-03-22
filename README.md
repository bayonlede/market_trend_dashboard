# QuantEdge — Stock Market Intelligence Platform

ML-powered stock dashboard with FastAPI backend, vanilla JS frontend, and Streamlit analytics app.

---

## Project Structure

```
quantedge/
├── backend/
│   ├── main.py              FastAPI app — all API endpoints
│   ├── requirements.txt
│   ├── Dockerfile
│   └── railway.toml         Railway build + deploy config
│
├── frontend/
│   ├── index.html           Complete SPA — all 5 pages in one file
│   ├── nginx.conf           Nginx template — proxies /api → backend
│   ├── Dockerfile
│   └── railway.toml
│
├── streamlit_app/
│   ├── app.py               5-page Streamlit dashboard
│   ├── requirements.txt
│   ├── Dockerfile
│   └── railway.toml
│
├── models/
│   └── README.md            Drop .pkl files here (excluded from git)
│
├── docker-compose.yml       Local dev only
├── .gitignore
└── README.md
```

---

## Quick Start — Local

```bash
# 1. Clone your repo after pushing
git clone https://github.com/YOUR_USERNAME/quantedge.git
cd quantedge

# 2. Add model files (if you have them)
cp /path/to/best_model.pkl    models/
cp /path/to/scaler.pkl        models/
cp /path/to/label_encoder.pkl models/

# 3. Run everything with Docker Compose
docker-compose up --build

# 4. Open in browser
#   Frontend  → http://localhost:3000
#   API docs  → http://localhost:8000/docs
#   Streamlit → http://localhost:8501
```

---

## Deploy to Railway

### Prerequisites
- Railway account (railway.com) — Hobby plan recommended ($5/month)
- Railway CLI installed: `npm install -g @railway/cli`
- GitHub account

### Step 1 — Push to GitHub

```bash
cd quantedge
git init
git add .
git commit -m "Initial commit — QuantEdge dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/quantedge.git
git push -u origin main
```

### Step 2 — Create Railway project

```bash
# Login
railway login

# Create a new project
railway init
# → Select "Empty Project", name it "QuantEdge"
```

### Step 3 — Deploy the FastAPI Backend

In the Railway dashboard:
1. **New Service** → **GitHub Repo** → select `quantedge`
2. **Settings** → **Root Directory** → set to `/backend`
3. **Name** the service `quantedge-api`
4. **Variables** tab → add:
   ```
   PYTHONUNBUFFERED = 1
   ```
5. **Settings** → **Networking** → **Generate Domain**
6. Copy the domain: `https://quantedge-api.up.railway.app`

Verify it's working:
```bash
curl https://quantedge-api.up.railway.app/health
# → {"status":"healthy","model_loaded":false,...}
```

### Step 4 — Upload Model Files (optional but enables real ML)

```bash
# Link CLI to the backend service
railway service quantedge-api

# Copy each model file into the running container
railway volume cp ./models/best_model.pkl    /app/models/best_model.pkl
railway volume cp ./models/scaler.pkl        /app/models/scaler.pkl
railway volume cp ./models/label_encoder.pkl /app/models/label_encoder.pkl

# Redeploy to pick up the files
railway redeploy

# Verify
curl https://quantedge-api.up.railway.app/health
# → {"status":"healthy","model_loaded":true,...}
```

### Step 5 — Deploy the Frontend

1. **New Service** → **GitHub Repo** → select `quantedge`
2. **Settings** → **Root Directory** → set to `/frontend`
3. **Name** the service `quantedge-ui`
4. **Variables** tab → add:
   ```
   BACKEND_URL = https://quantedge-api.up.railway.app
   ```
5. **Settings** → **Networking** → **Generate Domain**

The frontend will be live at: `https://quantedge-ui.up.railway.app`

### Step 6 — Deploy Streamlit (optional)

1. **New Service** → **GitHub Repo** → select `quantedge`
2. **Settings** → **Root Directory** → set to `/streamlit_app`
3. **Name** the service `quantedge-streamlit`
4. **Variables** tab → add:
   ```
   API_BASE_URL   = https://quantedge-api.up.railway.app
   PYTHONUNBUFFERED = 1
   ```
5. **Settings** → **Networking** → **Generate Domain**

---

## Environment Variables Reference

### Backend service
| Variable | Value | Purpose |
|---|---|---|
| `PORT` | auto (Railway injects) | Server port |
| `PYTHONUNBUFFERED` | `1` | Flush logs to Railway immediately |

### Frontend service
| Variable | Value | Purpose |
|---|---|---|
| `PORT` | auto (Railway injects) | Nginx listen port |
| `BACKEND_URL` | `https://quantedge-api.up.railway.app` | Backend URL for Nginx proxy |

### Streamlit service
| Variable | Value | Purpose |
|---|---|---|
| `PORT` | auto (Railway injects) | Streamlit port |
| `API_BASE_URL` | `https://quantedge-api.up.railway.app` | Backend URL for API calls |
| `PYTHONUNBUFFERED` | `1` | Flush logs to Railway immediately |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check + model status |
| GET | `/docs` | Swagger interactive API docs |
| GET | `/api/market/overview` | S&P 500, NASDAQ, VIX, regime |
| GET | `/api/stocks` | Stock list with filter/sort/limit |
| GET | `/api/stocks/{ticker}` | Single stock + 252-day history |
| GET | `/api/stocks/{ticker}/indicators` | 22 technical indicators |
| GET | `/api/analytics/sector-performance` | Avg return + volume by sector |
| GET | `/api/analytics/regime-heatmap` | Sector × regime performance matrix |
| GET | `/api/analytics/top-performers` | Top 10 and bottom 10 companies |
| GET | `/api/analytics/volume-distribution` | Sector volume share |
| POST | `/api/predict` | ML trend prediction |
| POST | `/api/predict/batch` | Batch predictions |
| GET | `/api/model/info` | Feature importance + model metrics |

### Prediction request example

```bash
curl -X POST https://quantedge-api.up.railway.app/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "rsi_14": 65.2, "macd": 1.8, "macd_histogram": 0.6,
    "bb_width": 0.14, "volume_ratio": 1.3, "momentum_10": 4.5,
    "momentum_20": 6.2, "price_to_sma_50": 1.04,
    "volatility_20": 0.019, "atr_14": 3.1,
    "daily_return": 0.8, "vix_close": 16.5
  }'
```

Response:
```json
{
  "prediction": "Uptrend",
  "confidence": 0.7842,
  "probabilities": {"Downtrend": 0.0821, "Sideways": 0.1337, "Uptrend": 0.7842},
  "model": "RandomForest",
  "timestamp": "2025-01-15T14:32:11.204Z"
}
```

---

## Frontend Pages

| Page | Description |
|---|---|
| Dashboard | Live ticker tape, index bar, most-active table, sector returns |
| Markets | Filterable/sortable table of all 20 stocks |
| Analytics | Sector charts, regime heatmap, top/bottom performers, volume pie |
| ML Predictor | 12 feature sliders, presets, confidence gauges, feature importance |
| Stock Detail | Price chart with SMA overlay, 8 indicator cards |

---

## Continuous Deployment

Railway auto-deploys on every `git push` to `main`:

```bash
# Make changes, then:
git add .
git commit -m "fix: update prediction endpoint"
git push origin main
# Railway detects the push → builds → deploys automatically
```

Watch deployment logs:
```bash
railway logs --service quantedge-api --follow
```

---

## Useful Railway CLI Commands

```bash
railway status                          # Project overview
railway logs --service quantedge-api   # View backend logs
railway logs --service quantedge-ui    # View frontend logs
railway shell --service quantedge-api  # Shell into container
railway variables list                  # Show env vars
railway variables set KEY=VALUE         # Set env var
railway redeploy                        # Force redeploy
railway domain                          # Show service URL
railway open                            # Open dashboard in browser
```

---

## Troubleshooting

**Health check fails / service crashes**
→ Check the Dockerfile CMD uses shell form with `${PORT:-8000}`, not exec form with hardcoded port.

**Frontend shows blank data**
→ Verify `BACKEND_URL` env var is set correctly in the frontend service (no trailing slash).

**`model_loaded: false`**
→ Model files not in `/app/models/`. Run `railway shell` and check `ls -lh /app/models/`.

**CORS errors in browser**
→ Backend has `allow_origins=["*"]` — if still getting CORS, check `BACKEND_URL` has correct protocol (`https://`).

**Build fails: Dockerfile not found**
→ Root Directory not set. Go to Service → Settings → Root Directory → set to `/backend`, `/frontend`, or `/streamlit_app`.
