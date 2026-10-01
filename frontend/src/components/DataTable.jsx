import { useMemo, useState } from 'react'

function toCSV(rows) {
  const header = 'Timestamp,Status,Age (hours),Weight,Contribution to Score (%)'
  const lines = rows.map((r) =>
    [
      r.timestamp,
      r.result,
      r.ageHours.toFixed(2),
      r.weight.toFixed(4),
      r.contributionPct.toFixed(4),
    ].join(','),
  )
  return [header, ...lines].join('\n')
}

function downloadCSV(rows, chargerId) {
  const csv = toCSV(rows)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${chargerId}-checkins.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function DataTable({ rows, chargerId }) {
  const [statusFilter, setStatusFilter] = useState({ worked: true, failed: true })

  const filtered = useMemo(
    () => rows.filter((r) => statusFilter[r.result]),
    [rows, statusFilter],
  )

  const toggle = (key) => setStatusFilter((s) => ({ ...s, [key]: !s[key] }))

  return (
    <section className="data-table-section">
      <h2 className="section-title">Detailed Check-in Data</h2>

      <div className="filter-row">
        <span className="control-label">Filter by status</span>
        <button
          className={`filter-tag${statusFilter.worked ? ' filter-tag--active-worked' : ''}`}
          onClick={() => toggle('worked')}
        >
          Working {statusFilter.worked ? '✕' : ''}
        </button>
        <button
          className={`filter-tag${statusFilter.failed ? ' filter-tag--active-failed' : ''}`}
          onClick={() => toggle('failed')}
        >
          Failed {statusFilter.failed ? '✕' : ''}
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Status</th>
              <th>Age (hours)</th>
              <th>Weight</th>
              <th>Contribution to Score (%)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((r, i) => (
              <tr key={i}>
                <td className="mono">{r.timestamp.slice(0, 19).replace('T', ' ')}</td>
                <td className={r.result === 'worked' ? 'status-worked' : 'status-failed'}>
                  {r.result === 'worked' ? 'Working' : 'Failed'}
                </td>
                <td className="mono num">{r.ageHours.toFixed(2)}</td>
                <td className="mono num">{r.weight.toFixed(4)}</td>
                <td className="mono num">{r.contributionPct.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <p className="table-note">Showing first 200 of {filtered.length} rows — export CSV for the full set.</p>
        )}
      </div>

      <button className="btn btn--primary" onClick={() => downloadCSV(filtered, chargerId)}>
        ⬇ Export CSV
      </button>
    </section>
  )
}
