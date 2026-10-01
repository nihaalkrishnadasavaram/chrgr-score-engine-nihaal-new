const CHARGER_DESCRIPTIONS = {
  'CHRGR-001': 'Consistently reliable across the entire 90-day window.',
  'CHRGR-002': 'Oscillates between healthy and flaky in ~20-day cycles.',
  'CHRGR-003': 'Reliable for 80 days, then failed hard in the last 10.',
  'CHRGR-004': 'Failure rate climbs steadily — a slow, gradual decline.',
  'CHRGR-005': 'Sparse check-ins throughout — tests low-confidence scoring.',
}

const DEFAULT_LAMBDA = 0.02

export default function Sidebar({
  chargers,
  selectedId,
  onSelectCharger,
  lambda,
  onLambdaChange,
  dateRange,
  onDateRangeChange,
  fullRange,
  showRaw,
  onShowRawChange,
  onNewSimulation,
  onReset,
}) {
  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Controls</h2>

      <div className="control-block">
        <label className="control-label" htmlFor="charger-select">
          Select charger
        </label>
        <select
          id="charger-select"
          className="control-select"
          value={selectedId}
          onChange={(e) => onSelectCharger(e.target.value)}
        >
          {chargers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id} — {c.label}
            </option>
          ))}
        </select>
        <p className="control-help">{CHARGER_DESCRIPTIONS[selectedId]}</p>
      </div>

      <div className="control-block">
        <div className="control-label-row">
          <label className="control-label" htmlFor="lambda-slider">
            Decay constant (λ)
          </label>
          <span
            className="help-dot"
            title="Controls how fast old check-ins are forgotten. Small λ = slow decay (long memory). Large λ = fast decay (reacts quickly to recent changes)."
          >
            ?
          </span>
        </div>
        <div className="lambda-value mono">{lambda.toFixed(3)}</div>
        <input
          id="lambda-slider"
          type="range"
          min="0.002"
          max="0.08"
          step="0.001"
          value={lambda}
          onChange={(e) => onLambdaChange(parseFloat(e.target.value))}
          className="control-slider"
        />
        <p className="control-help">
          Half-life at this λ: <span className="mono">{(Math.log(2) / lambda).toFixed(1)}h</span>
        </p>
      </div>

      <div className="control-block">
        <div className="control-label-row">
          <label className="control-label">Date range filter</label>
          <span
            className="help-dot"
            title="Only check-ins within this window are used for every chart and the score."
          >
            ?
          </span>
        </div>
        <div className="date-range-row">
          <div className="date-field">
            <span className="date-field-label">From</span>
            <input
              type="date"
              className="control-date"
              value={dateRange[0]}
              min={fullRange[0]}
              max={dateRange[1]}
              onChange={(e) => onDateRangeChange([e.target.value, dateRange[1]])}
            />
          </div>
          <div className="date-field">
            <span className="date-field-label">To</span>
            <input
              type="date"
              className="control-date"
              value={dateRange[1]}
              min={dateRange[0]}
              max={fullRange[1]}
              onChange={(e) => onDateRangeChange([dateRange[0], e.target.value])}
            />
          </div>
        </div>
      </div>

      <div className="control-block control-checkbox-row">
        <input
          type="checkbox"
          id="show-raw"
          checked={showRaw}
          onChange={(e) => onShowRawChange(e.target.checked)}
        />
        <label htmlFor="show-raw">Show raw check-ins on chart</label>
      </div>

      <div className="sidebar-actions">
        <button className="btn btn--primary" onClick={onNewSimulation}>
          ↻ New simulation
        </button>
        <button
          className="btn"
          onClick={() => {
            onLambdaChange(DEFAULT_LAMBDA)
            onDateRangeChange(fullRange)
            onShowRawChange(false)
          }}
        >
          Reset
        </button>
      </div>
    </aside>
  )
}
