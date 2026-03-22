import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchStocks, fetchMarketOverview } from '../utils/api'
import {
  LayoutDashboard, BarChart3, TrendingUp, Brain,
  ChevronLeft, ChevronRight, Activity
} from 'lucide-react'

const NAV = [
  { to: '/',          label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/stocks',    label: 'Markets',    icon: BarChart3 },
  { to: '/analytics', label: 'Analytics',  icon: TrendingUp },
  { to: '/predictor', label: 'ML Predictor', icon: Brain },
]

function TickerTape() {
  const { data } = useQuery({ queryKey: ['stocks-ticker'], queryFn: () => fetchStocks({ limit: 20 }), refetchInterval: 30_000 })
  const stocks = data?.stocks ?? []
  if (!stocks.length) return null
  const items = [...stocks, ...stocks] // duplicate for seamless loop

  return (
    <div className="border-b border-[#1E2433] overflow-hidden h-8 flex items-center bg-[#0D1017]">
      <span className="text-xs text-[#00D4FF] font-mono px-3 shrink-0 border-r border-[#1E2433] h-full flex items-center">LIVE</span>
      <div className="overflow-hidden flex-1">
        <div className="ticker-inner flex gap-8 whitespace-nowrap w-max">
          {items.map((s, i) => (
            <span key={i} className="text-xs mono flex items-center gap-1.5">
              <span className="text-[#8899BB] font-medium">{s.ticker}</span>
              <span className="text-[#E8EBF0]">${s.price?.toFixed(2)}</span>
              <span className={s.change_pct >= 0 ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'}>
                {s.change_pct >= 0 ? '▲' : '▼'}{Math.abs(s.change_pct).toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function IndexBar({ data }) {
  if (!data) return null
  const indices = [
    { label: 'S&P 500', ...data.sp500 },
    { label: 'NASDAQ',  ...data.nasdaq },
    { label: 'VIX',     value: data.vix?.value, change_pct: null, vix: true },
    { label: 'DXY',     ...data.dollar },
    { label: '10Y Yield', value: data.treasury_10y + '%', change_pct: null },
  ]
  return (
    <div className="flex items-center gap-6 px-4 py-1.5 border-b border-[#1E2433] bg-[#0D1017] overflow-x-auto">
      <span className="text-[10px] text-[#8899BB] uppercase tracking-widest shrink-0">Indices</span>
      {indices.map((idx) => (
        <div key={idx.label} className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-[#8899BB]">{idx.label}</span>
          <span className="text-[12px] mono font-medium">{typeof idx.value === 'number' ? idx.value.toLocaleString() : idx.value}</span>
          {idx.change_pct !== null && idx.change_pct !== undefined && (
            <span className={`text-[11px] mono ${idx.change_pct >= 0 ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'}`}>
              {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct.toFixed(2)}%
            </span>
          )}
        </div>
      ))}
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        <span className="live-dot w-1.5 h-1.5 rounded-full bg-[#00E5A0] inline-block" />
        <span className="text-[10px] text-[#8899BB]">Market Open</span>
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const { data: overview } = useQuery({ queryKey: ['overview'], queryFn: fetchMarketOverview, refetchInterval: 60_000 })
  const location = useLocation()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bars */}
      <div className="shrink-0 z-20">
        <TickerTape />
        <IndexBar data={overview} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`shrink-0 flex flex-col border-r border-[#1E2433] bg-[#0D1017] transition-all duration-300 ${collapsed ? 'w-14' : 'w-52'}`}>
          {/* Logo */}
          <div className={`flex items-center gap-2.5 px-3 py-4 border-b border-[#1E2433] ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded bg-gradient-to-br from-[#00D4FF] to-[#7B61FF] flex items-center justify-center shrink-0">
              <Activity size={14} className="text-white" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-sm tracking-tight gradient-text">QuantEdge</span>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-1.5 py-3 flex flex-col gap-0.5">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150
                  ${isActive
                    ? 'bg-[#0B1929] text-[#00D4FF] border border-[#1E3A5F]'
                    : 'text-[#8899BB] hover:text-[#E8EBF0] hover:bg-[#151C2A]'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Collapse btn */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center py-3 border-t border-[#1E2433] text-[#8899BB] hover:text-[#E8EBF0] transition-colors"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto bg-[#0B0E14]">
          {children}
        </main>
      </div>
    </div>
  )
}
