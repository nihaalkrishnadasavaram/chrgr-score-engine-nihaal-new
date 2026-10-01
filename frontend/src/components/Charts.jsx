import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts'

const GRID = 'var(--border)'
const AXIS_TICK = { fill: 'var(--text-secondary)', fontSize: 11 }
const WORKED = 'var(--worked)'
const FAILED = 'var(--failed)'
const ACCENT = 'var(--accent)'

function Panel({ title, children, className = '' }) {
  return (
    <div className={`chart-panel ${className}`}>
      <h3 className="chart-panel-title">{title}</h3>
      {children}
    </div>
  )
}

function TooltipBox({ children }) {
  return <div className="chart-tooltip">{children}</div>
}

// --- 1. Score over time (with optional raw check-in overlay) --------------

export function ScoreOverTimeChart({ trajectory, checkins, showRaw }) {
  return (
    <Panel title="Reliability Score Over Time">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={trajectory} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return (
                <TooltipBox>
                  <div className="mono">{p.date}</div>
                  <div>
                    score <span className="mono">{p.score ?? '—'}</span>
                  </div>
                  <div className="tooltip-muted">{p.total_checkins} check-ins so far</div>
                </TooltipBox>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#scoreFill)"
            connectNulls
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      {showRaw && (
        <div className="raw-dots-strip">
          {checkins.map((c, i) => (
            <span
              key={i}
              className="raw-dot"
              style={{ background: c.result === 'worked' ? WORKED : FAILED }}
              title={`${c.timestamp} — ${c.result}`}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}

// --- 2. Confidence over time (step) ---------------------------------------

export function ConfidenceOverTimeChart({ trajectory }) {
  return (
    <Panel title="Confidence Level Over Time">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={trajectory} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis
            domain={[0.5, 3.5]}
            ticks={[1, 2, 3]}
            tickFormatter={(v) => ({ 1: 'Low', 2: 'Medium', 3: 'High' }[v] ?? '')}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return (
                <TooltipBox>
                  <div className="mono">{p.date}</div>
                  <div style={{ textTransform: 'capitalize' }}>{p.confidence}</div>
                </TooltipBox>
              )
            }}
          />
          <Line
            type="stepAfter"
            dataKey="confidenceLevel"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  )
}

// --- 3. Daily success vs failure (stacked bars) ---------------------------

export function DailySuccessFailureChart({ buckets }) {
  return (
    <Panel title="Daily Success vs Failure">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={buckets} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={30} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <TooltipBox>
                  <div className="mono">{label}</div>
                  <div style={{ color: WORKED }}>worked: {payload.find((p) => p.dataKey === 'worked')?.value ?? 0}</div>
                  <div style={{ color: FAILED }}>failed: {payload.find((p) => p.dataKey === 'failed')?.value ?? 0}</div>
                </TooltipBox>
              )
            }}
          />
          <Bar dataKey="worked" stackId="a" fill={WORKED} name="Working" />
          <Bar dataKey="failed" stackId="a" fill={FAILED} name="Failed" />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  )
}

// --- 4. Working vs Failed donut -------------------------------------------

export function WorkingFailedDonut({ checkins }) {
  const worked = checkins.filter((c) => c.result === 'worked').length
  const failed = checkins.length - worked
  const total = checkins.length || 1
  const data = [
    { name: 'Working', value: worked, pct: ((worked / total) * 100).toFixed(1) },
    { name: 'Failed', value: failed, pct: ((failed / total) * 100).toFixed(1) },
  ]

  return (
    <Panel title="Working vs Failed Check-ins">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={2}
            label={({ name, pct }) => `${name} ${pct}%`}
            labelLine={false}
          >
            <Cell fill={WORKED} />
            <Cell fill={FAILED} />
          </Pie>
          <Legend
            verticalAlign="middle"
            align="right"
            layout="vertical"
            iconType="square"
            wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return (
                <TooltipBox>
                  {p.name}: {p.value} ({p.pct}%)
                </TooltipBox>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Panel>
  )
}

// --- 5. Decay weight curve --------------------------------------------------

export function DecayWeightCurveChart({ curve, lambda }) {
  const halfLife = Math.log(2) / lambda
  return (
    <Panel title="Time Decay Weight Curve">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={curve} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="hours"
            type="number"
            domain={[0, 'dataMax']}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            label={{ value: 'Check-in age (hours)', position: 'insideBottomRight', offset: -2, fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <YAxis domain={[0, 1]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return (
                <TooltipBox>
                  <div>age: {p.hours.toFixed(0)}h</div>
                  <div>weight: {p.weight.toFixed(3)}</div>
                </TooltipBox>
              )
            }}
          />
          <ReferenceLine
            x={halfLife}
            stroke={FAILED}
            strokeDasharray="4 4"
            label={{ value: `Half-life: ${halfLife.toFixed(1)}h`, fill: 'var(--text-secondary)', fontSize: 11, position: 'top' }}
          />
          <Line type="monotone" dataKey="weight" stroke={ACCENT} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  )
}

// --- 6. Check-in distribution histogram ------------------------------------

export function CheckinDistributionChart({ buckets }) {
  return (
    <Panel title="Distribution of Check-ins Over Time">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={buckets} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={30} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <TooltipBox>
                  <div className="mono">{label}</div>
                  <div>check-ins: {payload[0].value}</div>
                </TooltipBox>
              )
            }}
          />
          <Bar dataKey="total" fill="#7c93a8" />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  )
}

// --- 7. Check-in age vs weight scatter --------------------------------------

export function AgeVsWeightScatter({ rows }) {
  const worked = rows.filter((r) => r.result === 'worked')
  const failed = rows.filter((r) => r.result === 'failed')
  return (
    <Panel title="Check-in Age vs Weight">
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 5" />
          <XAxis
            dataKey="ageHours"
            type="number"
            name="Age"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            label={{ value: 'Age (hours)', position: 'insideBottomRight', offset: -2, fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <YAxis
            dataKey="weight"
            type="number"
            domain={[0, 1]}
            name="Weight"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return (
                <TooltipBox>
                  <div className="mono">{p.timestamp.slice(0, 16).replace('T', ' ')}</div>
                  <div>age: {p.ageHours.toFixed(1)}h · weight: {p.weight.toFixed(3)}</div>
                </TooltipBox>
              )
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
          <Scatter name="Working" data={worked} fill={WORKED} opacity={0.75} />
          <Scatter name="Failed" data={failed} fill={FAILED} opacity={0.85} />
        </ScatterChart>
      </ResponsiveContainer>
    </Panel>
  )
}

// --- 8. Recent failures timeline (last 14 days) -----------------------------

export function RecentFailuresTimeline({ checkins, rangeEnd }) {
  const cutoff = new Date(rangeEnd)
  cutoff.setDate(cutoff.getDate() - 14)
  const failures = checkins
    .filter((c) => c.result === 'failed' && new Date(c.timestamp) >= cutoff)
    .map((c) => ({ x: new Date(c.timestamp).getTime(), y: 1, timestamp: c.timestamp }))

  return (
    <Panel title="Recent Failures Timeline (Last 14 Days)">
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 24, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 5" horizontal={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={[cutoff.getTime(), new Date(rangeEnd).getTime()]}
            tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID }}
          />
          <YAxis dataKey="y" domain={[0, 2]} hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return <TooltipBox>{new Date(p.timestamp).toLocaleString()}</TooltipBox>
            }}
          />
          <Scatter data={failures} fill={FAILED} shape="cross" />
        </ScatterChart>
      </ResponsiveContainer>
      {failures.length === 0 && (
        <p className="chart-empty-note">No failures in the last 14 days of the selected range.</p>
      )}
    </Panel>
  )
}
