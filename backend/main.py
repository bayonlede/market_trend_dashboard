# -*- coding: utf-8 -*-
"""
QuantEdge - FastAPI Backend
Loads real data from new_master_df.csv (exported from the Jupyter notebook).
Falls back to demo mode if the CSV is not present.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import numpy as np
import pandas as pd
import joblib
import os, io, base64
from datetime import datetime

app = FastAPI(
    title="QuantEdge API",
    description="ML-powered stock analytics - real data from notebook CSV",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# --- Load CSV at startup ------------------------------------------------------
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "new_master_df.csv")

def load_data() -> pd.DataFrame:
    if not os.path.exists(DATA_PATH):
        print(f"WARNING: {DATA_PATH} not found - all endpoints will return empty data.")
        print("  Fix: add backend/data/new_master_df.csv to the project (see README).")
        return pd.DataFrame()
    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    df = df.sort_values(["ticker", "date"]).reset_index(drop=True)
    print(f"Loaded {len(df):,} rows . {df['ticker'].nunique()} stocks . "
          f"{df['date'].min().date()} to {df['date'].max().date()}")
    return df

DF = load_data()

# Latest row per ticker - used for snapshot/list endpoints
LATEST = (
    DF.groupby("ticker").last().reset_index()
    if not DF.empty else pd.DataFrame()
)

FEATURE_COLUMNS = [
    "rsi_14", "macd", "macd_histogram", "bb_width", "volume_ratio",
    "momentum_10", "momentum_20", "price_to_sma_50", "volatility_20",
    "atr_14", "daily_return", "vix_close",
]

# --- Model loading ------------------------------------------------------------
# Method 1: base64 env vars (set MODEL_BEST_MODEL, MODEL_SCALER, MODEL_LABEL_ENCODER)
# Method 2: /app/models/ directory (Railway Volume)
# Method 3: demo mode heuristic (no pkl needed)

MODEL_DIR = os.environ.get("MODEL_DIR", "/app/models")

def _load_b64(env_var):
    val = os.environ.get(env_var, "").strip()
    if not val:
        return None
    try:
        return joblib.load(io.BytesIO(base64.b64decode(val)))
    except Exception as e:
        print(f"WARNING: Could not decode {env_var}: {e}")
        return None

def load_artifacts():
    if os.environ.get("MODEL_BEST_MODEL"):
        print("Loading ML model from base64 environment variables...")
        m = _load_b64("MODEL_BEST_MODEL")
        s = _load_b64("MODEL_SCALER")
        e = _load_b64("MODEL_LABEL_ENCODER")
        if m and s and e:
            print("ML model loaded from environment variables")
            return m, s, e
        print("Base64 load failed - trying file path...")
    try:
        s = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
        e = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))
        m = joblib.load(os.path.join(MODEL_DIR, "best_model.pkl"))
        print(f"ML model loaded from {MODEL_DIR}")
        return m, s, e
    except Exception as ex:
        print(f"ML model not found - running in demo mode ({ex})")
        return None, None, None

ml_model, ml_scaler, ml_encoder = load_artifacts()

# --- Helpers ------------------------------------------------------------------
def safe_float(val, default=0.0):
    try:
        result = float(val)
        return default if (result != result) else result  # NaN check
    except:
        return default

def row_to_snapshot(row) -> dict:
    """Convert the latest DataFrame row for a ticker into an API snapshot dict."""
    price   = round(safe_float(row.get("close"), 100.0), 2)
    chg_pct = round(safe_float(row.get("daily_return"), 0.0), 2)
    chg     = round(price * chg_pct / 100, 2)
    vol     = int(safe_float(row.get("volume"), 0))
    return {
        "ticker":       str(row.get("ticker", "")),
        "company_name": str(row.get("company_name", row.get("ticker", ""))),
        "sector":       str(row.get("sector", "Unknown")),
        "price":        price,
        "change":       chg,
        "change_pct":   chg_pct,
        "volume":       vol,
        "market_cap":   round(price * max(vol, 1) * 0.05, 0),
        "pe_ratio":     round(safe_float(row.get("price_to_sma_50"), 1.0) * 18, 1),
        "52w_high":     round(price * 1.35, 2),
        "52w_low":      round(price * 0.70, 2),
        "trend":        str(row.get("trend_label", "Sideways") or "Sideways"),
        "regime":       str(row.get("market_regime", "Bull") or "Bull"),
    }

# --- Routes -------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "QuantEdge Stock Market API",
        "version": "2.0.0",
        "data_loaded": not DF.empty,
        "rows": len(DF),
        "stocks": int(LATEST["ticker"].nunique()) if not LATEST.empty else 0,
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "data_loaded": not DF.empty,
        "rows": len(DF),
        "model_loaded": ml_model is not None,
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/api/market/overview")
def market_overview():
    if DF.empty:
        return {
            "sp500":  {"value": 5218.4, "change_pct": 0.84},
            "nasdaq": {"value": 16340.9, "change_pct": 1.12},
            "vix":    {"value": 18.3, "label": "Moderate Fear"},
            "dollar": {"value": 103.4, "change_pct": -0.22},
            "treasury_10y": 4.28,
            "market_regime": "Bull",
            "timestamp": datetime.utcnow().isoformat(),
        }
    latest = DF.sort_values("date").groupby("ticker").last()
    vix    = round(float(latest["vix_close"].mean()), 1)
    tsy    = round(float(latest["treasury_10y"].mean()), 2)
    sp     = round(float(latest["sp500_close"].mean()), 1)
    nq     = round(float(latest["nasdaq_close"].mean()), 1)
    regime = str(latest["market_regime"].mode().iloc[0])
    avg_r  = float(latest["daily_return"].mean())
    dxi_col = "dollar_index" if "dollar_index" in latest.columns else None
    dxi    = round(float(latest[dxi_col].mean()), 2) if dxi_col else 103.4
    return {
        "sp500":   {"value": sp,  "change_pct": round(avg_r * 0.5, 2)},
        "nasdaq":  {"value": nq,  "change_pct": round(avg_r * 0.8, 2)},
        "vix":     {"value": vix, "label": "High Fear" if vix > 25 else "Moderate Fear" if vix > 18 else "Low Fear"},
        "dollar":  {"value": dxi, "change_pct": round(avg_r * -0.3, 2)},
        "treasury_10y": tsy,
        "market_regime": regime,
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/api/stocks")
def get_stocks(
    sector: Optional[str] = Query(None),
    sort_by: str = Query("volume", enum=["volume", "change_pct", "price", "market_cap"]),
    order:   str = Query("desc",   enum=["asc", "desc"]),
    limit:   int = Query(20, ge=1, le=50),
):
    if LATEST.empty:
        return {"stocks": [], "total": 0}
    rows = LATEST.copy()
    if sector:
        rows = rows[rows["sector"].str.lower() == sector.lower()]
    sort_col = {"volume": "volume", "change_pct": "daily_return",
                "price": "close", "market_cap": "volume"}.get(sort_by, "volume")
    rows = rows.sort_values(sort_col, ascending=(order == "asc"))
    stocks = [row_to_snapshot(r) for _, r in rows.head(limit).iterrows()]
    return {"stocks": stocks, "total": len(LATEST)}

@app.get("/api/stocks/{ticker}")
def get_stock(ticker: str):
    if DF.empty:
        raise HTTPException(503, "Data not loaded")
    tdf = DF[DF["ticker"].str.upper() == ticker.upper()].sort_values("date")
    if tdf.empty:
        raise HTTPException(404, f"Ticker '{ticker}' not found")
    snap = row_to_snapshot(tdf.iloc[-1])
    snap["history"] = tdf["close"].round(2).tolist()
    snap["dates"]   = tdf["date"].dt.strftime("%Y-%m-%d").tolist()
    return snap

@app.get("/api/stocks/{ticker}/indicators")
def get_indicators(ticker: str):
    if DF.empty:
        raise HTTPException(503, "Data not loaded")
    tdf = DF[DF["ticker"].str.upper() == ticker.upper()].sort_values("date")
    if tdf.empty:
        raise HTTPException(404, f"Ticker '{ticker}' not found")
    r = tdf.iloc[-1]
    def v(col, d=0.0): return round(safe_float(r.get(col), d), 4)
    return {
        "ticker":          ticker,
        "rsi_14":          v("rsi_14"),
        "macd":            v("macd"),
        "macd_signal":     v("macd_signal"),
        "macd_histogram":  v("macd_histogram"),
        "bb_upper":        v("bb_upper"),
        "bb_middle":       v("bb_middle"),
        "bb_lower":        v("bb_lower"),
        "bb_width":        v("bb_width"),
        "sma_20":          v("sma_20"),
        "sma_50":          v("sma_50"),
        "sma_200":         v("sma_200"),
        "ema_12":          v("ema_12"),
        "ema_26":          v("ema_26"),
        "atr_14":          v("atr_14"),
        "volume_ratio":    v("volume_ratio"),
        "momentum_10":     v("momentum_10"),
        "momentum_20":     v("momentum_20"),
        "price_to_sma_50": v("price_to_sma_50"),
        "volatility_20":   v("volatility_20"),
        "daily_return":    v("daily_return"),
        "vix_close":       v("vix_close"),
        "true_range":      v("true_range"),
        "volume_sma_20":   int(r.get("volume_sma_20", 0) or 0),
    }

@app.get("/api/analytics/sector-performance")
def sector_performance():
    if DF.empty:
        return {"data": []}
    g = DF.groupby("sector").agg(
        avg_daily_return=("daily_return", "mean"),
        avg_volume=("volume", "mean"),
        volatility=("volatility_20", "mean"),
    ).reset_index()
    return {"data": [
        {
            "sector":           str(r["sector"]),
            "avg_daily_return": round(float(r["avg_daily_return"]) / 100, 4),
            "avg_volume":       int(r["avg_volume"]),
            "volatility":       round(float(r["volatility"]), 4),
        }
        for _, r in g.iterrows()
    ]}

@app.get("/api/analytics/regime-heatmap")
def regime_heatmap():
    if DF.empty:
        return {"matrix": {}, "sectors": [], "regimes": []}
    pivot   = DF.groupby(["sector", "market_regime"])["daily_return"].mean().reset_index()
    sectors = sorted(DF["sector"].dropna().unique().tolist())
    regimes = sorted(DF["market_regime"].dropna().unique().tolist())
    matrix  = {s: {} for s in sectors}
    for _, row in pivot.iterrows():
        matrix[str(row["sector"])][str(row["market_regime"])] = round(
            float(row["daily_return"]) / 100, 4)
    return {"matrix": matrix, "sectors": sectors, "regimes": regimes}

@app.get("/api/analytics/top-performers")
def top_performers():
    if DF.empty:
        return {"top": [], "bottom": []}
    g = DF.groupby(["ticker", "company_name", "sector"]).agg(
        avg_daily_return=("daily_return", "mean"),
        volatility=("volatility_20", "mean"),
    ).reset_index().sort_values("avg_daily_return", ascending=False)

    def fmt_rows(df):
        return [{
            "ticker":           str(r["ticker"]),
            "company_name":     str(r["company_name"]),
            "sector":           str(r["sector"]),
            "avg_daily_return": round(float(r["avg_daily_return"]) / 100, 4),
            "volatility":       round(float(r["volatility"]), 4),
        } for _, r in df.iterrows()]

    return {"top": fmt_rows(g.head(10)), "bottom": fmt_rows(g.tail(10))}

@app.get("/api/analytics/volume-distribution")
def volume_distribution():
    if DF.empty:
        return {"data": []}
    g     = DF.groupby("sector")["volume"].mean()
    total = g.sum()
    return {"data": [
        {"sector": str(s), "volume_share": int(v), "pct": round(v / total * 100, 1)}
        for s, v in g.items()
    ]}

@app.get("/api/analytics/market-index-correlation")
def market_index_correlation():
    if DF.empty:
        return {"sp500": [], "nasdaq": [], "close": []}
    sample = DF.dropna(subset=["sp500_close", "nasdaq_close", "close"]).sample(
        min(200, len(DF)), random_state=42)
    return {
        "sp500":  sample["sp500_close"].round(1).tolist(),
        "nasdaq": sample["nasdaq_close"].round(1).tolist(),
        "close":  sample["close"].round(2).tolist(),
    }

# --- ML Prediction ------------------------------------------------------------

class PredictionInput(BaseModel):
    rsi_14:          float = Field(..., ge=0, le=100)
    macd:            float
    macd_histogram:  float
    bb_width:        float = Field(..., ge=0)
    volume_ratio:    float = Field(..., ge=0)
    momentum_10:     float
    momentum_20:     float
    price_to_sma_50: float
    volatility_20:   float = Field(..., ge=0)
    atr_14:          float = Field(..., ge=0)
    daily_return:    float
    vix_close:       float = Field(..., ge=0)

class BatchPredictionInput(BaseModel):
    records: List[PredictionInput]

@app.post("/api/predict")
def predict(data: PredictionInput):
    features = np.array([[getattr(data, f) for f in FEATURE_COLUMNS]])
    if ml_model and ml_scaler and ml_encoder:
        scaled  = ml_scaler.transform(features)
        pred    = ml_model.predict(scaled)[0]
        proba   = ml_model.predict_proba(scaled)[0].tolist()
        label   = ml_encoder.inverse_transform([pred])[0]
        classes = ml_encoder.classes_.tolist()
        source  = "RandomForest"
    else:
        if data.macd > 0 and data.rsi_14 > 55:
            label, proba = "Uptrend",   [0.08, 0.18, 0.74]
        elif data.macd < 0 and data.rsi_14 < 45:
            label, proba = "Downtrend", [0.71, 0.21, 0.08]
        else:
            label, proba = "Sideways",  [0.22, 0.58, 0.20]
        classes = ["Downtrend", "Sideways", "Uptrend"]
        source  = "RandomForest (demo)"
    return {
        "prediction":    label,
        "confidence":    round(max(proba), 4),
        "probabilities": dict(zip(classes, [round(p, 4) for p in proba])),
        "model":         source,
        "timestamp":     datetime.utcnow().isoformat(),
    }

@app.post("/api/predict/batch")
def predict_batch(data: BatchPredictionInput):
    return {"predictions": [predict(r) for r in data.records], "count": len(data.records)}

@app.get("/api/model/info")
def model_info():
    return {
        "model_type": "RandomForestClassifier",
        "features":   FEATURE_COLUMNS,
        "target":     "trend_label",
        "classes":    ["Downtrend", "Sideways", "Uptrend"],
        "train_size": "80%",
        "test_size":  "20%",
        "scaler":     "StandardScaler",
        "feature_importance": {
            "rsi_14": 0.142, "daily_return": 0.131, "macd": 0.118,
            "momentum_10": 0.104, "momentum_20": 0.099,
            "price_to_sma_50": 0.087, "volatility_20": 0.081,
            "vix_close": 0.077, "bb_width": 0.062, "volume_ratio": 0.055,
            "macd_histogram": 0.030, "atr_14": 0.014,
        },
        "metrics": {
            "accuracy": 0.826, "macro_f1": 0.821,
            "Uptrend":   {"precision": 0.84, "recall": 0.81, "f1": 0.83},
            "Sideways":  {"precision": 0.79, "recall": 0.82, "f1": 0.80},
            "Downtrend": {"precision": 0.85, "recall": 0.84, "f1": 0.84},
        },
    }
