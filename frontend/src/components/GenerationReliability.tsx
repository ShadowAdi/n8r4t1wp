import type { AnalysisResponse } from '../api'
import { formatGW, formatMW } from '../format'

interface Props {
  generation: AnalysisResponse['generation']
}

export default function GenerationReliability({ generation }: Props) {
  if (!generation) return null
  const { minimum, maximum, p10, p50, p90 } = generation
  const span = maximum - minimum || 1
  const pos = (v: number) => `${((v - minimum) / span) * 100}%`

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>How much wind can be relied on?</h2>
          <p className="card-sub">Distribution of actual wind output over the selected period.</p>
        </div>
      </header>
      <div className="reliability">
        <div className="reliability-stats">
          <div>
            <span className="kpi-label">Firm (P10)</span>
            <span className="kpi-value">{formatMW(p10)}</span>
            <span className="kpi-note">exceeded 90% of the time</span>
          </div>
          <div>
            <span className="kpi-label">Median (P50)</span>
            <span className="kpi-value">{formatMW(p50)}</span>
            <span className="kpi-note">exceeded half the time</span>
          </div>
          <div>
            <span className="kpi-label">High (P90)</span>
            <span className="kpi-value">{formatMW(p90)}</span>
            <span className="kpi-note">exceeded 10% of the time</span>
          </div>
        </div>
        <div className="range" role="img" aria-label={`Wind output ranged from ${formatMW(minimum)} to ${formatMW(maximum)}`}>
          <div className="range-track">
            <div className="range-band" style={{ left: pos(p10), width: `calc(${pos(p90)} - ${pos(p10)})` }} />
            <div className="range-mark" style={{ left: pos(p50) }} />
          </div>
          <div className="range-scale">
            <span>min {formatGW(minimum)}</span>
            <span>max {formatGW(maximum)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
