import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

const CONFIDENCE_COPY = {
  high: 'Backed by a large, steady volume of check-ins.',
  medium: 'Based on a moderate number of check-ins — treat with some caution.',
  low: 'Too few check-ins to trust this score fully.',
}

function scoreColor(score) {
  if (score === null || score === undefined) return 'var(--text-muted)'
  if (score >= 75) return 'var(--worked)'
  if (score >= 40) return 'var(--accent)'
  return 'var(--failed)'
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="mono">{point.date}</div>
      <div>
        score <span className="mono">{point.score ?? '—'}</span>
      </div>
      <div className="tooltip-muted">{point.total_checkins} check-ins so far</div>
    </div>
  )
}

export default function ScorePanel({ charger }) {
  const { final, trajectory, label, id } = charger
  const color = scoreColor(final.score)

  return (
    <section className="score-panel">
      <div className="score-panel-header">
        <div>
          <div className="score-panel-id mono">{id}</div>
          <h1 className="score-panel-label">{label}</h1>
        </div>
        <div className={`badge badge--${final.confidence}`}>
          {final.confidence} confidence
        </div>
      </div>

      <div className="score-hero">
        <div className="score-hero-number mono" style={{ color }}>
          {final.score === null ? '—' : final.score}
        </div>
        <div className="score-hero-meta">
          <div>{CONFIDENCE_COPY[final.confidence]}</div>
          <div className="tooltip-muted">
            {final.total_checkins} total check-ins · last seen{' '}
            {final.last_checkin ? new Date(final.last_checkin).toLocaleString() : '—'}
          </div>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trajectory} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              label={{ value: 'day', position: 'insideBottomRight', offset: -2, fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
