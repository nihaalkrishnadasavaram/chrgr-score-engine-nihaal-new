"""
90-day synthetic check-in simulation across 5 chargers, each with a
distinct reliability pattern. Computes the daily reliability score/confidence
trajectory for each charger and exports the results as JSON (for the React
dashboard) and PNG plots (for the README / notebook).

Run: python simulate.py
"""

import json
import random
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

import matplotlib.pyplot as plt

from reliability_engine import Checkin, CheckinResult, ReliabilityScoreEngine

random.seed(42)

SIM_DAYS = 90
SIM_END = datetime(2026, 9, 24, 0, 0, 0, tzinfo=timezone.utc)
SIM_START = SIM_END - timedelta(days=SIM_DAYS)

OUT_DIR = Path(__file__).parent / "simulation_output"
OUT_DIR.mkdir(exist_ok=True)


# --------------------------------------------------------------------- #
# Charger patterns: each returns a list of Checkin objects across the
# 90-day window, at roughly 1-4 check-ins/day with the given success rate
# behavior over time.
# --------------------------------------------------------------------- #

def _random_times_on_day(day_start: datetime, n: int):
    return sorted(
        day_start + timedelta(hours=random.uniform(6, 23))
        for _ in range(n)
    )


def gen_always_works(charger_id: str):
    """Reliable charger: ~99% success throughout."""
    checkins = []
    for d in range(SIM_DAYS):
        day = SIM_START + timedelta(days=d)
        for t in _random_times_on_day(day, random.randint(1, 3)):
            result = CheckinResult.FAILED if random.random() < 0.01 else CheckinResult.WORKED
            checkins.append(Checkin(result, t))
    return checkins


def gen_intermittent(charger_id: str):
    """Flaky charger: oscillates between ~80% and ~40% success in cycles."""
    checkins = []
    for d in range(SIM_DAYS):
        day = SIM_START + timedelta(days=d)
        cycle_pos = (d % 20) / 20.0  # 20-day cycle
        fail_rate = 0.2 + 0.4 * abs(cycle_pos - 0.5) * 2  # swings 0.2-0.6
        for t in _random_times_on_day(day, random.randint(1, 3)):
            result = CheckinResult.FAILED if random.random() < fail_rate else CheckinResult.WORKED
            checkins.append(Checkin(result, t))
    return checkins


def gen_recently_broken(charger_id: str):
    """Was reliable for 80 days, then broke hard in the last 10 days."""
    checkins = []
    for d in range(SIM_DAYS):
        day = SIM_START + timedelta(days=d)
        broken = d >= SIM_DAYS - 10
        fail_rate = 0.9 if broken else 0.03
        for t in _random_times_on_day(day, random.randint(1, 3)):
            result = CheckinResult.FAILED if random.random() < fail_rate else CheckinResult.WORKED
            checkins.append(Checkin(result, t))
    return checkins


def gen_slow_decline(charger_id: str):
    """Gradually degrading charger: failure rate ramps from 5% to 55%."""
    checkins = []
    for d in range(SIM_DAYS):
        day = SIM_START + timedelta(days=d)
        fail_rate = 0.05 + 0.5 * (d / SIM_DAYS)
        for t in _random_times_on_day(day, random.randint(1, 3)):
            result = CheckinResult.FAILED if random.random() < fail_rate else CheckinResult.WORKED
            checkins.append(Checkin(result, t))
    return checkins


def gen_low_traffic(charger_id: str):
    """Sparse check-ins (low confidence throughout), decent reliability."""
    checkins = []
    for d in range(SIM_DAYS):
        day = SIM_START + timedelta(days=d)
        if random.random() < 0.25:  # check-in on ~1 in 4 days only
            for t in _random_times_on_day(day, 1):
                result = CheckinResult.FAILED if random.random() < 0.15 else CheckinResult.WORKED
                checkins.append(Checkin(result, t))
    return checkins


CHARGERS = {
    "CHRGR-001": ("Always Reliable", gen_always_works),
    "CHRGR-002": ("Intermittent Failures", gen_intermittent),
    "CHRGR-003": ("Recently Broken", gen_recently_broken),
    "CHRGR-004": ("Slow Decline", gen_slow_decline),
    "CHRGR-005": ("Low Traffic", gen_low_traffic),
}


def run_simulation():
    engine = ReliabilityScoreEngine(decay_constant=0.02)
    all_data = {}

    for charger_id, (label, generator) in CHARGERS.items():
        checkins = generator(charger_id)
        checkins.sort(key=lambda c: c.timestamp)

        # Compute score trajectory: one score per day, using only check-ins
        # that occurred on or before that day.
        trajectory = []
        for d in range(SIM_DAYS):
            as_of = SIM_START + timedelta(days=d + 1)
            visible = [c for c in checkins if c.timestamp <= as_of]
            result = engine.compute(visible, as_of=as_of)
            trajectory.append({
                "day": d,
                "date": as_of.date().isoformat(),
                "score": result["score"],
                "confidence": result["confidence"],
                "total_checkins": result["total_checkins"],
            })

        final = engine.compute(checkins, as_of=SIM_END)

        all_data[charger_id] = {
            "id": charger_id,
            "label": label,
            "final": final,
            "trajectory": trajectory,
            "raw_checkins": [
                {"result": c.result.value, "timestamp": c.timestamp.isoformat()}
                for c in checkins
            ],
        }

    return all_data


def export_json(data: dict):
    # Slim export for the React dashboard (no raw check-ins, keeps payload small)
    slim = {
        cid: {
            "id": d["id"],
            "label": d["label"],
            "final": d["final"],
            "trajectory": d["trajectory"],
        }
        for cid, d in data.items()
    }
    path = OUT_DIR / "simulation_results.json"
    path.write_text(json.dumps(slim, indent=2))
    print(f"Wrote {path}")


def plot_trajectories(data: dict):
    plt.figure(figsize=(11, 6))
    for cid, d in data.items():
        days = [pt["day"] for pt in d["trajectory"]]
        scores = [pt["score"] if pt["score"] is not None else float("nan") for pt in d["trajectory"]]
        plt.plot(days, scores, label=f"{cid} — {d['label']}", linewidth=1.8)

    plt.title("Chrgr Reliability Score — 90-Day Simulation (5 Chargers)")
    plt.xlabel("Day")
    plt.ylabel("Reliability Score")
    plt.ylim(-5, 105)
    plt.legend(loc="lower left", fontsize=8)
    plt.grid(alpha=0.25)
    out_path = OUT_DIR / "score_trajectories.png"
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    data = run_simulation()
    export_json(data)
    plot_trajectories(data)

    print("\nFinal scores:")
    for cid, d in data.items():
        f = d["final"]
        print(f"  {cid:12s} {d['label']:24s} score={f['score']:>4} "
              f"confidence={f['confidence']:6s} checkins={f['total_checkins']}")
