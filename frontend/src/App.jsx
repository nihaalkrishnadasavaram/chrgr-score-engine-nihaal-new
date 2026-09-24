import { useMemo, useState } from 'react'
import simulationData from './data/simulation_results.json'
import ChargerList from './components/ChargerList.jsx'
import ScorePanel from './components/ScorePanel.jsx'
import './App.css'

const CHARGER_IDS = Object.keys(simulationData)

export default function App() {
  const [selectedId, setSelectedId] = useState(CHARGER_IDS[0])

  const chargers = useMemo(
    () => CHARGER_IDS.map((id) => simulationData[id]),
    [],
  )

  const selected = simulationData[selectedId]

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="wordmark">
          <span className="wordmark-bolt">⚡</span>
          <span>Chrgr</span>
        </div>
        <div className="header-subtitle">Reliability Score Engine — 90-day simulation</div>
      </header>

      <div className="app-body">
        <ChargerList
          chargers={chargers}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <ScorePanel charger={selected} />
      </div>

      <footer className="app-footer">
        <span className="mono">weight(t) = e^(−λt)</span>
        <span>· λ = 0.02 · score = decay-weighted % of check-ins that worked</span>
      </footer>
    </div>
  )
}
