import type { Filters, SeriesResponse } from '../api'
import { formatGW, formatHours } from '../format'

interface Props {
  series: SeriesResponse | null
  filters: Filters
  buffer90: number | null
}

const dateLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function period(filters: Filters): string {
  const start = dateLabel.format(new Date(`${filters.startDate}T00:00:00Z`))
  const end = dateLabel.format(new Date(`${filters.endDate}T00:00:00Z`))
  return start === end ? `On ${start}` : `From ${start} to ${end}`
}

export default function Headline({ series, filters, buffer90 }: Props) {
  const stats = series?.stats
  if (!stats || buffer90 == null) return null

  const source =
    filters.mode === 'day_ahead'
      ? `the forecast available at ${filters.cutoff} the day before`
      : `forecasts made ${formatHours(filters.horizonHours)} ahead`
  const direction = stats.bias >= 0 ? 'over-predicted' : 'under-predicted'

  return (
    <section className="headline" aria-live="polite">
      <p>
        {period(filters)}, {source} <strong>{direction} wind by {formatGW(Math.abs(stats.bias))}</strong> on average.
        {buffer90 > 0 && (
          <>
            {' '}
            Buying <strong>{formatGW(buffer90)} extra</strong> would have covered the shortfall 9 times out of 10.
          </>
        )}
      </p>
      <span className="headline-meta">
        Based on {stats.count.toLocaleString('en-GB')} hourly delivery periods
      </span>
    </section>
  )
}
