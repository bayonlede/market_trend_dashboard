# QuantEdge — Stock Market Intelligence Platform

A full-stack ML-powered stock market dashboard built from your Jupyter notebook analysis.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        QuantEdge                            │
├───────────────┬───────────────────┬────────────────────────┤
│  React + Vite │   FastAPI + Uvicorn│  Streamlit             │
│  Port: 3000   │   Port: 8000       │  Port: 8501            │
│  Yahoo-style  │   REST API + ML    │  Data science UI       │
│  dark UI      │   prediction       │  (alternative view)    │
└───────────────┴───────────────────┴────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │  models/  │
                    │  *.pkl    │
                    └───────────┘
```

---

## 📁 Project Structure

```
stock_dashboard/
├── backend/
│   ├── main.py                  # FastAPI app — all endpoints
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router
│   │   ├── main.jsx             # Entry point
│   │   ├── index.css            # Global styles + animations
│   │   ├── utils/api.js         # Axios API helpers
│   │   ├── components/
│   │   │   └── Layout.jsx       # Sidebar + live ticker tape + index bar
│   │   └── pages/
│   │       ├── Dashboard.jsx    # Market overview + most-active table
│   │       ├── StocksPage.jsx   # Filterable / sortable market table
│   │       ├── AnalyticsPage.jsx# EDA: sector, heatmap, scatter, radar
│   │       ├── PredictorPage.jsx# Interactive ML predictor + gauges
│   │       └── StockDetail.jsx  # Price chart + 22 technical indicators
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   ├── nginx.conf
│   └── Dockerfile
│
├── streamlit_app/
│   ├── app.py                   # Complete 5-page Streamlit dashboard
│   ├── requirements.txt
│   └── Dockerfile
│
├── models/                      # ← DROP YOUR .pkl FILES HERE
│   ├── best_model.pkl
│   ├── scaler.pkl
│   └── label_encoder.pkl
│
├── data/                        # ← Optional: place CSVs here
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Local)

### 1. Place your model artifacts
```bash
cp /path/to/best_model.pkl    stock_dashboard/models/
cp /path/to/scaler.pkl        stock_dashboard/models/
cp /path/to/label_encoder.pkl stock_dashboard/models/
```

### 2. Start the FastAPI backend
```bash
cd stock_dashboard/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# API docs available at:  http://localhost:8000/docs
```

### 3. Start the React frontend
```bash
cd stock_dashboard/frontend
npm install
npm run dev
# → http://localhost:3000
```

### 4. (Optional) Start Streamlit
```bash
cd stock_dashboard/streamlit_app
pip install -r requirements.txt
streamlit run app.py
# → http://localhost:8501
```

---

## 🐳 Docker (Full Stack)

```bash
# Build and run everything
cd stock_dashboard
docker-compose up --build

# Services:
#   React UI   → http://localhost:3000
#   FastAPI    → http://localhost:8000/docs
#   Streamlit  → http://localhost:8501
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/market/overview` | S&P500, NASDAQ, VIX, regime |
| GET | `/api/stocks` | Most active with `?sector=&sort_by=&order=&limit=` |
| GET | `/api/stocks/{ticker}` | Stock detail + 252-day history |
| GET | `/api/stocks/{ticker}/indicators` | All 22 technical indicators |
| GET | `/api/analytics/sector-performance` | Avg daily return + volume by sector |
| GET | `/api/analytics/regime-heatmap` | Sector × market-regime matrix |
| GET | `/api/analytics/top-performers` | Top 10 / bottom 10 companies |
| GET | `/api/analytics/volume-distribution` | Sector volume share |
| GET | `/api/analytics/market-index-correlation` | Scatter data for S&P/NASDAQ |
| POST | `/api/predict` | Single ML prediction |
| POST | `/api/predict/batch` | Batch ML predictions |
| GET | `/api/model/info` | Feature importance, metrics |

### Example prediction request
```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "rsi_14": 65.2,
    "macd": 1.8,
    "macd_histogram": 0.6,
    "bb_width": 0.14,
    "volume_ratio": 1.3,
    "momentum_10": 4.5,
    "momentum_20": 6.2,
    "price_to_sma_50": 1.04,
    "volatility_20": 0.019,
    "atr_14": 3.1,
    "daily_return": 0.8,
    "vix_close": 16.5
  }'
```

Response:
```json
{
  "prediction": "Uptrend",
  "confidence": 0.7842,
  "probabilities": {
    "Downtrend": 0.0821,
    "Sideways": 0.1337,
    "Uptrend": 0.7842
  },
  "model": "RandomForest",
  "timestamp": "2024-01-15T14:32:11.204Z"
}
```

---

## 📊 React Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Index bar, most-active table with sparklines, sector returns |
| Markets | `/stocks` | Full sortable/filterable leaderboard |
| Stock Detail | `/stocks/:ticker` | Price chart (1W–1Y), SMA overlay, 22 indicator panels |
| Analytics | `/analytics` | Sector bars, regime heatmap, scatter plots, radar chart |
| ML Predictor | `/predictor` | Sliders for all 12 features, confidence gauges, feature importance |

---

## 🤖 ML Model

The predictor uses your trained RandomForest model with 12 features:

| Feature | Importance |
|---------|-----------|
| RSI (14) | 14.2% |
| Daily Return | 13.1% |
| MACD | 11.8% |
| Momentum 10d | 10.4% |
| Momentum 20d | 9.9% |
| Price/SMA50 | 8.7% |

**Target classes:** Uptrend (+2%), Sideways (±2%), Downtrend (-2%) — 5-day forward return

**Accuracy:** ~82.6% | **Macro F1:** ~82.1%

---

## 🔧 Environment Variables

Create `frontend/.env` for custom API URL:
```env
VITE_API_URL=http://localhost:8000
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, React Query |
| Backend | FastAPI, Uvicorn, Pydantic v2 |
| ML | scikit-learn, XGBoost, joblib |
| Alt UI | Streamlit, Plotly |
| Container | Docker, Docker Compose, Nginx |
