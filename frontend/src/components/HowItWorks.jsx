import { useState } from 'react'

export default function HowItWorks() {
  const [open, setOpen] = useState(false)

  return (
    <section className="how-it-works">
      <button className="how-it-works-toggle" onClick={() => setOpen((o) => !o)}>
        <span className={`chevron${open ? ' chevron--open' : ''}`}>›</span>
        📘 How does the Reliability Score work?
      </button>

      {open && (
        <div className="how-it-works-body">
          <h4>What is the Reliability Score?</h4>
          <p>
            It's a single number from 0 to 100 that tells a driver "how likely is this charger to
            actually work if I drive there right now?" It's built from every driver check-in
            reported for that charger — each one says whether the charger was working or broken at
            that moment.
          </p>

          <h4>Why not just average all check-ins?</h4>
          <p>
            A simple average treats a check-in from 6 months ago exactly the same as one from an
            hour ago. That's misleading — a charger that worked perfectly for a year and then broke
            yesterday should score <em>low</em> right now, not high.
          </p>

          <h4>How exponential decay works</h4>
          <p>
            Every check-in is given a <strong>weight</strong> based on how old it is, using the
            formula <code>weight = e^(−λ × age_in_hours)</code>. A brand-new check-in has a weight
            close to 1 (full influence). As a check-in gets older, its weight shrinks smoothly
            toward 0 — never suddenly disappearing, just mattering less and less. The score is then
            a <em>weighted</em> success rate, not a plain average.
          </p>

          <h4>What does λ (lambda) control?</h4>
          <p>λ is the "how fast do we forget the past" dial:</p>
          <ul>
            <li>
              <strong>Small λ</strong> → slow decay → old check-ins still count for a lot → the
              score changes slowly and reflects long-term history.
            </li>
            <li>
              <strong>Large λ</strong> → fast decay → only very recent check-ins matter → the score
              reacts quickly to a charger that just broke (or just got fixed).
            </li>
          </ul>
          <p>
            Try dragging the λ slider in the sidebar and watch the "Time Decay Weight Curve" chart
            change shape, and the score for a charger like <em>Recently Broken</em> (healthy for 80
            days, then broken) shift accordingly.
          </p>

          <h4>How is confidence calculated?</h4>
          <p>
            Confidence answers a different question:{' '}
            <strong>"how much should I trust this score?"</strong> It's based purely on how many
            check-ins we have — a charger with 2 check-ins showing 100% could just be lucky, while
            one with 50 check-ins showing 100% is a strong signal. We use three simple tiers:
          </p>
          <table className="confidence-table">
            <thead>
              <tr>
                <th>Check-ins</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Fewer than 5</td>
                <td>Low</td>
              </tr>
              <tr>
                <td>5 to 19</td>
                <td>Medium</td>
              </tr>
              <tr>
                <td>20 or more</td>
                <td>High</td>
              </tr>
            </tbody>
          </table>
          <p>
            A driver should read a <strong>high score with low confidence</strong> more
            skeptically than a <strong>high score with high confidence</strong>.
          </p>
        </div>
      )}
    </section>
  )
}
