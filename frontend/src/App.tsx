import { useMemo, useState } from 'react'
import { api } from './api'
import ErrorHistogram from './components/ErrorHistogram'
import FilterBar from './components/FilterBar'
import GenerationChart from './components/GenerationChart'
import Headline from './components/Headline'
import HorizonChart from './components/HorizonChart'
import HourlyErrorChart from './components/HourlyErrorChart'
import KpiTiles from './components/KpiTiles'
import ProcurementInsight from './components/ProcurementInsight'
import { useApi } from './hooks/useApi'
import { useDebounced } from './hooks/useDebounced'
import { useUrlFilters } from './hooks/useUrlFilters'
import { buffers } from './stats'
import './components.css'

export default function App() {
  const [filters, setFilters] = useUrlFilters()
  const [showDetail, setShowDetail] = useState(false)
  const query = useDebounced(filters, 200)
  const key = JSON.stringify(query)
  const series = useApi((signal) => api.series(query, signal), key)
  const analysis = useApi((signal) => api.analysis(query, signal), key)
  const error = series.error ?? analysis.error
  const buffer = useMemo(() => (series.data ? buffers(series.data.points) : null), [series.data])

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img src="/favicon.svg" alt="" />
          <div>
            <h1>Wind Forecast Monitor</h1>
            <p>GB national wind generation · forecast vs actual · January 2026</p>
          </div>
        </div>
        <span className="badge">Source: Elexon BMRS</span>
      </header>

      <FilterBar filters={filters} onChange={setFilters} />

      {error && <div className="banner" role="alert">Could not load data — {error}</div>}

      <Headline series={series.data} filters={query} buffer90={buffer?.p90 ?? null} />

      <KpiTiles series={series.data} loading={series.loading} />

      <GenerationChart points={series.data?.points ?? []} loading={series.loading} />

      <ProcurementInsight buffers={buffer} />

      {analysis.data && (
        <div className={`analysis-grid${analysis.loading ? ' is-loading' : ''}`}>
          <div className="wide">
            <HorizonChart curve={analysis.data.horizon_curve} selectedHours={query.mode === 'horizon' ? query.horizonHours : null} />
          </div>
          <button
            type="button"
            className="detail-toggle wide"
            aria-expanded={showDetail}
            onClick={() => setShowDetail((v) => !v)}
          >
            {showDetail ? 'Hide detail' : 'More detail'}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {showDetail && (
            <>
              <ErrorHistogram bins={analysis.data.histogram} />
              <HourlyErrorChart rows={analysis.data.by_hour} />
            </>
          )}
        </div>
      )}

      <footer className="app-footer">
        Data: Elexon BMRS FUELHH (actuals) and WINDFOR (forecasts). Times shown in UK local time.
      </footer>
    </div>
  )
}
