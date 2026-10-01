// JS port of the Python reliability_engine.py — kept numerically identical
// so the live dashboard (lambda slider, date filters) matches the backend.

export function weight(hoursElapsed, lambda) {
  return Math.exp(-lambda * Math.max(hoursElapsed, 0))
}

export function confidenceFor(totalCheckins, lowMed = 5, medHigh = 20) {
  if (totalCheckins >= medHigh) return 'high'
  if (totalCheckins >= lowMed) return 'medium'
  return 'low'
}

/**
 * checkins: [{ result: 'worked' | 'failed', timestamp: ISOString }]
 * asOf: Date
 * lambda: decay constant
 */
export function computeScore(checkins, asOf, lambda) {
  if (!checkins || checkins.length === 0) {
    return { score: null, confidence: 'low', total_checkins: 0, last_checkin: null }
  }

  let weightedSuccess = 0
  let weightedTotal = 0
  let latest = checkins[0].timestamp

  for (const c of checkins) {
    const hours = (asOf.getTime() - new Date(c.timestamp).getTime()) / 3600000
    const w = weight(hours, lambda)
    weightedTotal += w
    if (c.result === 'worked') weightedSuccess += w
    if (new Date(c.timestamp) > new Date(latest)) latest = c.timestamp
  }

  const score = Math.round((100 * weightedSuccess) / weightedTotal)
  return {
    score,
    confidence: confidenceFor(checkins.length),
    total_checkins: checkins.length,
    last_checkin: latest,
  }
}

/** Per-check-in breakdown: age, weight, and % contribution to the final score. */
export function checkinContributions(checkins, asOf, lambda) {
  let weightedTotal = 0
  const rows = checkins.map((c) => {
    const ageHours = (asOf.getTime() - new Date(c.timestamp).getTime()) / 3600000
    const w = weight(ageHours, lambda)
    weightedTotal += w
    return { ...c, ageHours, weight: w }
  })
  return rows
    .map((r) => ({
      ...r,
      contributionPct: weightedTotal > 0 ? (100 * r.weight) / weightedTotal : 0,
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

/** Daily score + confidence trajectory across a date range. */
export function scoreTrajectory(checkins, startDate, endDate, lambda) {
  const days = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  const msPerDay = 86400000
  const totalDays = Math.round((end - start) / msPerDay)

  for (let d = 0; d <= totalDays; d++) {
    const asOf = new Date(start.getTime() + (d + 1) * msPerDay)
    const visible = checkins.filter((c) => new Date(c.timestamp) <= asOf)
    const result = computeScore(visible, asOf, lambda)
    days.push({
      day: d,
      date: asOf.toISOString().slice(0, 10),
      score: result.score,
      confidence: result.confidence,
      confidenceLevel: result.confidence === 'high' ? 3 : result.confidence === 'medium' ? 2 : 1,
      total_checkins: result.total_checkins,
    })
  }
  return days
}

/** Check-ins bucketed per day (for the distribution histogram / success-failure bars). */
export function dailyBuckets(checkins) {
  const map = new Map()
  for (const c of checkins) {
    const day = c.timestamp.slice(0, 10)
    if (!map.has(day)) map.set(day, { date: day, worked: 0, failed: 0, total: 0 })
    const bucket = map.get(day)
    bucket.total += 1
    if (c.result === 'worked') bucket.worked += 1
    else bucket.failed += 1
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1))
}

export function halfLifeHours(lambda) {
  return Math.log(2) / lambda
}

export function decayCurve(lambda, maxHours = 700, points = 140) {
  const step = maxHours / points
  const curve = []
  for (let i = 0; i <= points; i++) {
    const h = i * step
    curve.push({ hours: h, weight: weight(h, lambda) })
  }
  return curve
}
