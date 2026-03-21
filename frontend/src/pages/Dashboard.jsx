import { useQuery } from '@tanstack/react-query'
import { fetchMarketOverview, fetchStocks, fetchTopPerformers, fetchSectorPerformance } from '../utils/api'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const TREND_COLOR = { Uptrend: '#00E5A0', Downtrend: '#FF4D6A', Sideways: '#F5A623' }
const TREND_ICON  = { Uptrend: TrendingUp, Downtrend: TrendingDown, Sideways: Minus }

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card-hover bg-[#111620] border border-[#1E2433] rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-widest text-[#8899BB] mb-2">{label}</p>
      <p className="mono text-xl font-medium text-[#E8EBF0]">{value}</p>
      {sub && <p className={`text-xs mt-1 mono ${accent}`}>{sub}</p>}
    </div>
  )
}

function MiniSparkline({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data.map((v, i) => ({ v, i }))}>
        <defs>
          <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${color})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function TrendBadge({ trend }) {
  const color = TREND_COLOR[trend] || '#8899BB'
  const Icon  = TREND_ICON[trend] || Minus
  return (
    <span className="flex items-center gap-1 text-xs mono px-2 py-0.5 rounded-full border"
      style={{ color, borderColor: color + '44', background: color + '11' }}>
      <Icon size={11} />{trend}
    </span>
  )
}

// Mock sparklines
function useMockHistory(ticker) {
  const seed = ticker.charCodeAt(0) * 37
  return Array.from({ length: 30 }, (_, i) => {
    const rng = Math.sin(seed + i * 0.7) * 0.5 + 0.5
    return 100 + rng * 80 + i * 0.3
  })
}

