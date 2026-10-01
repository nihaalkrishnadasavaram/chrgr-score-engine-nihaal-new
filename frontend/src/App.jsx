import { useMemo, useState } from 'react'
import rawCheckinsData from './data/raw_checkins.json'
import Sidebar from './components/Sidebar.jsx'
import MetricCards from './components/MetricCards.jsx'
import DataTable from './components/DataTable.jsx'
import HowItWorks from './components/HowItWorks.jsx'
import {
  ScoreOverTimeChart,
  ConfidenceOverTimeChart,
  DailySuccessFailureChart,
  WorkingFailedDonut,
  DecayWeightCurveChart,
  CheckinDistributionChart,
  AgeVsWeightScatter,
  RecentFailuresTimeline,
} from './components/Charts.jsx'
import {
  computeScore,
  checkinContributions,
  scoreTrajectory,
  dailyBuckets,
  decayCurve,
} from './lib/reliabilityEngine.js'
import { generateAllChargers } from './lib/simulate.js'
import './App.css'

const LABELS = {
  'CHRGR-001': 'Always Reliable',
  'CHRGR-002': 'Intermittent Failures',
  'CHRGR-003': 'Recently Broken',
  'CHRGR-004': 'Slow Decline',
  'CHRGR-005': 'Low Traffic',
}

const CHARGER_IDS = Object.keys(rawCheckinsData)
const DEFAULT_LAMBDA = 0.02

function overallRange(data) {
  let min = null
  let max = null
  for (const c of Object.values(data)) {
    for (const ci of c.raw_checkins) {
      const t = new Date(ci.timestamp)
      if (!min || t < min) min = t
      if (!max || t > max) max = t
    }
  }
  return [min.toISOString().slice(0, 10), max.toISOString().slice(0, 10)]
}

export default function App() {
  const [rawData, setRawData] = useState(rawCheckinsData)
  const [selectedId, setSelectedId] = useState(CHARGER_IDS[0])
  const [lambda, setLambda] = useState(DEFAULT_LAMBDA)
  const [fullRange, setFullRange] = useState(() => overallRange(rawCheckinsData))
  const [dateRange, setDateRange] = useState(() => overallRange(rawCheckinsData))
  const [showRaw, setShowRaw] = useState(false)

  const chargers = useMemo(
    () => CHARGER_IDS.map((id) => ({ id, label: LABELS[id] })),
    [],
  )

  const selectedCheckinsAll = rawData[selectedId]?.raw_checkins ?? []

  const filteredCheckins = useMemo(() => {
    const start = new Date(dateRange[0] + 'T00:00:00Z')
    const end = new Date(dateRange[1] + 'T23:59:59Z')
    return selectedCheckinsAll.filter((c) => {
      const t = new Date(c.timestamp)
      return t >= start && t <= end
    })
  }, [selectedCheckinsAll, dateRange])

  const asOf = new Date(dateRange[1] + 'T23:59:59Z')

  const result = useMemo(
    () => computeScore(filteredCheckins, asOf, lambda),
    [filteredCheckins, lambda, dateRange],
  )

  const contributions = useMemo(
    () => checkinContributions(filteredCheckins, asOf, lambda),
    [filteredCheckins, lambda, dateRange],
  )

  const trajectory = useMemo(
    () => scoreTrajectory(filteredCheckins, dateRange[0], dateRange[1], lambda),
    [filteredCheckins, dateRange, lambda],
  )

  const buckets = useMemo(() => dailyBuckets(filteredCheckins), [filteredCheckins])

  const curve = useMemo(() => decayCurve(lambda), [lambda])

  function handleNewSimulation() {
    const fresh = generateAllChargers(fullRange[0] + 'T00:00:00Z', 90)
    setRawData(fresh)
    const range = overallRange(fresh)
    setFullRange(range)
    setDateRange(range)
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="wordmark">
          <span className="wordmark-bolt">⚡</span>
          <span>Chrgr Reliability Score Engine</span>
        </div>
        <div className="header-subtitle">
          Turns raw driver check-ins into a single, trustworthy reliability score for every charger.
        </div>
      </header>

      <div className="app-body">
        <Sidebar
          chargers={chargers}
          selectedId={selectedId}
          onSelectCharger={setSelectedId}
          lambda={lambda}
          onLambdaChange={setLambda}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          fullRange={fullRange}
          showRaw={showRaw}
          onShowRawChange={setShowRaw}
          onNewSimulation={handleNewSimulation}
          onReset={() => {}}
        />

        <main className="main-content">
          <MetricCards result={result} checkins={filteredCheckins} />
          <p className="last-checkin-note">
            Last check-in:{' '}
            <span className="mono">
              {result.last_checkin ? new Date(result.last_checkin).toUTCString() : '—'}
            </span>
          </p>

          <h2 className="section-title">Visualizations</h2>
          <div className="chart-grid">
            <ScoreOverTimeChart trajectory={trajectory} checkins={filteredCheckins} showRaw={showRaw} />
            <ConfidenceOverTimeChart trajectory={trajectory} />
            <DailySuccessFailureChart buckets={buckets} />
            <WorkingFailedDonut checkins={filteredCheckins} />
            <DecayWeightCurveChart curve={curve} lambda={lambda} />
            <CheckinDistributionChart buckets={buckets} />
            <AgeVsWeightScatter rows={contributions} />
            <RecentFailuresTimeline checkins={filteredCheckins} rangeEnd={dateRange[1]} />
          </div>

          <DataTable rows={contributions} chargerId={selectedId} />

          <HowItWorks />

          <footer className="app-footer">Chrgr Reliability Score Engine — internal analytics tool.</footer>
        </main>
      </div>
    </div>
  )
}
