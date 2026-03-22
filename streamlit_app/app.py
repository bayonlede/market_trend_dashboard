"""
QuantEdge — Streamlit Dashboard
A fully interactive alternative front-end built with Streamlit.
Run:  streamlit run streamlit_app/app.py
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import requests
import random
from datetime import datetime, timedelta

# ─── Config ───────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="QuantEdge — Stock Market Intelligence",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

API_BASE = "http://localhost:8000"

# ─── Custom CSS ───────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Inter:wght@400;500;600&display=swap');

html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
.stApp { background-color: #0B0E14; color: #E8EBF0; }

/* Sidebar */
section[data-testid="stSidebar"] {
    background-color: #0D1017 !important;
    border-right: 1px solid #1E2433;
}
section[data-testid="stSidebar"] * { color: #E8EBF0 !important; }

/* Metric cards */
[data-testid="metric-container"] {
    background: #111620;
    border: 1px solid #1E2433;
    border-radius: 12px;
    padding: 12px !important;
}
[data-testid="stMetricValue"]  { font-family: 'DM Mono', monospace !important; font-size: 1.3rem !important; }
[data-testid="stMetricDelta"]  { font-family: 'DM Mono', monospace !important; font-size: 0.75rem !important; }

/* Tabs */
.stTabs [data-baseweb="tab-list"]  { background: #111620; border-radius: 10px; gap: 4px; padding: 4px; }
.stTabs [data-baseweb="tab"]       { border-radius: 8px; color: #8899BB; }
.stTabs [aria-selected="true"]     { background: #0B1929 !important; color: #00D4FF !important; }

/* Dataframe */
.stDataFrame { border: 1px solid #1E2433; border-radius: 10px; overflow: hidden; }
iframe[title="st_aggrid"] { background: #111620; }

/* Headings */
h1, h2, h3 { color: #E8EBF0 !important; }
.gradient { background: linear-gradient(135deg,#00D4FF,#7B61FF); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }

/* Buttons */
.stButton > button {
    background: linear-gradient(135deg, #7B61FF, #00D4FF) !important;
    color: white !important; border: none !important;
    border-radius: 10px !important; font-weight: 600 !important;
}
.stButton > button:hover { opacity: 0.85 !important; }

/* Number inputs / sliders */
.stSlider [data-baseweb="slider"] div[role="slider"] { background: #00D4FF !important; }
</style>
""", unsafe_allow_html=True)

# ─── Helpers ──────────────────────────────────────────────────────────────────
PLOTLY_LAYOUT = dict(
    paper_bgcolor="#111620", plot_bgcolor="#111620",
    font=dict(color="#E8EBF0", family="DM Mono, monospace", size=12),
    xaxis=dict(gridcolor="#1E2433", linecolor="#1E2433"),
    yaxis=dict(gridcolor="#1E2433", linecolor="#1E2433"),
    margin=dict(l=40, r=20, t=40, b=40),
)

UP_COLOR   = "#00E5A0"
DOWN_COLOR = "#FF4D6A"
ACC_COLOR  = "#00D4FF"
MUT_COLOR  = "#8899BB"

SECTOR_COLORS = {
    "Technology": "#00D4FF", "Finance": "#7B61FF",
    "Healthcare": "#00E5A0", "Consumer": "#F5A623", "Energy": "#FF4D6A"
}

def api_get(path, fallback=None):
    try:
        r = requests.get(f"{API_BASE}{path}", timeout=5)
        if r.ok:
            return r.json()
    except Exception:
        pass
    return fallback

def api_post(path, payload, fallback=None):
    try:
        r = requests.post(f"{API_BASE}{path}", json=payload, timeout=8)
        if r.ok:
            return r.json()
    except Exception:
        pass
    return fallback

@st.cache_data(ttl=30)
def get_stocks(sector=None, sort_by="volume", order="desc"):
    params = f"?sort_by={sort_by}&order={order}&limit=20"
    if sector and sector != "All":
        params += f"&sector={sector}"
    return api_get(f"/api/stocks{params}", {"stocks": []})

@st.cache_data(ttl=60)
def get_overview():
    return api_get("/api/market/overview", {})

@st.cache_data(ttl=60)
def get_sector_performance():
    return api_get("/api/analytics/sector-performance", {"data": []})

@st.cache_data(ttl=60)
def get_regime_heatmap():
    return api_get("/api/analytics/regime-heatmap", {"matrix": {}, "sectors": [], "regimes": []})