function StockRow({ s, rank }) {
  const hist = useMockHistory(s.ticker)
  const isUp = s.change_pct >= 0
  return (
    <Link to={`/stocks/${s.ticker}`}>
      <div className="table-row grid grid-cols-[2rem_1fr_6rem_5rem_6rem_8rem_7rem] items-center px-4 py-2.5 border-b border-[#1E2433] text-sm">
        <span className="text-[#8899BB] text-xs mono">{rank}</span>
        <div>
          <span className="font-semibold text-[#E8EBF0]">{s.ticker}</span>
          <span className="text-[#8899BB] text-xs ml-2 hidden sm:inline">{s.company_name}</span>
        </div>
        <span className="mono text-right">${s.price?.toFixed(2)}</span>
        <span className={`mono text-right ${isUp ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'}`}>
          {isUp ? '+' : ''}{s.change_pct?.toFixed(2)}%
        </span>
        <span className="mono text-right text-[#8899BB] text-xs">{(s.volume / 1e6).toFixed(1)}M</span>
        <div className="w-20 h-8"><MiniSparkline data={hist} color={isUp ? '#00E5A0' : '#FF4D6A'} /></div>
        <TrendBadge trend={s.trend} />
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { data: overview, error: ovError } = useQuery({ queryKey: ['overview'], queryFn: fetchMarketOverview, refetchInterval: 60_000 })
  const { data: stocksData, error: stError } = useQuery({ queryKey: ['stocks-dash'], queryFn: () => fetchStocks({ sort_by: 'volume', limit: 10 }) })
  const { data: sectorData } = useQuery({ queryKey: ['sector-perf'], queryFn: fetchSectorPerformance })
  const { data: topData }    = useQuery({ queryKey: ['top-perf'],    queryFn: fetchTopPerformers })

  const stocks  = stocksData?.stocks ?? []
  const sectors = sectorData?.data   ?? []
  const topList = topData?.top?.slice(0, 5) ?? []

  const hasError = ovError || stError

  return (
    <div className="p-5 space-y-5">
      {/* Connectivity Alert */}
      {hasError && (
        <div className="bg-[#FF4D6A22] border border-[#FF4D6A44] rounded-xl p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-[#FF4D6A]">Connectivity Issue Detected</p>
          <p className="text-xs text-[#8899BB]">
            The frontend is unable to reach the backend at <code className="bg-[#111620] px-1 rounded">{import.meta.env.VITE_API_URL || 'http://localhost:8000'}</code>.
            Ensure your backend is running and the <code className="bg-[#111620] px-1 rounded">VITE_API_URL</code> environment variable is set correctly in Railway.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Market Overview</h1>
          <p className="text-xs text-[#8899BB] mt-0.5">Real-time stock analysis powered by ML</p>
        </div>
        <div className="flex items-center gap-2 bg-[#111620] border border-[#1E2433] rounded-lg px-3 py-1.5">
          <span className="live-dot w-2 h-2 rounded-full bg-[#00E5A0]" />
          <span className="text-xs text-[#8899BB]">Regime:</span>
          <span className="text-xs font-medium text-[#00D4FF]">{overview?.market_regime ?? '—'}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="S&P 500" value={overview?.sp500?.value?.toLocaleString() ?? '—'}
          sub={overview?.sp500 ? `${overview.sp500.change_pct >= 0 ? '+' : ''}${overview.sp500.change_pct}%` : ''}
          accent={overview?.sp500?.change_pct >= 0 ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'} />
        <StatCard label="NASDAQ" value={overview?.nasdaq?.value?.toLocaleString() ?? '—'}
          sub={overview?.nasdaq ? `${overview.nasdaq.change_pct >= 0 ? '+' : ''}${overview.nasdaq.change_pct}%` : ''}
          accent={overview?.nasdaq?.change_pct >= 0 ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'} />
        <StatCard label="VIX Fear Index" value={overview?.vix?.value ?? '—'}
          sub={overview?.vix?.label} accent="text-[#F5A623]" />
        <StatCard label="10Y Treasury" value={overview?.treasury_10y ? overview.treasury_10y + '%' : '—'}
          sub="Yield" accent="text-[#8899BB]" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Most Active Table */}
        <div className="lg:col-span-2 bg-[#111620] border border-[#1E2433] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2433]">
            <h2 className="text-sm font-semibold">Most Active</h2>
            <Link to="/stocks" className="flex items-center gap-1 text-xs text-[#00D4FF] hover:underline">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-[2rem_1fr_6rem_5rem_6rem_8rem_7rem] px-4 py-2 text-[10px] uppercase tracking-widest text-[#8899BB] border-b border-[#1E2433]">
            <span>#</span><span>Symbol</span><span className="text-right">Price</span>
            <span className="text-right">Chg%</span><span className="text-right">Volume</span>
            <span className="text-right pr-4">7D</span><span>Trend</span>
          </div>
          {stocks.map((s, i) => <StockRow key={s.ticker} s={s} rank={i + 1} />)}
        </div>

        {/* Sector Returns */}
        <div className="bg-[#111620] border border-[#1E2433] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E2433]">
            <h2 className="text-sm font-semibold">Sector Returns</h2>
            <p className="text-xs text-[#8899BB] mt-0.5">Avg daily return %</p>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sectors} layout="vertical" margin={{ left: 8, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#8899BB' }} tickFormatter={v => `${(v * 100).toFixed(2)}%`} />
                <YAxis dataKey="sector" type="category" tick={{ fontSize: 11, fill: '#E8EBF0' }} width={80} />
                <Tooltip
                  contentStyle={{ background: '#111620', border: '1px solid #1E2433', borderRadius: 8, fontSize: 12 }}
                  formatter={v => [`${(v * 100).toFixed(4)}%`, 'Return']}
                />
                <Bar dataKey="avg_daily_return" radius={[0, 4, 4, 0]}>
                  {sectors.map((e, i) => (
                    <Cell key={i} fill={e.avg_daily_return >= 0 ? '#00E5A0' : '#FF4D6A'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 5 performers mini-list */}
          <div className="border-t border-[#1E2433] px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-[#8899BB] mb-2">Top Performers</p>
            {topList.map(s => (
              <div key={s.ticker} className="flex items-center justify-between py-1.5 border-b border-[#1E2433] last:border-0">
                <span className="text-xs font-medium">{s.ticker}</span>
                <span className="text-xs text-[#8899BB]">{s.sector}</span>
                <span className={`text-xs mono ${s.avg_daily_return >= 0 ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'}`}>
                  {s.avg_daily_return >= 0 ? '+' : ''}{(s.avg_daily_return * 100).toFixed(3)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
