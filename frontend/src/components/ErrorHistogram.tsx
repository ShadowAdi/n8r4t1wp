import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AnalysisResponse } from '../api'
import { formatSignedMW } from '../format'
import { axisProps, gridProps } from './chartTheme'

interface Props {
  bins: AnalysisResponse['histogram']
}

type Bin = AnalysisResponse['histogram'][number] & { share: number }

function TooltipBody({ active, payload }: { active?: boolean; payload?: { payload: Bin }[] }) {
  if (!active || !payload?.length) return null
  const b = payload[0].payload
  return (
    <div className="tooltip">
      <div className="tooltip-title">
        {formatSignedMW(b.lower)} to {formatSignedMW(b.upper)}
      </div>
      <div className="tooltip-row">
        Periods <strong>{b.count}</strong>
      </div>
      <div className="tooltip-row">
        Share <strong>{(b.share * 100).toFixed(1)}%</strong>
      </div>
      <div className="tooltip-foot">{b.lower >= 0 ? 'Forecast above actual (over-forecast)' : 'Forecast below actual (under-forecast)'}</div>
    </div>
  )
}

const gwLabel = (mw: number) => `${mw > 0 ? '+' : mw < 0 ? '−' : ''}${Math.abs(mw / 1000)}`

export default function ErrorHistogram({ bins }: Props) {
  const total = bins.reduce((sum, b) => sum + b.count, 0)
  const data: Bin[] = bins.map((b) => ({ ...b, share: total ? b.count / total : 0 }))

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Error distribution</h2>
          <p className="card-sub">Forecast − actual, in GW. Right of zero means wind was over-forecast.</p>
        </div>
        <ul className="legend" aria-label="Legend">
          <li>
            <span className="swatch block under" />
            Under
          </li>
          <li>
            <span className="swatch block over" />
            Over
          </li>
        </ul>
      </header>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} barCategoryGap={2}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="lower" tickFormatter={gwLabel} {...axisProps} interval="preserveStartEnd" minTickGap={16} />
            <YAxis allowDecimals={false} {...axisProps} axisLine={false} width={40} />
            <Tooltip content={<TooltipBody />} cursor={{ fill: 'var(--accent-soft)' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((b) => (
                <Cell key={b.lower} fill={b.lower >= 0 ? 'var(--over)' : 'var(--under)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
