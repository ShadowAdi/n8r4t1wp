import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HorizonPoint } from '../api'
import { formatGW, formatHours, formatMW, niceTicks } from '../format'
import { axisProps, gridProps } from './chartTheme'

interface Props {
  curve: HorizonPoint[]
  selectedHours: number | null
}

function TooltipBody({ active, payload }: { active?: boolean; payload?: { payload: HorizonPoint }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="tooltip">
      <div className="tooltip-title">Forecast made {formatHours(p.horizon_hours)} ahead</div>
      <div className="tooltip-row">
        <span className="swatch mae" />
        MAE <strong>{formatMW(p.mae)}</strong>
      </div>
      <div className="tooltip-row">
        <span className="swatch p90" />
        P90 error <strong>{formatMW(p.p90_abs_error)}</strong>
      </div>
      <div className="tooltip-foot">{p.count} periods compared</div>
    </div>
  )
}

function endLabel(text: string, color: string, lastIndex: number) {
  return ({ x, y, index }: { x?: number | string; y?: number | string; index?: number }) =>
    index === lastIndex ? (
      <text x={Number(x) - 4} y={Number(y) - 10} textAnchor="end" fill={color} fontSize={12} fontWeight={600}>
        {text}
      </text>
    ) : null
}

export default function HorizonChart({ curve, selectedHours }: Props) {
  const data = curve.filter((p) => p.count > 0)
  const lastIndex = data.length - 1
  const ticks = niceTicks(Math.max(0, ...data.map((p) => p.p90_abs_error ?? 0)))

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Error grows with forecast horizon</h2>
          <p className="card-sub">Typical (MAE) and 90th-percentile absolute error vs how far ahead the forecast was made.</p>
        </div>
        <ul className="legend" aria-label="Legend">
          <li>
            <span className="swatch mae" />
            MAE
          </li>
          <li>
            <span className="swatch p90" />
            P90 error
          </li>
        </ul>
      </header>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey="horizon_hours"
              type="number"
              domain={[0, 48]}
              ticks={[0, 6, 12, 18, 24, 30, 36, 42, 48]}
              tickFormatter={(v: number) => `${v}h`}
              {...axisProps}
            />
            <YAxis ticks={ticks} domain={[0, ticks[ticks.length - 1]]} tickFormatter={formatGW} {...axisProps} axisLine={false} width={52} />
            <Tooltip content={<TooltipBody />} cursor={{ stroke: 'var(--axis)' }} />
            {selectedHours != null && (
              <ReferenceLine
                x={selectedHours}
                stroke="var(--text-muted)"
                label={{ value: `Selected ${formatHours(selectedHours)}`, position: 'insideTopLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
            )}
            <Line
              dataKey="p90_abs_error"
              stroke="var(--series-p90)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              label={endLabel('P90', 'var(--series-p90)', lastIndex)}
            />
            <Line
              dataKey="mae"
              stroke="var(--series-mae)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              label={endLabel('MAE', 'var(--series-mae)', lastIndex)}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