@st.cache_data(ttl=60)
def get_top_performers():
    return api_get("/api/analytics/top-performers", {"top": [], "bottom": []})

@st.cache_data(ttl=60)
def get_volume_distribution():
    return api_get("/api/analytics/volume-distribution", {"data": []})

@st.cache_data(ttl=120)
def get_model_info():
    return api_get("/api/model/info", {})

def get_stock_detail(ticker):
    return api_get(f"/api/stocks/{ticker}", None)

def get_indicators(ticker):
    return api_get(f"/api/stocks/{ticker}/indicators", {})

# ─── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#00D4FF,#7B61FF);display:flex;align-items:center;justify-content:center;font-size:16px;">📈</div>
      <span style="font-size:18px;font-weight:700;background:linear-gradient(135deg,#00D4FF,#7B61FF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">QuantEdge</span>
    </div>
    """, unsafe_allow_html=True)

    page = st.radio("Navigation", ["📊 Dashboard", "📈 Markets", "🔬 Analytics", "🤖 ML Predictor", "🔍 Stock Detail"], label_visibility="collapsed")

    st.markdown("---")
    overview = get_overview()
    if overview:
        regime = overview.get("market_regime", "—")
        color  = {"Bull": UP_COLOR, "Bear": DOWN_COLOR, "Recovery": ACC_COLOR}.get(regime, "#F5A623")
        st.markdown(f"""
        <div style="background:#0D1017;border:1px solid #1E2433;border-radius:10px;padding:12px;">
          <div style="font-size:10px;color:{MUT_COLOR};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Market Status</div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:8px;height:8px;border-radius:50%;background:{UP_COLOR};animation:pulse 1.5s infinite;"></div>
            <span style="font-size:12px;color:{MUT_COLOR};">Regime:</span>
            <span style="font-size:13px;font-weight:600;color:{color};">{regime}</span>
          </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("---")
    if st.button("🔄 Refresh Data"):
        st.cache_data.clear()
        st.rerun()

# ─── Pages ────────────────────────────────────────────────────────────────────

# ════════════════════════════════════════════════════
# PAGE 1: DASHBOARD
# ════════════════════════════════════════════════════
if "Dashboard" in page:
    st.markdown("## 📊 Market Dashboard")
    st.caption("Real-time market overview powered by ML analytics")

    # Metrics row
    ov = overview or {}
    c1, c2, c3, c4, c5 = st.columns(5)
    with c1:
        sp = ov.get("sp500", {})
        st.metric("S&P 500", f"{sp.get('value', '—'):,.1f}" if sp.get('value') else "—",
                  f"{sp.get('change_pct', 0):+.2f}%" if sp else None)
    with c2:
        nq = ov.get("nasdaq", {})
        st.metric("NASDAQ", f"{nq.get('value', '—'):,.1f}" if nq.get('value') else "—",
                  f"{nq.get('change_pct', 0):+.2f}%" if nq else None)
    with c3:
        vx = ov.get("vix", {})
        st.metric("VIX", vx.get("value", "—"), vx.get("label", ""))
    with c4:
        dx = ov.get("dollar", {})
        st.metric("DXY", f"{dx.get('value', '—'):.2f}" if dx.get('value') else "—",
                  f"{dx.get('change_pct', 0):+.2f}%" if dx else None)
    with c5:
        ty = ov.get("treasury_10y")
        st.metric("10Y Yield", f"{ty}%" if ty else "—")

    st.markdown("---")
    col_left, col_right = st.columns([2, 1])

    with col_left:
        st.markdown("### Most Active Stocks")
        stocks_data = get_stocks()
        stocks = stocks_data.get("stocks", [])
        if stocks:
            df = pd.DataFrame(stocks)[["ticker","company_name","sector","price","change_pct","volume","trend"]]
            df.columns = ["Ticker","Company","Sector","Price ($)","Chg %","Volume","Trend"]
            df["Price ($)"]  = df["Price ($)"].map(lambda x: f"${x:,.2f}")
            df["Volume"]     = df["Volume"].map(lambda x: f"{x/1e6:.1f}M")
            df["Chg %"]      = df["Chg %"].map(lambda x: f"{x:+.2f}%")
            st.dataframe(df, use_container_width=True, hide_index=True, height=320)
        else:
            st.info("Connect the FastAPI backend to load live data.")

    with col_right:
        st.markdown("### Sector Returns")
        sp_data = get_sector_performance().get("data", [])
        if sp_data:
            df_s = pd.DataFrame(sp_data)
            fig = px.bar(df_s, x="avg_daily_return", y="sector", orientation="h",
                         color="sector", color_discrete_map=SECTOR_COLORS,
                         labels={"avg_daily_return": "Avg Daily Return", "sector": ""},
                         text_auto=".4f")
            fig.update_layout(**PLOTLY_LAYOUT, showlegend=False, height=280)
            fig.update_traces(textfont_size=10, marker_line_width=0)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("API not connected.")

