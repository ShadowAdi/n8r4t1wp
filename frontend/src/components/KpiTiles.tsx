import type { SeriesResponse } from '../api'
import { formatMW, formatPercent, formatSignedMW } from '../format'

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
  const { stats, coverage } = series
  if (!stats) return []
  const direction = stats.bias > 0 ? 'Wind over-forecast on average' : stats.bias < 0 ? 'Wind under-forecast on average' : 'No systematic bias'
  return [
    {
      label: 'Typical error (MAE)',
      value: formatMW(stats.mae),
      note: `${formatPercent(stats.normalised_mae)} of mean wind output`,
    },
    {
      label: 'Average bias',
      value: formatSignedMW(stats.bias),
      note: direction,
    },
    {
      label: '90% of periods within',
      value: `±${formatMW(stats.p90_abs_error)}`,
      note: `Worst 1%: beyond ±${formatMW(stats.p99_abs_error)}`,
    },
    {
      label: 'Periods evaluated',
      value: stats.count.toLocaleString('en-GB'),
      note: `${coverage.matched} of ${coverage.forecast_slots} hourly slots had a forecast`,
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
