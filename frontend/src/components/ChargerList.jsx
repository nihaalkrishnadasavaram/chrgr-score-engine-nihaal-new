const CONFIDENCE_LABEL = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

function scoreColor(score) {
  if (score === null || score === undefined) return 'var(--text-muted)'
  if (score >= 75) return 'var(--worked)'
  if (score >= 40) return 'var(--accent)'
  return 'var(--failed)'
}

export default function ChargerList({ chargers, selectedId, onSelect }) {
  return (
    <nav className="charger-list" aria-label="Chargers">
      {chargers.map((c) => {
        const active = c.id === selectedId
        const score = c.final.score
        return (
          <button
            key={c.id}
            className={`charger-row${active ? ' charger-row--active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <div className="charger-row-main">
              <div className="charger-row-id mono">{c.id}</div>
              <div className="charger-row-label">{c.label}</div>
            </div>
            <div className="charger-row-meta">
              <span
                className="charger-row-score mono"
                style={{ color: scoreColor(score) }}
              >
                {score === null ? '—' : score}
              </span>
              <span
                className={`confidence-dot confidence-dot--${c.final.confidence}`}
                title={CONFIDENCE_LABEL[c.final.confidence]}
              />
            </div>
          </button>
        )
      })}
    </nav>
  )
}