# ════════════════════════════════════════════════════
# PAGE 2: MARKETS
# ════════════════════════════════════════════════════
elif "Markets" in page:
    st.markdown("## 📈 Markets")

    f1, f2, f3 = st.columns([2, 1, 1])
    with f1:
        search = st.text_input("Search ticker or company", placeholder="e.g. TECHC or TechCorp")
    with f2:
        sector_filter = st.selectbox("Sector", ["All","Technology","Finance","Healthcare","Consumer","Energy"])
    with f3:
        sort_by = st.selectbox("Sort by", ["volume","change_pct","price","market_cap"])

    stocks_data = get_stocks(sector_filter, sort_by)
    stocks = stocks_data.get("stocks", [])

    if search:
        stocks = [s for s in stocks if search.lower() in s["ticker"].lower() or search.lower() in s["company_name"].lower()]

    if stocks:
        df = pd.DataFrame(stocks)
        df_display = df[["ticker","company_name","sector","price","change","change_pct","volume","market_cap","pe_ratio","trend"]].copy()

        # Styling
        def color_change(val):
            try:
                v = float(str(val).replace('%','').replace('+',''))
                return f"color: {'#00E5A0' if v >= 0 else '#FF4D6A'}"
            except: return ""

        def color_trend(val):
            c = {"Uptrend": "#00E5A0", "Downtrend": "#FF4D6A", "Sideways": "#F5A623"}.get(val, "#8899BB")
            return f"color: {c}; font-weight: bold"

        df_display["price"]      = df_display["price"].map(lambda x: f"${x:,.2f}")
        df_display["change"]     = df_display["change"].map(lambda x: f"{x:+.2f}")
        df_display["change_pct"] = df_display["change_pct"].map(lambda x: f"{x:+.2f}%")
        df_display["volume"]     = df_display["volume"].map(lambda x: f"{x/1e6:.1f}M")
        df_display["market_cap"] = df_display["market_cap"].map(lambda x: f"${x/1e9:.1f}B")
        df_display.columns       = ["Ticker","Name","Sector","Price","Change","Chg %","Volume","Mkt Cap","P/E","Trend"]

        styled = df_display.style \
            .applymap(color_change, subset=["Change","Chg %"]) \
            .applymap(color_trend,  subset=["Trend"])

        st.dataframe(styled, use_container_width=True, hide_index=True, height=500)
    else:
        st.info("No stocks found — check API connection.")

