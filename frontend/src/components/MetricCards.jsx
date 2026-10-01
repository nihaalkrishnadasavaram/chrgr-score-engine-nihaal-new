function scoreColor(score) {
  if (score === null || score === undefined) return 'var(--text-muted)'
  if (score >= 75) return 'var(--worked)'
  if (score >= 40) return 'var(--accent)'
  return 'var(--failed)'
}

export default function MetricCards({ result, checkins }) {
  const total = checkins.length
  const workedCount = checkins.filter((c) => c.result === 'worked').length
  const failedCount = total - workedCount
  const successRate = total > 0 ? ((workedCount / total) * 100).toFixed(1) : '—'
  const failureRate = total > 0 ? ((failedCount / total) * 100).toFixed(1) : '—'

  const cards = [
    {
      label: 'Reliability score',
      value: result.score === null ? '—' : result.score,
      sub: 'out of 100',
      color: scoreColor(result.score),
    },
    {
      label: 'Confidence',
      value: result.confidence,
      sub: 'based on volume',
      color:
        result.confidence === 'high'
          ? 'var(--worked)'
          : result.confidence === 'medium'
          ? 'var(--accent)'
          : 'var(--text-muted)',
      textTransform: 'capitalize',
    },
    { label: 'Total check-ins', value: total, sub: 'in range' },
    { label: 'Success rate', value: `${successRate}%`, sub: 'unweighted', color: 'var(--worked)' },
    { label: 'Failure rate', value: `${failureRate}%`, sub: 'unweighted', color: 'var(--failed)' },
  ]

  return (
    <div className="metric-cards">
      {cards.map((c) => (
        <div className="metric-card" key={c.label}>
          <div className="metric-card-label">{c.label}</div>
          <div
            className="metric-card-value mono"
            style={{ color: c.color || 'var(--text-primary)', textTransform: c.textTransform }}
          >
            {c.value}
          </div>
          <div className="metric-card-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
