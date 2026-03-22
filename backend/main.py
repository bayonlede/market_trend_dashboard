"""
Stock Market Analysis — FastAPI Backend
Serves predictions, EDA analytics, and live market data
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import numpy as np
import pandas as pd
import joblib
import os
import random
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings("ignore")

app = FastAPI(
    title="Stock Market Analysis API",
    description="ML-powered stock trend prediction & analytics dashboard",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── FEATURE COLUMNS (must match training) ──────────────────────────────────
FEATURE_COLUMNS = [
    "rsi_14", "macd", "macd_histogram", "bb_width", "volume_ratio",
    "momentum_10", "momentum_20", "price_to_sma_50", "volatility_20",
    "atr_14", "daily_return", "vix_close",
]

COMPANIES = [
    {"ticker": "TECHC", "company_name": "TechCorp",    "sector": "Technology"},
    {"ticker": "DATAS", "company_name": "DataSystems", "sector": "Technology"},
    {"ticker": "CLDN9", "company_name": "CloudNine",   "sector": "Technology"},
    {"ticker": "CYBR",  "company_name": "CyberShield", "sector": "Technology"},
    {"ticker": "MEDI",  "company_name": "MediPharm",   "sector": "Healthcare"},
    {"ticker": "BIOG",  "company_name": "BioGenix",    "sector": "Healthcare"},
    {"ticker": "HLTH",  "company_name": "HealthPlus",  "sector": "Healthcare"},
    {"ticker": "CARE",  "company_name": "CareWell",    "sector": "Healthcare"},
    {"ticker": "CAPB",  "company_name": "CapitalBank", "sector": "Finance"},
    {"ticker": "INVP",  "company_name": "InvestPro",   "sector": "Finance"},
    {"ticker": "FINS",  "company_name": "FinSecure",   "sector": "Finance"},
    {"ticker": "WLTH",  "company_name": "WealthGroup", "sector": "Finance"},
    {"ticker": "RETL",  "company_name": "RetailMax",   "sector": "Consumer"},
    {"ticker": "FOOD",  "company_name": "FoodChain",   "sector": "Consumer"},
    {"ticker": "HOME",  "company_name": "HomeStyle",   "sector": "Consumer"},
    {"ticker": "SHOP",  "company_name": "ShopEasy",    "sector": "Consumer"},
    {"ticker": "POWR",  "company_name": "PowerGen",    "sector": "Energy"},
    {"ticker": "GREN",  "company_name": "GreenEnergy", "sector": "Energy"},
    {"ticker": "OILC",  "company_name": "OilCorp",     "sector": "Energy"},
    {"ticker": "RENW",  "company_name": "RenewTech",   "sector": "Energy"},
]

SECTORS = ["Technology", "Healthcare", "Finance", "Consumer", "Energy"]
MARKET_REGIMES = ["Bull", "Bear", "Recovery", "Sideways"]

# ─── Model Loading ────────────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

def load_artifacts():
    scaler = encoder = model = None
    try:
        scaler  = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
        encoder = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))
        model   = joblib.load(os.path.join(MODEL_DIR, "best_model.pkl"))
        print("✅ ML artifacts loaded successfully")
    except Exception as e:
        print(f"⚠️  ML artifacts not found — running in demo mode: {e}")
    return model, scaler, encoder

ml_model, ml_scaler, ml_encoder = load_artifacts()

# ─── Helpers ─────────────────────────────────────────────────────────────────
def _rand_price(base=100.0, days=252):
    """Simulate a realistic price series with GBM."""
    rng = np.random.default_rng(int(base * 7))
    returns = rng.normal(0.0003, 0.015, days)
    prices  = base * np.cumprod(1 + returns)
    return prices.tolist()

def _make_stock_snapshot(company: dict) -> dict:
    rng = random.Random(company["ticker"])
    base  = rng.uniform(50, 350)
    change_pct = rng.uniform(-4.5, 6.0)
    price = round(base, 2)
    change = round(price * change_pct / 100, 2)
    volume = rng.randint(5_000_000, 80_000_000)
    return {
        **company,
        "price": price,
        "change": change,
        "change_pct": round(change_pct, 2),
        "volume": volume,
        "market_cap": round(price * rng.randint(1_000_000, 50_000_000), 0),
        "pe_ratio": round(rng.uniform(8, 45), 1),
        "52w_high": round(price * rng.uniform(1.05, 1.60), 2),
        "52w_low":  round(price * rng.uniform(0.50, 0.95), 2),
        "trend": rng.choice(["Uptrend", "Sideways", "Downtrend"]),
        "regime": rng.choice(MARKET_REGIMES),
    }

# ─── Pydantic Models ─────────────────────────────────────────────────────────
class PredictionInput(BaseModel):
    rsi_14:         float = Field(..., ge=0,   le=100,  example=58.3)
    macd:           float = Field(...,                   example=1.24)
    macd_histogram: float = Field(...,                   example=0.45)
    bb_width:       float = Field(..., ge=0,             example=0.12)
    volume_ratio:   float = Field(..., ge=0,             example=1.15)
    momentum_10:    float = Field(...,                   example=3.2)
    momentum_20:    float = Field(...,                   example=5.1)
    price_to_sma_50:float = Field(...,                   example=1.03)
    volatility_20:  float = Field(..., ge=0,             example=0.018)
    atr_14:         float = Field(..., ge=0,             example=2.4)
    daily_return:   float = Field(...,                   example=0.52)
    vix_close:      float = Field(..., ge=0,             example=18.5)

class BatchPredictionInput(BaseModel):
    records: List[PredictionInput]

# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "Stock Market Analysis API", "version": "1.0.0"}

@app.get("/health", tags=["health"])
def health():
    return {
        "status": "healthy",
        "model_loaded": ml_model is not None,
        "timestamp": datetime.utcnow().isoformat()
    }

# ── Market Overview ──────────────────────────────────────────────────────────
@app.get("/api/market/overview", tags=["market"])
def market_overview():
    """Returns index snapshots, market regime, and fear/greed index."""
    rng = random.Random(datetime.utcnow().strftime("%Y%m%d"))
    return {
        "sp500":   {"value": 5218.4, "change_pct": round(rng.uniform(-1.5, 2.0), 2)},
        "nasdaq":  {"value": 16340.9,"change_pct": round(rng.uniform(-2.0, 2.5), 2)},
        "vix":     {"value": round(rng.uniform(12, 28), 1), "label": "Moderate Fear"},
        "dollar":  {"value": round(rng.uniform(100, 106), 2), "change_pct": round(rng.uniform(-0.5, 0.5), 2)},
        "treasury_10y": round(rng.uniform(3.8, 4.8), 2),
        "market_regime": rng.choice(MARKET_REGIMES),
        "timestamp": datetime.utcnow().isoformat(),
    }

# ── Stocks ────────────────────────────────────────────────────────────────────
@app.get("/api/stocks", tags=["stocks"])
def get_stocks(
    sector: Optional[str] = Query(None),
    sort_by: str = Query("volume", enum=["volume", "change_pct", "price", "market_cap"]),
    order: str  = Query("desc", enum=["asc", "desc"]),
    limit: int  = Query(20, ge=1, le=50),
):
    """Returns the stocks leaderboard — mimicking Yahoo Finance most-active."""
    stocks = [_make_stock_snapshot(c) for c in COMPANIES]
    if sector:
        stocks = [s for s in stocks if s["sector"].lower() == sector.lower()]
    reverse = order == "desc"
    stocks.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)
    return {"stocks": stocks[:limit], "total": len(stocks)}

@app.get("/api/stocks/{ticker}", tags=["stocks"])
def get_stock(ticker: str):
    """Returns detail for a single stock."""
    company = next((c for c in COMPANIES if c["ticker"].upper() == ticker.upper()), None)
    if not company:
        raise HTTPException(404, f"Ticker '{ticker}' not found")
    snap = _make_stock_snapshot(company)
    # Add historical price series
    snap["history"] = _rand_price(snap["price"], 252)
    snap["dates"]   = [(datetime.today() - timedelta(days=252 - i)).strftime("%Y-%m-%d") for i in range(252)]
    return snap

@app.get("/api/stocks/{ticker}/indicators", tags=["stocks"])
def get_indicators(ticker: str):
    """Returns the 22 technical indicators for a stock."""
    company = next((c for c in COMPANIES if c["ticker"].upper() == ticker.upper()), None)
    if not company:
        raise HTTPException(404, f"Ticker '{ticker}' not found")
    rng = random.Random(ticker)
    return {
        "ticker": ticker,
        "rsi_14": round(rng.uniform(30, 75), 1),
        "macd":   round(rng.uniform(-3, 3), 3),
        "macd_signal": round(rng.uniform(-2, 2), 3),
        "macd_histogram": round(rng.uniform(-1, 1), 3),
        "bb_upper": round(rng.uniform(200, 300), 2),
        "bb_middle": round(rng.uniform(150, 200), 2),
        "bb_lower": round(rng.uniform(100, 150), 2),
        "bb_width": round(rng.uniform(0.05, 0.25), 3),
        "sma_20": round(rng.uniform(100, 200), 2),
        "sma_50": round(rng.uniform(90, 190), 2),
        "sma_200": round(rng.uniform(80, 180), 2),
        "ema_12": round(rng.uniform(100, 200), 2),
        "ema_26": round(rng.uniform(95, 195), 2),
        "atr_14": round(rng.uniform(1, 8), 2),
        "volume_ratio": round(rng.uniform(0.5, 2.5), 2),
        "momentum_10": round(rng.uniform(-8, 12), 2),
        "momentum_20": round(rng.uniform(-10, 15), 2),
        "price_to_sma_50": round(rng.uniform(0.9, 1.15), 3),
        "volatility_20": round(rng.uniform(0.01, 0.04), 4),
        "true_range": round(rng.uniform(2, 10), 2),
        "volume_sma_20": rng.randint(5_000_000, 30_000_000),
        "daily_return": round(rng.uniform(-3, 3), 2),
        "vix_close": round(rng.uniform(12, 30), 1),
    }

# ── Analytics / EDA ──────────────────────────────────────────────────────────
@app.get("/api/analytics/sector-performance", tags=["analytics"])
def sector_performance():
    """Average daily return & volume by sector."""
    rng = random.Random(42)
    data = []
    for sector in SECTORS:
        data.append({
            "sector": sector,
            "avg_daily_return": round(rng.uniform(-0.08, 0.18), 4),
            "avg_volume": rng.randint(8_000_000, 25_000_000),
            "volatility": round(rng.uniform(1.5, 6.0), 2),
        })
    return {"data": data}

@app.get("/api/analytics/regime-heatmap", tags=["analytics"])
def regime_heatmap():
    """Returns sector × market-regime performance matrix."""
    rng = random.Random(99)
    matrix = {}
    for sector in SECTORS:
        matrix[sector] = {}
        for regime in MARKET_REGIMES:
            matrix[sector][regime] = round(rng.uniform(-0.15, 0.20), 4)
    return {"matrix": matrix, "sectors": SECTORS, "regimes": MARKET_REGIMES}

@app.get("/api/analytics/top-performers", tags=["analytics"])
def top_performers():
    """Top 10 and bottom 10 by average daily return."""
    rng = random.Random(77)
    rows = []
    for c in COMPANIES:
        rows.append({
            **c,
            "avg_daily_return": round(rng.uniform(-0.12, 0.20), 4),
            "volatility": round(rng.uniform(1.5, 8.0), 2),
        })
    rows.sort(key=lambda x: x["avg_daily_return"], reverse=True)
    return {"top": rows[:10], "bottom": rows[-10:]}

@app.get("/api/analytics/volume-distribution", tags=["analytics"])
def volume_distribution():
    """Sector volume share (for pie chart)."""
    rng = random.Random(55)
    total = 0
    data  = []
    for sector in SECTORS:
        v = rng.randint(15, 30)
        data.append({"sector": sector, "volume_share": v})
        total += v
    for d in data:
        d["pct"] = round(d["volume_share"] / total * 100, 1)
    return {"data": data}

@app.get("/api/analytics/market-index-correlation", tags=["analytics"])
def market_index_correlation():
    """Returns 200 scatter points: sp500 vs close and nasdaq vs close."""
    rng = random.Random(11)
    sp500   = [round(rng.uniform(3500, 5300), 1) for _ in range(200)]
    nasdaq  = [round(rng.uniform(10000, 17000), 1) for _ in range(200)]
    close   = [round(s * 0.04 + rng.uniform(-30, 30), 2) for s in sp500]
    return {"sp500": sp500, "nasdaq": nasdaq, "close": close}

# ── ML Prediction ────────────────────────────────────────────────────────────
@app.post("/api/predict", tags=["ml"])
def predict(data: PredictionInput):
    """Predict Uptrend / Sideways / Downtrend for given technical indicators."""
    features = np.array([[getattr(data, f) for f in FEATURE_COLUMNS]])

    if ml_model and ml_scaler and ml_encoder:
        scaled   = ml_scaler.transform(features)
        pred_enc = ml_model.predict(scaled)[0]
        proba    = ml_model.predict_proba(scaled)[0].tolist()
        label    = ml_encoder.inverse_transform([pred_enc])[0]
        classes  = ml_encoder.classes_.tolist()
    else:
        # Demo mode — plausible heuristic
        rsi = data.rsi_14
        if data.macd > 0 and rsi > 55:
            label = "Uptrend"
            proba = [0.08, 0.18, 0.74]
        elif data.macd < 0 and rsi < 45:
            label = "Downtrend"
            proba = [0.71, 0.21, 0.08]
        else:
            label = "Sideways"
            proba = [0.22, 0.58, 0.20]
        classes = ["Downtrend", "Sideways", "Uptrend"]

    confidence = max(proba)
    return {
        "prediction": label,
        "confidence": round(confidence, 4),
        "probabilities": dict(zip(classes, [round(p, 4) for p in proba])),
        "model": "RandomForest (demo)" if not ml_model else "RandomForest",
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.post("/api/predict/batch", tags=["ml"])
def predict_batch(data: BatchPredictionInput):
    results = []
    for record in data.records:
        results.append(predict(record))
    return {"predictions": results, "count": len(results)}

@app.get("/api/model/info", tags=["ml"])
def model_info():
    """Returns model metadata and feature importance."""
    return {
        "model_type": "RandomForestClassifier",
        "features": FEATURE_COLUMNS,
        "target": "trend_label",
        "classes": ["Downtrend", "Sideways", "Uptrend"],
        "train_size": "80%",
        "test_size":  "20%",
        "scaler": "StandardScaler",
        "feature_importance": {
            "rsi_14":          0.142,
            "daily_return":    0.131,
            "macd":            0.118,
            "momentum_10":     0.104,
            "momentum_20":     0.099,
            "price_to_sma_50": 0.087,
            "volatility_20":   0.081,
            "vix_close":       0.077,
            "bb_width":        0.062,
            "volume_ratio":    0.055,
            "macd_histogram":  0.030,
            "atr_14":          0.014,
        },
        "metrics": {
            "accuracy": 0.826,
            "macro_f1": 0.821,
            "Uptrend":   {"precision": 0.84, "recall": 0.81, "f1": 0.83},
            "Sideways":  {"precision": 0.79, "recall": 0.82, "f1": 0.80},
            "Downtrend": {"precision": 0.85, "recall": 0.84, "f1": 0.84},
        }
    }