# ════════════════════════════════════════════════════
# PAGE 3: ANALYTICS
# ════════════════════════════════════════════════════
elif "Analytics" in page:
    st.markdown("## 🔬 Analytics")
    st.caption("EDA insights derived from the training dataset")

    tabs = st.tabs(["📊 Sector", "🌡️ Regime Heatmap", "🏆 Performers", "🥧 Volume", "🔗 Correlation"])

    # Tab 1: Sector
    with tabs[0]:
        sp_data = get_sector_performance().get("data", [])
        if sp_data:
            df_s = pd.DataFrame(sp_data)
            c1, c2 = st.columns(2)
            with c1:
                fig = px.bar(df_s, x="sector", y="avg_daily_return", color="sector",
                             color_discrete_map=SECTOR_COLORS, title="Average Daily Return by Sector",
                             text_auto=".4f")
                fig.update_layout(**PLOTLY_LAYOUT, showlegend=False, height=340)
                st.plotly_chart(fig, use_container_width=True)
            with c2:
                fig = px.bar(df_s, x="sector", y="avg_volume", color="sector",
                             color_discrete_map=SECTOR_COLORS, title="Average Volume by Sector",
                             text_auto=".2s")
                fig.update_layout(**PLOTLY_LAYOUT, showlegend=False, height=340)
                st.plotly_chart(fig, use_container_width=True)

            fig_vol = px.bar(df_s, x="sector", y="volatility", color="sector",
                             color_discrete_map=SECTOR_COLORS, title="Average Volatility by Sector")
            fig_vol.update_layout(**PLOTLY_LAYOUT, showlegend=False)
            st.plotly_chart(fig_vol, use_container_width=True)
        else:
            st.info("API not connected.")

    # Tab 2: Heatmap
    with tabs[1]:
        hm = get_regime_heatmap()
        matrix, sectors_list, regimes_list = hm.get("matrix",{}), hm.get("sectors",[]), hm.get("regimes",[])
        if matrix and sectors_list:
            z  = [[matrix.get(s, {}).get(r, 0) for r in regimes_list] for s in sectors_list]
            text = [[f"{v*100:.3f}%" for v in row] for row in z]
            fig = go.Figure(go.Heatmap(
                z=z, x=regimes_list, y=sectors_list, text=text, texttemplate="%{text}",
                colorscale=[[0,"#FF4D6A"],[0.5,"#1E2433"],[1,"#00E5A0"]],
                zmid=0, showscale=True,
            ))
            fig.update_layout(**PLOTLY_LAYOUT, title="Sector × Market Regime Performance", height=380)
            st.plotly_chart(fig, use_container_width=True)

            st.markdown("**Key Insight:** Recovery and Bull markets drive the strongest sector returns. "
                        "Bear markets hit Technology and Energy hardest, while Healthcare provides defensive stability.")
        else:
            st.info("API not connected.")

    # Tab 3: Performers
    with tabs[2]:
        tp = get_top_performers()
        top10, bot10 = tp.get("top",[]), tp.get("bottom",[])
        if top10:
            c1, c2 = st.columns(2)
            with c1:
                df_t = pd.DataFrame(top10)
                fig = px.bar(df_t, x="avg_daily_return", y="company_name", orientation="h",
                             color_discrete_sequence=[UP_COLOR], title="Top 10 Performers")
                fig.update_layout(**PLOTLY_LAYOUT, showlegend=False, height=340)
                st.plotly_chart(fig, use_container_width=True)
            with c2:
                df_b = pd.DataFrame(bot10)
                fig = px.bar(df_b, x="avg_daily_return", y="company_name", orientation="h",
                             color_discrete_sequence=[DOWN_COLOR], title="Bottom 10 Performers")
                fig.update_layout(**PLOTLY_LAYOUT, showlegend=False, height=340)
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("API not connected.")

    # Tab 4: Volume pie
    with tabs[3]:
        vd = get_volume_distribution().get("data", [])
        if vd:
            df_v = pd.DataFrame(vd)
            fig  = px.pie(df_v, names="sector", values="pct", color="sector",
                          color_discrete_map=SECTOR_COLORS, title="Trading Volume Distribution by Sector",
                          hole=0.42)
            fig.update_layout(**PLOTLY_LAYOUT, height=420)
            fig.update_traces(textposition='outside', textinfo='percent+label')
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("API not connected.")

    # Tab 5: Correlation (synthetic)
    with tabs[4]:
        rng = np.random.default_rng(42)
        sp500_vals   = rng.uniform(3500, 5300, 200)
        nasdaq_vals  = rng.uniform(10000, 17000, 200)
        close_sp     = sp500_vals * 0.04 + rng.normal(0, 15, 200)
        close_nq     = nasdaq_vals * 0.012 + rng.normal(0, 15, 200)

        c1, c2 = st.columns(2)
        with c1:
            fig = px.scatter(x=sp500_vals, y=close_sp, labels={"x":"S&P 500","y":"Stock Close"},
                             title="Stock Price vs S&P 500", opacity=0.6, color_discrete_sequence=[ACC_COLOR])
            fig.update_layout(**PLOTLY_LAYOUT, height=320)
            st.plotly_chart(fig, use_container_width=True)
        with c2:
            fig = px.scatter(x=nasdaq_vals, y=close_nq, labels={"x":"NASDAQ","y":"Stock Close"},
                             title="Stock Price vs NASDAQ", opacity=0.6, color_discrete_sequence=["#7B61FF"])
            fig.update_layout(**PLOTLY_LAYOUT, height=320)
            st.plotly_chart(fig, use_container_width=True)

