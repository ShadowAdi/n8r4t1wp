import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AnalysisResponse } from '../api'
import { formatGW, formatMW, formatSignedMW, niceTicks } from '../format'
import { axisProps, gridProps } from './chartTheme'

interface Props {
  rows: AnalysisResponse['by_hour']
}

type Row = AnalysisResponse['by_hour'][number]

function TooltipBody({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="tooltip">
      <div className="tooltip-title">
        {String(r.hour).padStart(2, '0')}:00 UK
      </div>
      <div className="tooltip-row">
        MAE <strong>{formatMW(r.mae)}</strong>
      </div>
      <div className="tooltip-row">
        Bias <strong>{formatSignedMW(r.bias)}</strong>
      </div>
      <div className="tooltip-foot">{r.count} periods</div>
    </div>
  )
}

export default function HourlyErrorChart({ rows }: Props) {
  const ticks = niceTicks(Math.max(0, ...rows.map((r) => r.mae)))
  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Error by time of day</h2>
          <p className="card-sub">Mean absolute error for each delivery hour (UK time).</p>
        </div>
      </header>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} barCategoryGap={2}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="hour" tickFormatter={(h: number) => String(h).padStart(2, '0')} {...axisProps} interval={2} />
            <YAxis ticks={ticks} domain={[0, ticks[ticks.length - 1]]} tickFormatter={formatGW} {...axisProps} axisLine={false} width={52} />
            <Tooltip content={<TooltipBody />} cursor={{ fill: 'var(--accent-soft)' }} />
            <Bar dataKey="mae" fill="var(--series-actual)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
