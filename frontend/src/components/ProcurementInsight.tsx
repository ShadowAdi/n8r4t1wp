import { useMemo } from 'react'
import type { Filters, SeriesResponse } from '../api'
import { formatHours, formatMW } from '../format'
import { percentile } from '../stats'

interface Props {
  series: SeriesResponse | null
  filters: Filters
}

export default function ProcurementInsight({ series, filters }: Props) {
  const buffers = useMemo(() => {
    const errors = (series?.points ?? []).flatMap((p) => (p.error == null ? [] : [p.error]))
    return { p50: percentile(errors, 50), p90: percentile(errors, 90), p95: percentile(errors, 95) }
  }, [series])

  if (!series?.stats || buffers.p90 == null) return null

  const basis =
    filters.mode === 'horizon'
      ? `forecasts made ${formatHours(filters.horizonHours)} ahead`
      : `the latest forecast available at ${filters.cutoff} the day before`
  const over = series.stats.bias > 0

  return (
    <section className="card insight" aria-label="Procurement insight">
      <div className="insight-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18M5 10l7-7 7 7" />
        </svg>
      </div>
      <div className="insight-body">
        <h2>What this means for day-ahead buying</h2>
        <p>
          Using {basis}, wind was <strong>{over ? 'over-forecast' : 'under-forecast'} by {formatMW(Math.abs(series.stats.bias))}</strong> on
          average. {over ? 'Relying on the raw forecast would leave the book short.' : 'Relying on the raw forecast would over-buy.'}
        </p>
        <ul className="buffer-list">
          <li>
            <span className="buffer-value">{formatMW(Math.max(0, buffers.p50 ?? 0))}</span>
            <span className="buffer-label">buffer covers half of periods</span>
          </li>
          <li>
            <span className="buffer-value">{formatMW(Math.max(0, buffers.p90))}</span>
            <span className="buffer-label">buffer covers 9 in 10 periods</span>
          </li>
          <li>
            <span className="buffer-value">{formatMW(Math.max(0, buffers.p95 ?? 0))}</span>
            <span className="buffer-label">buffer covers 19 in 20 periods</span>
          </li>
        </ul>
        <p className="insight-foot">Buffer = extra power to buy on top of (demand − forecast wind) so that actual wind shortfall is covered.</p>
      </div>
    </section>
  )
}
