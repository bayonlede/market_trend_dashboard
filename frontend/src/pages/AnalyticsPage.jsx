import { useQuery } from '@tanstack/react-query'
import {
  fetchSectorPerformance, fetchRegimeHeatmap,
  fetchTopPerformers, fetchVolumeDistribution, fetchIndexCorrelation
} from '../utils/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, ScatterChart, Scatter, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts'

const SECTOR_COLORS = {
  Technology: '#00D4FF', Finance: '#7B61FF', Healthcare: '#00E5A0',
  Consumer: '#F5A623', Energy: '#FF4D6A'
}

const REGIME_COLORS = { Bull: '#00E5A0', Bear: '#FF4D6A', Recovery: '#00D4FF', Sideways: '#F5A623' }

function Panel({ title, subtitle, children }) {
  return (
    <div className="bg-[#111620] border border-[#1E2433] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1E2433]">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-[11px] text-[#8899BB] mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function HeatmapCell({ value }) {
  const abs = Math.abs(value)
  const maxVal = 0.15
  const intensity = Math.min(abs / maxVal, 1)
  const color = value >= 0 ? `rgba(0,229,160,${0.15 + intensity * 0.7})` : `rgba(255,77,106,${0.15 + intensity * 0.7})`
  return (
    <td className="border border-[#1E2433] px-3 py-2 text-center text-xs mono"
      style={{ background: color, minWidth: 70 }}>
      {(value * 100).toFixed(3)}%
    </td>
  )
}

export default function AnalyticsPage() {
  const { data: sectorData }  = useQuery({ queryKey: ['sector-perf'],  queryFn: fetchSectorPerformance })
  const { data: heatData }    = useQuery({ queryKey: ['heatmap'],      queryFn: fetchRegimeHeatmap })
  const { data: topData }     = useQuery({ queryKey: ['top-perf'],     queryFn: fetchTopPerformers })
  const { data: volData }     = useQuery({ queryKey: ['vol-dist'],     queryFn: fetchVolumeDistribution })
  const { data: corrData }    = useQuery({ queryKey: ['corr'],         queryFn: fetchIndexCorrelation })

  const sectors  = sectorData?.data  ?? []
  const matrix   = heatData?.matrix  ?? {}
  const regimes  = heatData?.regimes ?? []
  const heatSecs = heatData?.sectors ?? []
  const top10    = topData?.top      ?? []
  const bot10    = topData?.bottom   ?? []
  const volPie   = volData?.data     ?? []

  // Scatter sample
  const scatterSP  = (corrData?.sp500  ?? []).slice(0, 80).map((x, i) => ({ x, y: corrData.close[i] }))
  const scatterNQ  = (corrData?.nasdaq ?? []).slice(0, 80).map((x, i) => ({ x, y: corrData.close[i] }))

  // Radar data
  const radarData = sectors.map(s => ({
    sector: s.sector.slice(0, 4),
    return: Math.max(0, s.avg_daily_return * 1000 + 1),
    volume: s.avg_volume / 25_000_000,
    volatility: s.volatility / 6,
  }))

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#111620] border border-[#1E2433] rounded-lg px-3 py-2 text-xs">
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-xs text-[#8899BB] mt-0.5">EDA insights derived from the training dataset</p>
      </div>

      {/* Row 1: Sector performance + Volume pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Sector Performance" subtitle="Average daily return by sector">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sectors}>
              <XAxis dataKey="sector" tick={{ fontSize: 11, fill: '#8899BB' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8899BB' }} tickFormatter={v => `${(v*100).toFixed(2)}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg_daily_return" radius={[4, 4, 0, 0]}>
                {sectors.map((e, i) => (
                  <Cell key={i} fill={SECTOR_COLORS[e.sector] || '#8899BB'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Volume Distribution" subtitle="Trading volume share by sector">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={volPie} dataKey="pct" nameKey="sector" cx="50%" cy="50%" outerRadius={80} label={({ sector, pct }) => `${sector} ${pct}%`} labelLine={false}>
                {volPie.map((e, i) => (
                  <Cell key={i} fill={SECTOR_COLORS[e.sector] || '#8899BB'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#111620', border: '1px solid #1E2433', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Row 2: Heatmap */}
      <Panel title="Sector × Market Regime Heatmap" subtitle="Average daily return (%) across market conditions">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs text-[#8899BB] px-3 py-2 border border-[#1E2433]">Sector</th>
                {regimes.map(r => (
                  <th key={r} className="text-xs text-[#8899BB] px-3 py-2 border border-[#1E2433]"
                    style={{ color: REGIME_COLORS[r] }}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatSecs.map(sector => (
                <tr key={sector}>
                  <td className="text-xs font-medium px-3 py-2 border border-[#1E2433]">{sector}</td>
                  {regimes.map(regime => (
                    <HeatmapCell key={regime} value={matrix[sector]?.[regime] ?? 0} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Row 3: Top/Bottom performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Top 10 Performers" subtitle="Highest average daily returns">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={top10} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#8899BB' }} tickFormatter={v => `${(v*100).toFixed(2)}%`} />
              <YAxis dataKey="company_name" type="category" tick={{ fontSize: 10, fill: '#E8EBF0' }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg_daily_return" fill="#00E5A0" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Bottom 10 Performers" subtitle="Lowest average daily returns">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={bot10} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#8899BB' }} tickFormatter={v => `${(v*100).toFixed(2)}%`} />
              <YAxis dataKey="company_name" type="category" tick={{ fontSize: 10, fill: '#E8EBF0' }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg_daily_return" fill="#FF4D6A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Row 4: Scatter plots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Stock Price vs S&P 500" subtitle="Positive correlation with broad market">
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
              <XAxis dataKey="x" name="S&P 500" tick={{ fontSize: 10, fill: '#8899BB' }} label={{ value: 'S&P 500', position: 'bottom', fill: '#8899BB', fontSize: 11 }} />
              <YAxis dataKey="y" name="Close" tick={{ fontSize: 10, fill: '#8899BB' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#111620', border: '1px solid #1E2433', fontSize: 12 }} />
              <Scatter data={scatterSP} fill="#00D4FF" opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Stock Price vs NASDAQ" subtitle="Strong tech-driven correlation">
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
              <XAxis dataKey="x" name="NASDAQ" tick={{ fontSize: 10, fill: '#8899BB' }} label={{ value: 'NASDAQ', position: 'bottom', fill: '#8899BB', fontSize: 11 }} />
              <YAxis dataKey="y" name="Close" tick={{ fontSize: 10, fill: '#8899BB' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#111620', border: '1px solid #1E2433', fontSize: 12 }} />
              <Scatter data={scatterNQ} fill="#7B61FF" opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Row 5: Radar */}
      <Panel title="Multi-Metric Radar" subtitle="Sector comparison across return, volume & volatility">
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#1E2433" />
            <PolarAngleAxis dataKey="sector" tick={{ fontSize: 11, fill: '#E8EBF0' }} />
            <Radar name="Return" dataKey="return" stroke="#00D4FF" fill="#00D4FF" fillOpacity={0.15} />
            <Radar name="Volume" dataKey="volume" stroke="#7B61FF" fill="#7B61FF" fillOpacity={0.15} />
            <Radar name="Volatility" dataKey="volatility" stroke="#F5A623" fill="#F5A623" fillOpacity={0.15} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#111620', border: '1px solid #1E2433', fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  )
}
