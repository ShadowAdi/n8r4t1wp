export default function App() {
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
      <footer className="app-footer">
        Data: Elexon BMRS FUELHH (actuals) and WINDFOR (forecasts). Times shown in UK local time.
      </footer>
    </div>
  )
}
