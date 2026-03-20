import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchModelInfo, postPredict } from '../utils/api'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts'
import { Brain, Zap, Info, RotateCcw, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'

const DEFAULTS = {
  rsi_14: 58.3, macd: 1.24, macd_histogram: 0.45, bb_width: 0.12,
  volume_ratio: 1.15, momentum_10: 3.2, momentum_20: 5.1,
  price_to_sma_50: 1.03, volatility_20: 0.018, atr_14: 2.4,
  daily_return: 0.52, vix_close: 18.5,
}

const FIELD_META = {
  rsi_14:          { label: 'RSI (14)',          min: 0,    max: 100,  step: 0.1,   hint: 'Relative Strength Index — >70 overbought, <30 oversold' },
  macd:            { label: 'MACD',              min: -10,  max: 10,   step: 0.01,  hint: 'MACD line value — positive = bullish momentum' },
  macd_histogram:  { label: 'MACD Histogram',   min: -5,   max: 5,    step: 0.01,  hint: 'Difference between MACD and signal line' },
  bb_width:        { label: 'BB Width',          min: 0,    max: 1,    step: 0.001, hint: 'Bollinger Band width — higher = more volatile' },
  volume_ratio:    { label: 'Volume Ratio',      min: 0,    max: 5,    step: 0.01,  hint: "Today's volume ÷ 20-day avg volume" },
  momentum_10:     { label: 'Momentum (10d)',    min: -20,  max: 20,   step: 0.1,   hint: 'Price momentum over 10 trading days' },
  momentum_20:     { label: 'Momentum (20d)',    min: -30,  max: 30,   step: 0.1,   hint: 'Price momentum over 20 trading days' },
  price_to_sma_50: { label: 'Price / SMA50',    min: 0.5,  max: 2,    step: 0.001, hint: 'How far price sits above/below 50-day moving avg' },
  volatility_20:   { label: 'Volatility (20d)', min: 0,    max: 0.1,  step: 0.0001,hint: '20-day rolling standard deviation of returns' },
  atr_14:          { label: 'ATR (14)',          min: 0,    max: 20,   step: 0.01,  hint: 'Average True Range — measures daily price movement' },
  daily_return:    { label: 'Daily Return %',   min: -10,  max: 10,   step: 0.01,  hint: "Today's percentage price change" },
  vix_close:       { label: 'VIX',              min: 0,    max: 80,   step: 0.1,   hint: 'CBOE Volatility Index — market fear gauge' },
}

const PRESETS = {
  'Strong Bull': { rsi_14: 72, macd: 2.8, macd_histogram: 1.2, bb_width: 0.18, volume_ratio: 1.85, momentum_10: 8.5, momentum_20: 12.0, price_to_sma_50: 1.08, volatility_20: 0.022, atr_14: 4.2, daily_return: 1.8, vix_close: 14.2 },
  'Bear Signal': { rsi_14: 28, macd: -2.1, macd_histogram: -0.9, bb_width: 0.24, volume_ratio: 2.1, momentum_10: -7.2, momentum_20: -11.5, price_to_sma_50: 0.92, volatility_20: 0.038, atr_14: 5.8, daily_return: -2.3, vix_close: 32.5 },
  'Sideways':    { rsi_14: 50, macd: 0.1, macd_histogram: 0.02, bb_width: 0.08, volume_ratio: 0.9, momentum_10: 0.4, momentum_20: 0.8, price_to_sma_50: 1.0, volatility_20: 0.012, atr_14: 1.8, daily_return: 0.1, vix_close: 20.0 },
  'Recovery':    { rsi_14: 55, macd: 0.9, macd_histogram: 0.3, bb_width: 0.15, volume_ratio: 1.4, momentum_10: 4.1, momentum_20: 3.2, price_to_sma_50: 1.02, volatility_20: 0.025, atr_14: 3.5, daily_return: 0.9, vix_close: 22.0 },
}

const RESULT_STYLE = {
  Uptrend:   { color: '#00E5A0', bg: 'rgba(0,229,160,0.08)', border: 'rgba(0,229,160,0.3)', Icon: TrendingUp,   label: 'UPTREND' },
  Downtrend: { color: '#FF4D6A', bg: 'rgba(255,77,106,0.08)', border: 'rgba(255,77,106,0.3)', Icon: TrendingDown, label: 'DOWNTREND' },
  Sideways:  { color: '#F5A623', bg: 'rgba(245,166,35,0.08)',  border: 'rgba(245,166,35,0.3)',  Icon: Minus,        label: 'SIDEWAYS' },
}

function Gauge({ value, label, color }) {
  const pct = Math.round(value * 100)
  const r = 36, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#1E2433" strokeWidth="6" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
          strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="44" y="48" textAnchor="middle" fill={color} fontSize="16" fontWeight="600" fontFamily="DM Mono">{pct}%</text>
      </svg>
      <span className="text-[11px] text-[#8899BB]">{label}</span>
    </div>
  )
}

