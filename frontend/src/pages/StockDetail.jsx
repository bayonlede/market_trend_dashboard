import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchStock, fetchIndicators } from '../utils/api'
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell
} from 'recharts'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react'

const TREND_COLOR = { Uptrend: '#00E5A0', Downtrend: '#FF4D6A', Sideways: '#F5A623' }

function StatChip({ label, value, accent }) {
  return (
    <div className="bg-[#0D1017] border border-[#1E2433] rounded-lg px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-[#8899BB]">{label}</p>
      <p className={`mono text-sm font-medium mt-0.5 ${accent || 'text-[#E8EBF0]'}`}>{value}</p>
    </div>
  )
}

function IndicatorRow({ label, value, min, max, good, warn }) {
  const norm = max ? Math.min(100, Math.max(0, ((value - (min||0)) / (max - (min||0))) * 100)) : 50
  let color = '#8899BB'
  if (good && value >= good) color = '#00E5A0'
  else if (warn && value <= warn) color = '#FF4D6A'

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-[#1E2433] last:border-0">
      <span className="text-xs text-[#8899BB] w-36 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-[#1E2433] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${norm}%`, background: color }} />
      </div>
      <span className="mono text-xs w-20 text-right" style={{ color }}>{typeof value === 'number' ? value.toFixed(3) : value}</span>
    </div>
  )
}

const RANGE_LABELS = ['1W', '1M', '3M', '6M', '1Y']
const RANGE_DAYS   = { '1W': 7, '1M': 21, '3M': 63, '6M': 126, '1Y': 252 }

