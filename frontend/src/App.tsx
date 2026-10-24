import { api } from './api'
import FilterBar from './components/FilterBar'
import GenerationChart from './components/GenerationChart'
import { useApi } from './hooks/useApi'
import { useDebounced } from './hooks/useDebounced'
import { useUrlFilters } from './hooks/useUrlFilters'
import './components.css'

export default function App() {
  const [filters, setFilters] = useUrlFilters()
  const query = useDebounced(filters, 200)
  const key = JSON.stringify(query)
  const series = useApi((signal) => api.series(query, signal), key)

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

      {series.error && <div className="banner" role="alert">Could not load data — {series.error}</div>}

      <GenerationChart points={series.data?.points ?? []} loading={series.loading} />

      <footer className="app-footer">
        Data: Elexon BMRS FUELHH (actuals) and WINDFOR (forecasts). Times shown in UK local time.
      </footer>
    </div>
  )
}
