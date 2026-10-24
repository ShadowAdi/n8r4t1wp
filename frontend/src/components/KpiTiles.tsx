import type { SeriesResponse } from '../api'
import { formatMW } from '../format'

interface Props {
  series: SeriesResponse | null
  loading: boolean
}

interface Tile {
  label: string
  value: string
  note: string
}

function tiles(series: SeriesResponse): Tile[] {
  const { stats } = series
  if (!stats) return []
  const tooHigh = stats.bias >= 0
  return [
    {
      label: 'Average miss',
      value: formatMW(stats.mae),
      note: 'Typical gap between forecast and actual',
    },
    {
      label: tooHigh ? 'Forecast too high by' : 'Forecast too low by',
      value: formatMW(Math.abs(stats.bias)),
      note: tooHigh ? 'On average — less wind arrives than forecast' : 'On average — more wind arrives than forecast',
    },
    {
      label: '9 in 10 times within',
      value: `±${formatMW(stats.p90_abs_error)}`,
      note: `Rare worst case: ±${formatMW(stats.p99_abs_error)}`,
    },
    {
      label: 'Off by about',
      value: `${Math.round(stats.normalised_mae * 100)}%`,
      note: 'Of typical wind output',
    },
  ]
}

export default function KpiTiles({ series, loading }: Props) {
  const items = series ? tiles(series) : []
  if (!items.length) {
    return (
      <section className="kpi-grid" aria-label="Key metrics">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card kpi placeholder">
            <span className="kpi-label">{loading ? 'Loading…' : 'No forecasts for this selection'}</span>
          </div>
        ))}
      </section>
    )
  }
  return (
    <section className={`kpi-grid${loading ? ' is-loading' : ''}`} aria-label="Key metrics">
      {items.map((t) => (
        <div key={t.label} className="card kpi">
          <span className="kpi-label">{t.label}</span>
          <span className="kpi-value">{t.value}</span>
          <span className="kpi-note">{t.note}</span>
        </div>
      ))}
    </section>
  )
}
