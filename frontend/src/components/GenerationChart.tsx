import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SeriesPoint } from '../api'
import { formatDateTime, formatDay, formatGW, formatMW, formatSignedMW, formatTime, niceTicks } from '../format'

interface Props {
  points: SeriesPoint[]
  loading: boolean
}

interface Row {
  t: number
  actual: number
  forecast: number | null
  error: number | null
  publish: number | null
}

const HOUR = 3_600_000

function TooltipBody({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="tooltip">
      <div className="tooltip-title">{formatDateTime(row.t)}</div>
      <div className="tooltip-row">
        <span className="swatch actual" />
        Actual <strong>{formatMW(row.actual)}</strong>
      </div>
      <div className="tooltip-row">
        <span className="swatch forecast" />
        Forecast <strong>{row.forecast == null ? <span className="muted-value">hourly only</span> : formatMW(row.forecast)}</strong>
      </div>
      {row.error != null && (
        <div className="tooltip-row muted">
          Error <strong>{formatSignedMW(row.error)}</strong>
        </div>
      )}
      {row.publish != null && (
        <div className="tooltip-foot">
          Published {formatDateTime(row.publish)} · {((row.t - row.publish) / HOUR).toFixed(1)}h ahead
        </div>
      )}
    </div>
  )
}

export default function GenerationChart({ points, loading }: Props) {
  const [view, setView] = useState<'chart' | 'table'>('chart')

  const rows = useMemo<Row[]>(
    () =>
      points.map((p) => ({
        t: Date.parse(p.start_time),
        actual: p.actual,
        forecast: p.forecast,
        error: p.error,
        publish: p.publish_time ? Date.parse(p.publish_time) : null,
      })),
    [points],
  )

  const spanHours = rows.length > 1 ? (rows[rows.length - 1].t - rows[0].t) / HOUR : 0
  const tickFormatter = spanHours <= 48 ? formatTime : formatDay
  const yTicks = useMemo(() => niceTicks(Math.max(0, ...rows.map((r) => Math.max(r.actual, r.forecast ?? 0)))), [rows])

  return (
    <section className={`card chart-card${loading ? ' is-loading' : ''}`}>
      <header className="card-header">
        <div>
          <h2>Actual vs forecast wind generation</h2>
          <p className="card-sub">Half-hourly actuals; forecasts are hourly.</p>
        </div>
        <div className="card-actions">
          <ul className="legend" aria-label="Legend">
            <li>
              <span className="swatch actual" />
              Actual
            </li>
            <li>
              <span className="swatch forecast" />
              Forecast
            </li>
          </ul>
          <div className="segmented small" role="radiogroup" aria-label="View">
            <button type="button" role="radio" aria-checked={view === 'chart'} className={view === 'chart' ? 'active' : ''} onClick={() => setView('chart')}>
              Chart
            </button>
            <button type="button" role="radio" aria-checked={view === 'table'} className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
              Table
            </button>
          </div>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="empty">{loading ? 'Loading data…' : 'No data for this selection.'}</div>
      ) : view === 'chart' ? (
        <div className="chart-box tall">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={tickFormatter}
                stroke="var(--axis)"
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                ticks={yTicks}
                domain={[0, yTicks[yTicks.length - 1]]}
                tickFormatter={formatGW}
                stroke="var(--axis)"
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<TooltipBody />} cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="var(--series-actual)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke="var(--series-forecast)"
                strokeWidth={2}
                dot={false}
                connectNulls
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Delivery (UK)</th>
                <th>Actual</th>
                <th>Forecast</th>
                <th>Error</th>
                <th>Forecast published</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.t}>
                  <td>{formatDateTime(r.t)}</td>
                  <td>{formatMW(r.actual)}</td>
                  <td>{formatMW(r.forecast)}</td>
                  <td>{formatSignedMW(r.error)}</td>
                  <td>{r.publish ? formatDateTime(r.publish) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
