import type { Filters } from '../api'
import { formatHours } from '../format'
import { WINDOW_END, WINDOW_START } from '../hooks/useUrlFilters'

interface Props {
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
}

const PRESETS = [
  { label: 'All January', startDate: WINDOW_START, endDate: WINDOW_END },
  { label: 'Week 1', startDate: '2026-01-01', endDate: '2026-01-07' },
  { label: 'Week 2', startDate: '2026-01-08', endDate: '2026-01-14' },
  { label: 'Week 3', startDate: '2026-01-15', endDate: '2026-01-21' },
  { label: 'Week 4', startDate: '2026-01-22', endDate: '2026-02-01' },
]

const CUTOFFS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00']
const HORIZON_MARKS = [1, 4, 12, 24, 48]

export default function FilterBar({ filters, onChange }: Props) {
  return (
    <section className="filter-bar card" aria-label="Filters">
      <div className="filter-group">
        <span className="filter-label">Delivery period</span>
        <div className="date-range">
          <input
            type="date"
            aria-label="From"
            value={filters.startDate}
            min={WINDOW_START}
            max={filters.endDate}
            onChange={(e) => e.target.value && onChange({ startDate: e.target.value })}
          />
          <span className="date-sep">to</span>
          <input
            type="date"
            aria-label="To"
            value={filters.endDate}
            min={filters.startDate}
            max={WINDOW_END}
            onChange={(e) => e.target.value && onChange({ endDate: e.target.value })}
          />
        </div>
        <div className="chips">
          {PRESETS.map((p) => {
            const active = p.startDate === filters.startDate && p.endDate === filters.endDate
            return (
              <button
                key={p.label}
                type="button"
                className={`chip${active ? ' active' : ''}`}
                aria-pressed={active}
                onClick={() => onChange({ startDate: p.startDate, endDate: p.endDate })}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Forecast used</span>
        <div className="segmented" role="radiogroup" aria-label="Forecast selection mode">
          <button
            type="button"
            role="radio"
            aria-checked={filters.mode === 'horizon'}
            className={filters.mode === 'horizon' ? 'active' : ''}
            onClick={() => onChange({ mode: 'horizon' })}
          >
            Fixed horizon
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={filters.mode === 'day_ahead'}
            className={filters.mode === 'day_ahead' ? 'active' : ''}
            onClick={() => onChange({ mode: 'day_ahead' })}
          >
            Day-ahead cutoff
          </button>
        </div>
      </div>

      <div className="filter-group grow">
        {filters.mode === 'horizon' ? (
          <>
            <label className="filter-label" htmlFor="horizon">
              Forecast horizon <strong>{formatHours(filters.horizonHours)}</strong>
            </label>
            <input
              id="horizon"
              type="range"
              min={0}
              max={48}
              step={0.5}
              value={filters.horizonHours}
              onChange={(e) => onChange({ horizonHours: Number(e.target.value) })}
            />
            <div className="chips">
              {HORIZON_MARKS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`chip${filters.horizonHours === h ? ' active' : ''}`}
                  aria-pressed={filters.horizonHours === h}
                  onClick={() => onChange({ horizonHours: h })}
                >
                  {h}h
                </button>
              ))}
            </div>
            <p className="filter-hint">
              Latest forecast published at least {formatHours(filters.horizonHours)} before each delivery period.
            </p>
          </>
        ) : (
          <>
            <label className="filter-label" htmlFor="cutoff">
              Decision time (UK, day before delivery)
            </label>
            <select id="cutoff" value={filters.cutoff} onChange={(e) => onChange({ cutoff: e.target.value })}>
              {CUTOFFS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="filter-hint">
              Latest forecast published before {filters.cutoff} on D‑1 — what the desk sees when it bids.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