# ════════════════════════════════════════════════════
# PAGE 4: ML PREDICTOR
# ════════════════════════════════════════════════════
elif "Predictor" in page:
    st.markdown("## 🤖 ML Trend Predictor")
    st.caption("Enter 12 technical indicators → get Uptrend / Sideways / Downtrend with confidence scores")

    model_info = get_model_info()
    if model_info:
        mi_cols = st.columns(4)
        mi_cols[0].metric("Model",    model_info.get("model_type","—"))
        mi_cols[1].metric("Accuracy", f"{model_info.get('metrics',{}).get('accuracy',0)*100:.1f}%")
        mi_cols[2].metric("Macro F1", f"{model_info.get('metrics',{}).get('macro_f1',0)*100:.1f}%")
        mi_cols[3].metric("Features", len(model_info.get("features",[])))

    st.markdown("---")

    PRESETS = {
        "Strong Bull": dict(rsi_14=72.0, macd=2.8, macd_histogram=1.2, bb_width=0.18, volume_ratio=1.85, momentum_10=8.5, momentum_20=12.0, price_to_sma_50=1.08, volatility_20=0.022, atr_14=4.2, daily_return=1.8, vix_close=14.2),
        "Bear Signal": dict(rsi_14=28.0, macd=-2.1, macd_histogram=-0.9, bb_width=0.24, volume_ratio=2.1, momentum_10=-7.2, momentum_20=-11.5, price_to_sma_50=0.92, volatility_20=0.038, atr_14=5.8, daily_return=-2.3, vix_close=32.5),
        "Sideways":    dict(rsi_14=50.0, macd=0.1, macd_histogram=0.02, bb_width=0.08, volume_ratio=0.9, momentum_10=0.4, momentum_20=0.8, price_to_sma_50=1.0, volatility_20=0.012, atr_14=1.8, daily_return=0.1, vix_close=20.0),
        "Recovery":    dict(rsi_14=55.0, macd=0.9, macd_histogram=0.3, bb_width=0.15, volume_ratio=1.4, momentum_10=4.1, momentum_20=3.2, price_to_sma_50=1.02, volatility_20=0.025, atr_14=3.5, daily_return=0.9, vix_close=22.0),
        "Custom":      None,
    }

    preset_choice = st.radio("Quick Preset", list(PRESETS.keys()), horizontal=True)
    preset_vals   = PRESETS.get(preset_choice) or {}

    def pv(key, default):
        return preset_vals.get(key, default)

    with st.form("predictor_form"):
        st.markdown("#### Momentum Indicators")
        rc1, rc2, rc3 = st.columns(3)
        rsi         = rc1.slider("RSI (14)",          0.0,   100.0, pv("rsi_14", 58.3),         0.1)
        macd        = rc2.slider("MACD",              -10.0,  10.0, pv("macd", 1.24),            0.01)
        macd_hist   = rc3.slider("MACD Histogram",    -5.0,   5.0,  pv("macd_histogram", 0.45),  0.01)

        st.markdown("#### Volatility & Bands")
        rb1, rb2, rb3 = st.columns(3)
        bb_width    = rb1.slider("BB Width",          0.0,    0.5,  pv("bb_width", 0.12),        0.001)
        vol20       = rb2.slider("Volatility (20d)",  0.0,    0.1,  pv("volatility_20", 0.018),  0.0001)
        atr         = rb3.slider("ATR (14)",          0.0,    20.0, pv("atr_14", 2.4),           0.01)

        st.markdown("#### Volume & Momentum")
        rv1, rv2, rv3 = st.columns(3)
        vol_ratio   = rv1.slider("Volume Ratio",      0.0,    5.0,  pv("volume_ratio", 1.15),    0.01)
        mom10       = rv2.slider("Momentum (10d)",    -20.0,  20.0, pv("momentum_10", 3.2),      0.1)
        mom20       = rv3.slider("Momentum (20d)",    -30.0,  30.0, pv("momentum_20", 5.1),      0.1)

        st.markdown("#### Price Relationship & Macro")
        rm1, rm2, rm3 = st.columns(3)
        p2sma50     = rm1.slider("Price / SMA50",     0.5,    2.0,  pv("price_to_sma_50", 1.03), 0.001)
        daily_ret   = rm2.slider("Daily Return %",    -10.0,  10.0, pv("daily_return", 0.52),    0.01)
        vix         = rm3.slider("VIX",               5.0,    80.0, pv("vix_close", 18.5),       0.1)

        submitted = st.form_submit_button("🚀 Run Prediction", use_container_width=True)

    if submitted:
        payload = dict(
            rsi_14=rsi, macd=macd, macd_histogram=macd_hist, bb_width=bb_width,
            volume_ratio=vol_ratio, momentum_10=mom10, momentum_20=mom20,
            price_to_sma_50=p2sma50, volatility_20=vol20, atr_14=atr,
            daily_return=daily_ret, vix_close=vix,
        )
        with st.spinner("Running ML inference…"):
            result = api_post("/api/predict", payload)

        if result:
            pred   = result["prediction"]
            conf   = result["confidence"]
            probas = result["probabilities"]

            colors = {"Uptrend": "#00E5A0", "Downtrend": "#FF4D6A", "Sideways": "#F5A623"}
            icons  = {"Uptrend": "📈", "Downtrend": "📉", "Sideways": "➡️"}
            c = colors.get(pred, "#8899BB")

            st.markdown(f"""
            <div style="background:rgba(0,0,0,0.3);border:2px solid {c}44;border-radius:16px;padding:20px;text-align:center;margin:16px 0;">
              <div style="font-size:2.5rem;margin-bottom:8px;">{icons.get(pred,'')}</div>
              <div style="font-size:1.8rem;font-weight:700;color:{c};font-family:DM Mono,monospace;">{pred.upper()}</div>
              <div style="font-size:0.9rem;color:#8899BB;margin-top:4px;">Confidence: <span style="color:{c};font-weight:600;">{conf*100:.1f}%</span></div>
              <div style="font-size:0.75rem;color:#8899BB;margin-top:2px;">Model: {result.get('model','—')}</div>
            </div>
            """, unsafe_allow_html=True)

            # Probability bar chart
            fig = go.Figure(go.Bar(
                x=list(probas.values()), y=list(probas.keys()), orientation='h',
                marker_color=[colors.get(k,"#8899BB") for k in probas.keys()],
                text=[f"{v*100:.1f}%" for v in probas.values()],
                textposition='outside',
            ))
            fig.update_layout(**PLOTLY_LAYOUT, title="Class Probabilities", height=200, showlegend=False)
            st.plotly_chart(fig, use_container_width=True)

            # Feature importance chart
            if model_info and "feature_importance" in model_info:
                fi = model_info["feature_importance"]
                df_fi = pd.DataFrame({"Feature": list(fi.keys()), "Importance": list(fi.values())}).sort_values("Importance", ascending=True)
                fig2 = px.bar(df_fi, x="Importance", y="Feature", orientation="h", title="Feature Importance")
                fig2.update_layout(**PLOTLY_LAYOUT, height=320, showlegend=False)
                fig2.update_traces(marker_color=ACC_COLOR)
                st.plotly_chart(fig2, use_container_width=True)
        else:
            st.error("Could not reach the API. Make sure the backend is running on port 8000.")

