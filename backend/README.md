# Chrgr Reliability Score Engine

Converts raw driver check-ins into a single, trustworthy reliability score for
each charger — the number a driver sees before deciding whether to drive
somewhere for a charge.

## How it works

### 1. Time decay

Every check-in is weighted by how long ago it happened, using exponential
decay:

```
weight(t) = e^(-λ * t)
```

where `t` is hours since the check-in and `λ` (`decay_constant`) controls how
fast old data is "forgotten." Default `λ = 0.02`, which roughly halves a
check-in's weight every ~35 hours.

### 2. Score calculation

The score is the decay-weighted share of check-ins that worked:

```
score = 100 * (Σ weight(t) for worked check-ins)
            / (Σ weight(t) for all check-ins)
```

A charger with mostly-recent failures scores low even if it worked fine
months ago. A charger with a single bad check-in from last week and steady
successes since then recovers quickly.

### 3. Confidence

Confidence reflects how much check-in *volume* backs the score, independent
of the score itself:

| Total check-ins | Confidence |
|---|---|
| ≥ 20 | `high` |
| 5–19 | `medium` |
| < 5 | `low` |
| 0 | `low` (score is `null`) |

Thresholds are configurable via `confidence_thresholds=(low_med, med_high)`.

## Usage

```python
from datetime import datetime, timezone
from reliability_engine import Checkin, CheckinResult, ReliabilityScoreEngine

engine = ReliabilityScoreEngine(decay_constant=0.02)

checkins = [
    Checkin(CheckinResult.WORKED, datetime(2026, 9, 23, 14, 0, tzinfo=timezone.utc)),
    Checkin(CheckinResult.FAILED, datetime(2026, 9, 22, 9, 0, tzinfo=timezone.utc)),
]

result = engine.compute(checkins)
# {"score": 84, "confidence": "medium", "total_checkins": 2, "last_checkin": "..."}
```

## Running tests

```bash
pip install pytest
pytest tests/ -v
```

46 tests covering: zero check-ins, all-pass, all-fail, mixed old/recent data
(decay behavior), duplicate timestamps, future/invalid timestamps, and every
confidence threshold boundary.

## Simulation

Two ways to run it:

```bash
python simulate.py                    # script: writes JSON + a PNG plot
jupyter notebook reliability_score_simulation.ipynb   # notebook: same simulation, walked through step by step
```

Generates 90 days of synthetic check-in data for 5 chargers, each with a
distinct pattern:

- **CHRGR-001 — Always Reliable**: ~99% success throughout
- **CHRGR-002 — Intermittent Failures**: oscillates between ~80% and ~40% success in 20-day cycles
- **CHRGR-003 — Recently Broken**: reliable for 80 days, then fails hard in the last 10
- **CHRGR-004 — Slow Decline**: failure rate ramps steadily from 5% to 55%
- **CHRGR-005 — Low Traffic**: sparse check-ins (~1 every 4 days), tests confidence at low volume

Outputs to `simulation_output/`:
- `simulation_results.json` — daily score/confidence trajectory per charger (consumed by the React dashboard)
- `score_trajectories.png` — plotted score evolution over the 90 days

`reliability_score_simulation.ipynb` runs the identical simulation (same seed, same patterns) as a notebook — setup → charger pattern definitions → run → plot → final scores summary — each step in its own cell with explanation, for anyone who wants to read or re-run it interactively rather than as a script.

## Stack

Python, NumPy-free (pure stdlib + `math`), Matplotlib, pytest
