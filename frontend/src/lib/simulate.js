// JS port of backend/simulate.py's charger patterns, used by the "New
// Simulation" button to regenerate fresh randomized data in the browser.

const DAY_MS = 86400000

function randomTimesOnDay(dayStart, n) {
  const times = []
  for (let i = 0; i < n; i++) {
    const hourOffset = 6 + Math.random() * 17 // 6:00–23:00
    times.push(new Date(dayStart.getTime() + hourOffset * 3600000))
  }
  return times.sort((a, b) => a - b)
}

function checkinsForDays(simStart, simDays, perDayFn) {
  const checkins = []
  for (let d = 0; d < simDays; d++) {
    const day = new Date(simStart.getTime() + d * DAY_MS)
    perDayFn(d, day, checkins)
  }
  return checkins
}

function pushCheckins(checkins, times, failRate) {
  for (const t of times) {
    const result = Math.random() < failRate ? 'failed' : 'worked'
    checkins.push({ result, timestamp: t.toISOString() })
  }
}

export const GENERATORS = {
  'CHRGR-001': (simStart, simDays) =>
    checkinsForDays(simStart, simDays, (d, day, out) => {
      const times = randomTimesOnDay(day, 1 + Math.floor(Math.random() * 3))
      pushCheckins(out, times, 0.01)
    }),

  'CHRGR-002': (simStart, simDays) =>
    checkinsForDays(simStart, simDays, (d, day, out) => {
      const cyclePos = (d % 20) / 20
      const failRate = 0.2 + 0.4 * Math.abs(cyclePos - 0.5) * 2
      const times = randomTimesOnDay(day, 1 + Math.floor(Math.random() * 3))
      pushCheckins(out, times, failRate)
    }),

  'CHRGR-003': (simStart, simDays) =>
    checkinsForDays(simStart, simDays, (d, day, out) => {
      const broken = d >= simDays - 10
      const failRate = broken ? 0.9 : 0.03
      const times = randomTimesOnDay(day, 1 + Math.floor(Math.random() * 3))
      pushCheckins(out, times, failRate)
    }),

  'CHRGR-004': (simStart, simDays) =>
    checkinsForDays(simStart, simDays, (d, day, out) => {
      const failRate = 0.05 + 0.5 * (d / simDays)
      const times = randomTimesOnDay(day, 1 + Math.floor(Math.random() * 3))
      pushCheckins(out, times, failRate)
    }),

  'CHRGR-005': (simStart, simDays) =>
    checkinsForDays(simStart, simDays, (d, day, out) => {
      if (Math.random() < 0.25) {
        const times = randomTimesOnDay(day, 1)
        pushCheckins(out, times, 0.15)
      }
    }),
}

export function generateAllChargers(simStartISO, simDays = 90) {
  const simStart = new Date(simStartISO)
  const result = {}
  for (const [id, gen] of Object.entries(GENERATORS)) {
    const checkins = gen(simStart, simDays).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    )
    result[id] = { id, raw_checkins: checkins }
  }
  return result
}
