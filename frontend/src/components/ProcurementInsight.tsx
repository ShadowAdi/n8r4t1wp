import type { Buffers } from '../stats'
import { formatMW } from '../format'

interface Props {
  buffers: Buffers | null
}

export default function ProcurementInsight({ buffers }: Props) {
  if (!buffers) return null
  const items = [
    { value: buffers.p50, label: 'covers 1 in 2 periods' },
    { value: buffers.p90, label: 'covers 9 in 10 periods' },
    { value: buffers.p95, label: 'covers 19 in 20 periods' },
  ]

  return (
    <section className="card insight" aria-label="How much extra to buy">
      <div className="insight-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18M5 10l7-7 7 7" />
        </svg>
      </div>
      <div className="insight-body">
        <h2>How much extra to buy</h2>
        <p>Extra power to buy on top of what the wind forecast suggests, to cover the wind shortfall:</p>
        <ul className="buffer-list">
          {items.map((item) => (
            <li key={item.label}>
              <span className="buffer-value">+{formatMW(Math.max(0, item.value))}</span>
              <span className="buffer-label">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