function SliderField({ field, value, onChange }) {
  const [showHint, setShowHint] = useState(false)
  const meta = FIELD_META[field]
  const pct = ((value - meta.min) / (meta.max - meta.min)) * 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[#8899BB]">{meta.label}</label>
          <button onClick={() => setShowHint(!showHint)} className="text-[#2A3249] hover:text-[#8899BB] transition-colors">
            <Info size={11} />
          </button>
        </div>
        <input
          type="number" value={value} step={meta.step} min={meta.min} max={meta.max}
          onChange={e => onChange(field, parseFloat(e.target.value) || 0)}
          className="w-20 bg-[#0D1017] border border-[#1E2433] rounded px-2 py-0.5 text-xs mono text-right outline-none focus:border-[#00D4FF] transition-colors"
        />
      </div>
      {showHint && <p className="text-[10px] text-[#F5A623] bg-[#F5A62310] rounded px-2 py-1 border border-[#F5A62330]">{meta.hint}</p>}
      <div className="relative h-1.5 bg-[#1E2433] rounded-full">
        <div className="absolute h-full bg-gradient-to-r from-[#7B61FF] to-[#00D4FF] rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, transition: 'width 0.15s' }} />
        <input type="range" min={meta.min} max={meta.max} step={meta.step} value={value}
          onChange={e => onChange(field, parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
      </div>
    </div>
  )
}

export default function PredictorPage() {
  const [values, setValues]         = useState(DEFAULTS)
  const [activePreset, setPreset]   = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [jsonInput, setJsonInput]   = useState('')

  const { data: modelInfo } = useQuery({ queryKey: ['model-info'], queryFn: fetchModelInfo })

  const mutation = useMutation({
    mutationFn: postPredict,
  })

  const handleChange = (field, val) => {
    setValues(v => ({ ...v, [field]: val }))
    setPreset(null)
  }

  const applyPreset = (name) => {
    setValues(PRESETS[name])
    setPreset(name)
    mutation.reset()
  }

  const handlePredict = () => mutation.mutate(values)

  const handleReset = () => {
    setValues(DEFAULTS)
    setPreset(null)
    mutation.reset()
  }

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput)
      const updated = { ...values }
      Object.keys(FIELD_META).forEach(k => {
        if (parsed[k] !== undefined) updated[k] = parseFloat(parsed[k])
      })
      setValues(updated)
      setShowImport(false)
      setJsonInput('')
    } catch { alert('Invalid JSON') }
  }

  const result = mutation.data
  const style  = result ? RESULT_STYLE[result.prediction] : null

  // Radar data from values
  const radarData = [
    { metric: 'RSI',       value: values.rsi_14 / 100 },
    { metric: 'MACD',      value: Math.min(1, Math.max(0, (values.macd + 10) / 20)) },
    { metric: 'Momentum',  value: Math.min(1, Math.max(0, (values.momentum_10 + 20) / 40)) },
    { metric: 'BB Width',  value: Math.min(1, values.bb_width * 5) },
    { metric: 'Vol Ratio', value: Math.min(1, values.volume_ratio / 3) },
    { metric: 'Volatility',value: Math.min(1, values.volatility_20 * 25) },
  ]

  const importanceData = modelInfo
    ? Object.entries(modelInfo.feature_importance)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ name: FIELD_META[k]?.label || k, value: v }))
    : []

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Brain size={20} className="text-[#7B61FF]" /> ML Trend Predictor
          </h1>
          <p className="text-xs text-[#8899BB] mt-0.5">
            Enter 12 technical indicators → get Uptrend / Sideways / Downtrend prediction
          </p>
        </div>
        <div className="flex items-center gap-2">
          {modelInfo && (
            <div className="text-xs bg-[#111620] border border-[#1E2433] rounded-lg px-3 py-1.5 flex items-center gap-2">
              <span className="text-[#8899BB]">Model</span>
              <span className="text-[#00D4FF] mono">{modelInfo.model_type}</span>
              <span className="text-[#8899BB]">Acc</span>
              <span className="text-[#00E5A0] mono">{(modelInfo.metrics.accuracy * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── LEFT: Input Panel ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Presets */}
          <div className="bg-[#111620] border border-[#1E2433] rounded-xl p-4">
            <p className="text-xs text-[#8899BB] uppercase tracking-widest mb-3">Quick Presets</p>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(PRESETS).map(name => (
                <button key={name} onClick={() => applyPreset(name)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    activePreset === name
                      ? 'bg-[#7B61FF22] border-[#7B61FF88] text-[#7B61FF]'
                      : 'border-[#1E2433] text-[#8899BB] hover:border-[#2A3249] hover:text-[#E8EBF0]'
                  }`}>{name}</button>
              ))}
              <button onClick={() => setShowImport(!showImport)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#1E2433] text-[#8899BB] hover:text-[#E8EBF0] flex items-center gap-1 ml-auto">
                Import JSON {showImport ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            </div>
            {showImport && (
              <div className="mt-3 space-y-2">
                <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} rows={3}
                  placeholder='{"rsi_14": 65, "macd": 1.5, ...}'
                  className="w-full bg-[#0D1017] border border-[#1E2433] rounded-lg px-3 py-2 text-xs mono outline-none focus:border-[#00D4FF] resize-none" />
                <button onClick={handleImport} className="text-xs bg-[#00D4FF22] border border-[#00D4FF55] text-[#00D4FF] rounded-lg px-3 py-1.5 hover:bg-[#00D4FF33] transition-colors">
                  Apply JSON
                </button>
              </div>
            )}
          </div>

          {/* Slider grid */}
          <div className="bg-[#111620] border border-[#1E2433] rounded-xl p-4">
            <p className="text-xs text-[#8899BB] uppercase tracking-widest mb-4">Technical Indicators</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Object.keys(FIELD_META).map(field => (
                <SliderField key={field} field={field} value={values[field]} onChange={handleChange} />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={handlePredict} disabled={mutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#7B61FF] to-[#00D4FF] text-white text-sm font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              <Zap size={16} />
              {mutation.isPending ? 'Predicting…' : 'Run Prediction'}
            </button>
            <button onClick={handleReset}
              className="flex items-center gap-2 bg-[#111620] border border-[#1E2433] text-[#8899BB] text-sm rounded-xl px-4 hover:text-[#E8EBF0] hover:border-[#2A3249] transition-all">
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>

        {/* ── RIGHT: Results Panel ── */}
        <div className="space-y-4">

          {/* Prediction result */}
          <div className={`rounded-xl border p-5 transition-all duration-500 ${
            style
              ? ''
              : 'bg-[#111620] border-[#1E2433]'
          }`} style={style ? { background: style.bg, borderColor: style.border } : {}}>
            {!result ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Brain size={32} className="text-[#1E2433] mb-3" />
                <p className="text-sm text-[#8899BB]">Run a prediction to see the result</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-[#8899BB]">Prediction</p>
                  <span className="text-[10px] text-[#8899BB] mono">{new Date(result.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  {style && <style.Icon size={32} style={{ color: style.color }} />}
                  <div>
                    <p className="text-2xl font-bold mono" style={{ color: style?.color }}>{style?.label}</p>
                    <p className="text-xs text-[#8899BB] mt-0.5">{result.model}</p>
                  </div>
                </div>
                {/* Gauges */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#8899BB] mb-3">Class Probabilities</p>
                  <div className="flex justify-around">
                    {Object.entries(result.probabilities).map(([cls, prob]) => (
                      <Gauge key={cls} value={prob} label={cls}
                        color={RESULT_STYLE[cls]?.color || '#8899BB'} />
                    ))}
                  </div>
                </div>
                <div className="bg-[#0B0E14] rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-[#8899BB]">Confidence</span>
                  <span className="text-sm mono font-semibold" style={{ color: style?.color }}>
                    {(result.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input Radar */}
          <div className="bg-[#111620] border border-[#1E2433] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#8899BB] mb-2">Input Profile</p>
            <ResponsiveContainer width="100%" height={190}>
              <RadarChart data={radarData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <PolarGrid stroke="#1E2433" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#8899BB' }} />
                <Radar dataKey="value" stroke="#00D4FF" fill="#00D4FF" fillOpacity={0.18} dot={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Feature importance */}
          {importanceData.length > 0 && (
            <div className="bg-[#111620] border border-[#1E2433] rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-[#8899BB] mb-3">Feature Importance</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={importanceData} layout="vertical" margin={{ left: 5, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#8899BB' }} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#E8EBF0' }} width={80} />
                  <Tooltip contentStyle={{ background: '#111620', border: '1px solid #1E2433', fontSize: 11 }}
                    formatter={v => [`${(v*100).toFixed(1)}%`]} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                    {importanceData.map((_, i) => (
                      <Cell key={i} fill={`hsl(${200 + i * 14}, 80%, 55%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Model metrics */}
          {modelInfo && (
            <div className="bg-[#111620] border border-[#1E2433] rounded-xl p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-[#8899BB] mb-3">Model Performance</p>
              {['Uptrend', 'Sideways', 'Downtrend'].map(cls => {
                const m = modelInfo.metrics[cls]
                const c = RESULT_STYLE[cls]?.color || '#8899BB'
                return (
                  <div key={cls} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span style={{ color: c }}>{cls}</span>
                      <span className="mono text-[#8899BB]">F1: {m.f1.toFixed(2)}</span>
                    </div>
                    <div className="h-1 bg-[#1E2433] rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${m.f1 * 100}%`, background: c, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-between pt-2 border-t border-[#1E2433] text-xs">
                <span className="text-[#8899BB]">Overall Accuracy</span>
                <span className="mono text-[#00E5A0]">{(modelInfo.metrics.accuracy * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
