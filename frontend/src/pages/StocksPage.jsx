import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchStocks } from '../utils/api'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, Search, SlidersHorizontal } from 'lucide-react'

const SECTORS = ['All', 'Technology', 'Finance', 'Healthcare', 'Consumer', 'Energy']
const SORT_OPTIONS = [
  { value: 'volume',     label: 'Volume' },
  { value: 'change_pct', label: '% Change' },
  { value: 'price',      label: 'Price' },
  { value: 'market_cap', label: 'Market Cap' },
]
const TREND_COLOR = { Uptrend: '#00E5A0', Downtrend: '#FF4D6A', Sideways: '#F5A623' }
const TREND_ICON  = { Uptrend: TrendingUp, Downtrend: TrendingDown, Sideways: Minus }

function Badge({ trend }) {
  const color = TREND_COLOR[trend] || '#8899BB'
  const Icon  = TREND_ICON[trend] || Minus
  return (
    <span className="flex items-center gap-1 text-[11px] mono px-2 py-0.5 rounded-full border w-fit"
      style={{ color, borderColor: color + '55', background: color + '11' }}>
      <Icon size={10} />{trend}
    </span>
  )
}

function Bar({ pct, color }) {
  return (
    <div className="w-16 h-1.5 bg-[#1E2433] rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min(Math.abs(pct) * 10, 100)}%`, background: color }} />
    </div>
  )
}

export default function StocksPage() {
  const [sector, setSector] = useState('All')
  const [sortBy, setSortBy] = useState('volume')
  const [order, setOrder]   = useState('desc')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['stocks', sector, sortBy, order],
    queryFn: () => fetchStocks({
      sector: sector === 'All' ? undefined : sector,
      sort_by: sortBy, order, limit: 50
    }),
    refetchInterval: 30_000,
  })

  const stocks = (data?.stocks ?? []).filter(s =>
    !search || s.ticker.toLowerCase().includes(search.toLowerCase()) ||
    s.company_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Markets</h1>
          <p className="text-xs text-[#8899BB] mt-0.5">All {data?.total ?? 0} stocks · sorted by {sortBy}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-[#111620] border border-[#1E2433] rounded-xl p-3 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="flex items-center gap-2 bg-[#0D1017] border border-[#1E2433] rounded-lg px-3 py-1.5 flex-1 min-w-[160px]">
          <Search size={13} className="text-[#8899BB]" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ticker or name…"
            className="bg-transparent text-sm outline-none flex-1 placeholder-[#8899BB]"
          />
        </div>

        {/* Sector pills */}
        <div className="flex gap-1.5 flex-wrap">
          {SECTORS.map(s => (
            <button key={s} onClick={() => setSector(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                sector === s
                  ? 'bg-[#00D4FF22] border-[#00D4FF66] text-[#00D4FF]'
                  : 'border-[#1E2433] text-[#8899BB] hover:border-[#2A3249] hover:text-[#E8EBF0]'
              }`}>{s}</button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto">
          <SlidersHorizontal size={13} className="text-[#8899BB]" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="bg-[#0D1017] border border-[#1E2433] rounded-lg px-2 py-1 text-xs text-[#E8EBF0] outline-none">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => setOrder(o => o === 'desc' ? 'asc' : 'desc')}
            className="text-xs border border-[#1E2433] rounded-lg px-2 py-1 text-[#8899BB] hover:text-[#E8EBF0]">
            {order === 'desc' ? '↓ Desc' : '↑ Asc'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111620] border border-[#1E2433] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2.5rem_1.5fr_1fr_5rem_5rem_6rem_5rem_5rem_7rem] px-4 py-2.5 text-[10px] uppercase tracking-widest text-[#8899BB] border-b border-[#1E2433]">
          <span>#</span>
          <span>Symbol / Name</span>
          <span>Sector</span>
          <span className="text-right">Price</span>
          <span className="text-right">Change</span>
          <span className="text-right">Volume</span>
          <span className="text-right">Mkt Cap</span>
          <span className="text-right">P/E</span>
          <span>Trend</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-[#8899BB] text-sm">Loading…</div>
        ) : stocks.map((s, i) => {
          const isUp = s.change_pct >= 0
          return (
            <Link to={`/stocks/${s.ticker}`} key={s.ticker}>
              <div className="table-row grid grid-cols-[2.5rem_1.5fr_1fr_5rem_5rem_6rem_5rem_5rem_7rem] px-4 py-3 border-b border-[#1E2433] last:border-0 items-center">
                <span className="text-xs text-[#8899BB] mono">{i + 1}</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-[#E8EBF0] text-sm">{s.ticker}</span>
                  <span className="text-[11px] text-[#8899BB]">{s.company_name}</span>
                </div>
                <span className="text-xs text-[#8899BB]">{s.sector}</span>
                <span className="mono text-right text-sm">${s.price?.toFixed(2)}</span>
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`mono text-xs ${isUp ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'}`}>
                    {isUp ? '+' : ''}{s.change_pct?.toFixed(2)}%
                  </span>
                  <Bar pct={s.change_pct} color={isUp ? '#00E5A0' : '#FF4D6A'} />
                </div>
                <span className="mono text-right text-xs text-[#8899BB]">{(s.volume / 1e6).toFixed(1)}M</span>
                <span className="mono text-right text-xs text-[#8899BB]">${(s.market_cap / 1e9).toFixed(1)}B</span>
                <span className="mono text-right text-xs">{s.pe_ratio}</span>
                <Badge trend={s.trend} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