export default function StockDetail() {
  const { ticker } = useParams()
  const [range, setRange]   = useState('3M')
  const [chartType, setChartType] = useState('price')

  const { data: stock, isLoading } = useQuery({
    queryKey: ['stock', ticker],
    queryFn: () => fetchStock(ticker),
  })
  const { data: indicators } = useQuery({
    queryKey: ['indicators', ticker],
    queryFn: () => fetchIndicators(ticker),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-[#8899BB]">Loading {ticker}…</div>
  )
  if (!stock) return (
    <div className="p-5 text-[#FF4D6A]">Stock not found: {ticker}</div>
  )

  const days    = RANGE_DAYS[range]
  const history = (stock.history || []).slice(-days)
  const dates   = (stock.dates   || []).slice(-days)
  const isUp    = stock.change_pct >= 0
  const tColor  = TREND_COLOR[stock.trend] || '#8899BB'

  // Chart data
  const chartData = history.map((price, i) => ({
    date:   dates[i] || `Day ${i}`,
    price:  parseFloat(price.toFixed(2)),
    volume: Math.floor(Math.random() * 20_000_000 + 5_000_000),
    sma20:  i >= 19 ? parseFloat((history.slice(i-19, i+1).reduce((a, b) => a+b, 0) / 20).toFixed(2)) : null,
  }))

  const priceMin = Math.min(...history) * 0.99
  const priceMax = Math.max(...history) * 1.01

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#111620] border border-[#1E2433] rounded-lg px-3 py-2 text-xs space-y-1">
        <p className="text-[#8899BB]">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? '$' + p.value.toFixed(2) : p.value}</p>
        ))}
      </div>
    )
  }

  const TrendIcon = stock.trend === 'Uptrend' ? TrendingUp : stock.trend === 'Downtrend' ? TrendingDown : Minus

  return (
    <div className="p-5 space-y-4">
      {/* Breadcrumb */}
      <Link to="/stocks" className="flex items-center gap-1.5 text-xs text-[#8899BB] hover:text-[#E8EBF0] transition-colors w-fit">
        <ArrowLeft size={13} /> Back to Markets
      </Link>

      {/* Hero header */}
      <div className="bg-[#111620] border border-[#1E2433] rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00D4FF33] to-[#7B61FF33] border border-[#1E2433] flex items-center justify-center">
                <span className="text-xs font-bold text-[#00D4FF]">{ticker.slice(0,2)}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">{stock.company_name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#8899BB] mono">{ticker}</span>
                  <span className="text-xs text-[#2A3249]">·</span>
                  <span className="text-xs text-[#8899BB]">{stock.sector}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-end gap-4">
            <div className="text-right">
              <p className="text-3xl font-bold mono">${stock.price?.toFixed(2)}</p>
              <p className={`text-sm mono mt-0.5 ${isUp ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'}`}>
                {isUp ? '+' : ''}{stock.change?.toFixed(2)} ({isUp ? '+' : ''}{stock.change_pct?.toFixed(2)}%)
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border"
              style={{ color: tColor, borderColor: tColor + '44', background: tColor + '11' }}>
              <TrendIcon size={14} />
              <span className="text-xs">{stock.trend}</span>
            </div>
          </div>
        </div>

        {/* Stat chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-4">
          <StatChip label="Volume"   value={`${(stock.volume/1e6).toFixed(1)}M`} />
          <StatChip label="Mkt Cap"  value={`$${(stock.market_cap/1e9).toFixed(1)}B`} />
          <StatChip label="P/E"      value={stock.pe_ratio} />
          <StatChip label="52W High" value={`$${stock['52w_high']}`} accent="text-[#00E5A0]" />
          <StatChip label="52W Low"  value={`$${stock['52w_low']}`}  accent="text-[#FF4D6A]" />
          <StatChip label="Regime"   value={stock.regime}  accent="text-[#00D4FF]" />
        </div>
      </div>

      {/* Main chart */}
      <div className="bg-[#111620] border border-[#1E2433] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2433] flex-wrap gap-2">
          <div className="flex gap-1.5">
            {['price', 'volume'].map(t => (
              <button key={t} onClick={() => setChartType(t)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors capitalize ${
                  chartType === t ? 'bg-[#00D4FF22] text-[#00D4FF] border border-[#00D4FF44]' : 'text-[#8899BB] hover:text-[#E8EBF0]'
                }`}>{t}</button>
            ))}
          </div>
          <div className="flex gap-1">
            {RANGE_LABELS.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  range === r ? 'bg-[#00D4FF22] text-[#00D4FF]' : 'text-[#8899BB] hover:text-[#E8EBF0]'
                }`}>{r}</button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {chartType === 'price' ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={isUp ? '#00E5A0' : '#FF4D6A'} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={isUp ? '#00E5A0' : '#FF4D6A'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8899BB' }}
                  tickFormatter={v => v.slice(5)} interval={Math.floor(days / 6)} />
                <YAxis domain={[priceMin, priceMax]} tick={{ fontSize: 10, fill: '#8899BB' }}
                  tickFormatter={v => `$${v.toFixed(0)}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area dataKey="price" stroke={isUp ? '#00E5A0' : '#FF4D6A'} strokeWidth={2}
                  fill="url(#priceGrad)" dot={false} name="Price" />
                <Line dataKey="sma20" stroke="#7B61FF" strokeWidth={1.5} dot={false}
                  strokeDasharray="4 2" name="SMA 20" connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8899BB' }}
                  tickFormatter={v => v.slice(5)} interval={Math.floor(days / 6)} />
                <YAxis tick={{ fontSize: 10, fill: '#8899BB' }} tickFormatter={v => `${(v/1e6).toFixed(0)}M`} />
                <Tooltip contentStyle={{ background: '#111620', border: '1px solid #1E2433', fontSize: 12 }} />
                <Bar dataKey="volume" name="Volume" radius={[2, 2, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i % 3 === 0 ? '#00D4FF55' : '#7B61FF44'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Indicators grid */}
      {indicators && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Momentum indicators */}
          <div className="bg-[#111620] border border-[#1E2433] rounded-xl p-4">
            <p className="text-xs font-semibold mb-3 text-[#8899BB] uppercase tracking-widest">Momentum</p>
            <IndicatorRow label="RSI (14)" value={indicators.rsi_14} min={0} max={100} good={55} warn={45} />
            <IndicatorRow label="MACD"     value={indicators.macd} min={-5} max={5} good={0.5} warn={-0.5} />
            <IndicatorRow label="MACD Histogram" value={indicators.macd_histogram} min={-3} max={3} good={0.2} warn={-0.2} />
            <IndicatorRow label="Momentum 10d"   value={indicators.momentum_10} min={-15} max={15} good={2} warn={-2} />
            <IndicatorRow label="Momentum 20d"   value={indicators.momentum_20} min={-20} max={20} good={3} warn={-3} />
          </div>

          {/* Moving averages */}
          <div className="bg-[#111620] border border-[#1E2433] rounded-xl p-4">
            <p className="text-xs font-semibold mb-3 text-[#8899BB] uppercase tracking-widest">Moving Averages</p>
            <IndicatorRow label="SMA 20"  value={indicators.sma_20}  />
            <IndicatorRow label="SMA 50"  value={indicators.sma_50}  />
            <IndicatorRow label="SMA 200" value={indicators.sma_200} />
            <IndicatorRow label="EMA 12"  value={indicators.ema_12}  />
            <IndicatorRow label="EMA 26"  value={indicators.ema_26}  />
          </div>

          {/* Volatility */}
          <div className="bg-[#111620] border border-[#1E2433] rounded-xl p-4">
            <p className="text-xs font-semibold mb-3 text-[#8899BB] uppercase tracking-widest">Volatility & Range</p>
            <IndicatorRow label="BB Upper"   value={indicators.bb_upper}    />
            <IndicatorRow label="BB Middle"  value={indicators.bb_middle}   />
            <IndicatorRow label="BB Lower"   value={indicators.bb_lower}    />
            <IndicatorRow label="BB Width"   value={indicators.bb_width}   min={0} max={0.3} />
            <IndicatorRow label="ATR (14)"   value={indicators.atr_14}     min={0} max={10} />
            <IndicatorRow label="Volatility 20d" value={indicators.volatility_20} min={0} max={0.05} />
          </div>

          {/* Volume & macro */}
          <div className="bg-[#111620] border border-[#1E2433] rounded-xl p-4">
            <p className="text-xs font-semibold mb-3 text-[#8899BB] uppercase tracking-widest">Volume & Macro</p>
            <IndicatorRow label="Volume Ratio"   value={indicators.volume_ratio}   min={0}  max={3} good={1.2} warn={0.8} />
            <IndicatorRow label="Price / SMA50"  value={indicators.price_to_sma_50} min={0.8} max={1.2} good={1.02} warn={0.98} />
            <IndicatorRow label="Daily Return %"  value={indicators.daily_return}   min={-5} max={5} good={0.5} warn={-0.5} />
            <IndicatorRow label="VIX"            value={indicators.vix_close}       min={10} max={50} warn={30} />
          </div>
        </div>
      )}

      {/* Quick predict CTA */}
      <div className="bg-gradient-to-r from-[#7B61FF11] to-[#00D4FF11] border border-[#7B61FF33] rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Run ML Prediction for {ticker}</p>
          <p className="text-xs text-[#8899BB] mt-0.5">Use the current indicators to predict trend direction</p>
        </div>
        <Link to="/predictor"
          className="flex items-center gap-2 bg-gradient-to-r from-[#7B61FF] to-[#00D4FF] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
          Open Predictor <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  )
}