# ════════════════════════════════════════════════════
# PAGE 5: STOCK DETAIL
# ════════════════════════════════════════════════════
elif "Stock Detail" in page:
    st.markdown("## 🔍 Stock Detail")

    TICKERS = ["TECHC","DATAS","CLDN9","CYBR","MEDI","BIOG","HLTH","CARE",
               "CAPB","INVP","FINS","WLTH","RETL","FOOD","HOME","SHOP",
               "POWR","GREN","OILC","RENW"]

    col1, col2 = st.columns([1, 3])
    with col1:
        ticker = st.selectbox("Select Ticker", TICKERS)
    with col2:
        range_opt = st.radio("Price Range", ["1W","1M","3M","6M","1Y"], horizontal=True, index=2)

    RANGE_DAYS = {"1W":7,"1M":21,"3M":63,"6M":126,"1Y":252}
    days = RANGE_DAYS[range_opt]

    stock = get_stock_detail(ticker)
    if not stock:
        st.info("Connect the API to load stock details.")
        st.stop()

    indicators = get_indicators(ticker)

    isup   = stock.get("change_pct", 0) >= 0
    color  = UP_COLOR if isup else DOWN_COLOR
    trend  = stock.get("trend", "—")
    tc     = {"Uptrend":"#00E5A0","Downtrend":"#FF4D6A","Sideways":"#F5A623"}.get(trend,"#8899BB")

    # Header
    st.markdown(f"""
    <div style="background:#111620;border:1px solid #1E2433;border-radius:14px;padding:20px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="margin:0;font-size:1.4rem;">{stock.get('company_name','—')}</h2>
          <span style="color:#8899BB;font-size:13px;">{ticker} · {stock.get('sector','—')}</span>
        </div>
        <div style="text-align:right;">
          <div style="font-size:2rem;font-weight:700;font-family:'DM Mono',monospace;">${stock.get('price',0):,.2f}</div>
          <div style="color:{color};font-family:'DM Mono',monospace;">{stock.get('change_pct',0):+.2f}%</div>
        </div>
      </div>
    </div>
    """, unsafe_allow_html=True)

    sm1,sm2,sm3,sm4,sm5,sm6 = st.columns(6)
    sm1.metric("Volume",   f"{stock.get('volume',0)/1e6:.1f}M")
    sm2.metric("Mkt Cap",  f"${stock.get('market_cap',0)/1e9:.1f}B")
    sm3.metric("P/E",       stock.get('pe_ratio','—'))
    sm4.metric("52W High", f"${stock.get('52w_high','—')}")
    sm5.metric("52W Low",  f"${stock.get('52w_low','—')}")
    sm6.metric("Regime",    stock.get('regime','—'))

    st.markdown("---")

    # Price chart
    history = (stock.get("history") or [])[-days:]
    dates   = (stock.get("dates")   or [])[-days:]
    if history:
        sma20 = [
            np.mean(history[max(0, i-19):i+1]) if i >= 19 else None
            for i in range(len(history))
        ]
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=dates, y=history, name="Price",
            line=dict(color=color, width=2),
            fill="tozeroy", fillcolor=color.replace('#','#22') + "33",
        ))
        fig.add_trace(go.Scatter(
            x=dates, y=sma20, name="SMA 20",
            line=dict(color="#7B61FF", width=1.5, dash="dot"),
        ))
        fig.update_layout(**PLOTLY_LAYOUT, title=f"{ticker} Price ({range_opt})", height=340,
                          legend=dict(orientation="h", yanchor="bottom", y=1.02))
        st.plotly_chart(fig, use_container_width=True)

    # Indicators
    if indicators:
        st.markdown("### Technical Indicators")
        itabs = st.tabs(["Momentum", "Moving Averages", "Volatility", "Volume & Macro"])

        def ind_metric(col, label, val, fmt=".2f", delta=None):
            col.metric(label, f"{val:{fmt}}" if isinstance(val, float) else val, delta)

        with itabs[0]:
            c1,c2,c3,c4,c5 = st.columns(5)
            ind_metric(c1,"RSI (14)",     indicators.get("rsi_14",0))
            ind_metric(c2,"MACD",         indicators.get("macd",0),  ".3f")
            ind_metric(c3,"MACD Signal",  indicators.get("macd_signal",0), ".3f")
            ind_metric(c4,"Momentum 10d", indicators.get("momentum_10",0))
            ind_metric(c5,"Momentum 20d", indicators.get("momentum_20",0))

        with itabs[1]:
            c1,c2,c3,c4,c5 = st.columns(5)
            ind_metric(c1,"SMA 20",  indicators.get("sma_20",0))
            ind_metric(c2,"SMA 50",  indicators.get("sma_50",0))
            ind_metric(c3,"SMA 200", indicators.get("sma_200",0))
            ind_metric(c4,"EMA 12",  indicators.get("ema_12",0))
            ind_metric(c5,"EMA 26",  indicators.get("ema_26",0))

        with itabs[2]:
            c1,c2,c3,c4,c5 = st.columns(5)
            ind_metric(c1,"BB Width",    indicators.get("bb_width",0), ".3f")
            ind_metric(c2,"BB Upper",    indicators.get("bb_upper",0))
            ind_metric(c3,"BB Middle",   indicators.get("bb_middle",0))
            ind_metric(c4,"ATR (14)",    indicators.get("atr_14",0))
            ind_metric(c5,"Volatility",  indicators.get("volatility_20",0), ".4f")

        with itabs[3]:
            c1,c2,c3,c4 = st.columns(4)
            ind_metric(c1,"Volume Ratio",   indicators.get("volume_ratio",0))
            ind_metric(c2,"Price/SMA50",    indicators.get("price_to_sma_50",0), ".3f")
            ind_metric(c3,"Daily Return %", indicators.get("daily_return",0))
            ind_metric(c4,"VIX",            indicators.get("vix_close",0))

    # CTA
    st.markdown("---")
    st.info("💡 **Tip:** Head to the 🤖 ML Predictor page and paste these indicator values to get a trend prediction.")
