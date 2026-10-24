import { api } from './api'
import ErrorHistogram from './components/ErrorHistogram'
import FilterBar from './components/FilterBar'
import GenerationChart from './components/GenerationChart'
import GenerationReliability from './components/GenerationReliability'
import HorizonChart from './components/HorizonChart'
import HourlyErrorChart from './components/HourlyErrorChart'
import KpiTiles from './components/KpiTiles'
import ProcurementInsight from './components/ProcurementInsight'
import { useApi } from './hooks/useApi'
import { useDebounced } from './hooks/useDebounced'
import { useUrlFilters } from './hooks/useUrlFilters'
import './components.css'

export default function App() {
  const [filters, setFilters] = useUrlFilters()
  const query = useDebounced(filters, 200)
  const key = JSON.stringify(query)
  const series = useApi((signal) => api.series(query, signal), key)
  const analysis = useApi((signal) => api.analysis(query, signal), key)
  const error = series.error ?? analysis.error

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

      <KpiTiles series={series.data} loading={series.loading} />

      <GenerationChart points={series.data?.points ?? []} loading={series.loading} />

      <ProcurementInsight series={series.data} filters={query} />

      <h2 className="section-title">Forecast accuracy analysis</h2>

      {analysis.data && (
        <div className={`analysis-grid${analysis.loading ? ' is-loading' : ''}`}>
          <div className="wide">
            <HorizonChart curve={analysis.data.horizon_curve} selectedHours={query.mode === 'horizon' ? query.horizonHours : null} />
          </div>
          <ErrorHistogram bins={analysis.data.histogram} />
          <HourlyErrorChart rows={analysis.data.by_hour} />
          <div className="wide">
            <GenerationReliability generation={analysis.data.generation} />
          </div>
        </div>
      )}

      <footer className="app-footer">
        Data: Elexon BMRS FUELHH (actuals) and WINDFOR (forecasts). Times shown in UK local time.
      </footer>
    </div>
  )
}
