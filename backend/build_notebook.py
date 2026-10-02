"""
Builds reliability_score_simulation.ipynb by hand-assembling valid nbformat-v4
JSON. No `jupyter` package is required to create it, but every code cell's
output below was produced by actually running that exact code, so the
notebook opens pre-executed with real plots and real printed results, and is
also genuinely re-runnable top-to-bottom.
"""
import sys, io, base64, json
sys.path.insert(0, '.')
from reliability_engine import Checkin, CheckinResult, ReliabilityScoreEngine
from datetime import datetime, timedelta, timezone
import random
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# ---------------------------------------------------------------------
# Cell source blocks (these are executed below AND embedded verbatim as
# the notebook's code cells, so output matches source exactly).
# ---------------------------------------------------------------------

CELL_IMPORTS = '''\
import sys, random
from datetime import datetime, timedelta, timezone
import matplotlib.pyplot as plt

sys.path.insert(0, '.')
from reliability_engine import Checkin, CheckinResult, ReliabilityScoreEngine

random.seed(42)  # reproducible simulation

SIM_DAYS = 90
SIM_END = datetime(2026, 9, 24, 0, 0, 0, tzinfo=timezone.utc)
SIM_START = SIM_END - timedelta(days=SIM_DAYS)
'''

CELL_GENERATORS = '''\
def _random_times_on_day(day_start, n):
    """n random check-in timestamps between 06:00-23:00 on the given day."""
    return sorted(day_start + timedelta(hours=random.uniform(6, 23)) for _ in range(n))

def gen_always_works(_):
    """Reliable charger: ~99% success throughout the 90 days."""
    checkins = []
    for d in range(SIM_DAYS):
        day = SIM_START + timedelta(days=d)
        for t in _random_times_on_day(day, random.randint(1, 3)):
            result = CheckinResult.FAILED if random.random() < 0.01 else CheckinResult.WORKED
            checkins.append(Checkin(result, t))
    return checkins

def gen_intermittent(_):
    """Flaky charger: oscillates between ~80% and ~40% success in 20-day cycles."""
    checkins = []
    for d in range(SIM_DAYS):
        day = SIM_START + timedelta(days=d)
        cycle_pos = (d % 20) / 20.0
        fail_rate = 0.2 + 0.4 * abs(cycle_pos - 0.5) * 2
        for t in _random_times_on_day(day, random.randint(1, 3)):
            result = CheckinResult.FAILED if random.random() < fail_rate else CheckinResult.WORKED
            checkins.append(Checkin(result, t))
    return checkins

def gen_recently_broken(_):
    """Reliable for 80 days, then fails hard in the final 10 days."""
    checkins = []
    for d in range(SIM_DAYS):
        day = SIM_START + timedelta(days=d)
        broken = d >= SIM_DAYS - 10
        fail_rate = 0.9 if broken else 0.03
        for t in _random_times_on_day(day, random.randint(1, 3)):
            result = CheckinResult.FAILED if random.random() < fail_rate else CheckinResult.WORKED
            checkins.append(Checkin(result, t))
    return checkins

def gen_slow_decline(_):
    """Gradually degrading charger: failure rate ramps from 5% to 55%."""
    checkins = []
    for d in range(SIM_DAYS):
        day = SIM_START + timedelta(days=d)
        fail_rate = 0.05 + 0.5 * (d / SIM_DAYS)
        for t in _random_times_on_day(day, random.randint(1, 3)):
            result = CheckinResult.FAILED if random.random() < fail_rate else CheckinResult.WORKED
            checkins.append(Checkin(result, t))
    return checkins

def gen_low_traffic(_):
    """Sparse check-ins (~1 every 4 days), decent reliability when checked."""
    checkins = []
    for d in range(SIM_DAYS):
        day = SIM_START + timedelta(days=d)
        if random.random() < 0.25:
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
print(f"Defined {len(CHARGERS)} charger patterns.")
'''

CELL_SIMULATE = '''\
engine = ReliabilityScoreEngine(decay_constant=0.02)
simulation = {}

for charger_id, (label, generator) in CHARGERS.items():
    checkins = sorted(generator(charger_id), key=lambda c: c.timestamp)

    trajectory = []
    for d in range(SIM_DAYS):
        as_of = SIM_START + timedelta(days=d + 1)
        visible = [c for c in checkins if c.timestamp <= as_of]
        result = engine.compute(visible, as_of=as_of)
        trajectory.append({"day": d, "score": result["score"]})

    final = engine.compute(checkins, as_of=SIM_END)
    simulation[charger_id] = {"label": label, "checkins": checkins, "trajectory": trajectory, "final": final}

print("Simulation complete for:", list(simulation.keys()))
'''

CELL_PLOT = '''\
plt.figure(figsize=(11, 6))
for charger_id, data in simulation.items():
    days = [pt["day"] for pt in data["trajectory"]]
    scores = [pt["score"] if pt["score"] is not None else float("nan") for pt in data["trajectory"]]
    plt.plot(days, scores, label=f"{charger_id} — {data['label']}", linewidth=1.8)

plt.title("Chrgr Reliability Score — 90-Day Simulation (5 Chargers)")
plt.xlabel("Day")
plt.ylabel("Reliability Score")
plt.ylim(-5, 105)
plt.legend(loc="lower left", fontsize=8)
plt.grid(alpha=0.25)
plt.show()
'''

CELL_SUMMARY = '''\
print(f"{\'Charger\':12s} {\'Pattern\':24s} {\'Score\':>6s} {\'Confidence\':>12s} {\'Check-ins\':>10s}")
print("-" * 68)
for charger_id, data in simulation.items():
    f = data["final"]
    print(f"{charger_id:12s} {data[\'label\']:24s} {f[\'score\']:>6} {f[\'confidence\']:>12s} {f[\'total_checkins\']:>10}")
'''

# ---------------------------------------------------------------------
# Actually execute the cells to capture real output
# ---------------------------------------------------------------------

namespace = {}
exec(CELL_IMPORTS, namespace)
exec(CELL_GENERATORS, namespace)
import contextlib

def run_capture(src, ns):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(src, ns)
    return buf.getvalue()

out_generators = run_capture(CELL_GENERATORS, namespace)
out_simulate = run_capture(CELL_SIMULATE, namespace)

# Plot cell: capture the figure as base64 PNG instead of showing it
exec(CELL_PLOT.replace("plt.show()", ""), namespace)
buf = io.BytesIO()
plt.savefig(buf, format='png', dpi=110, bbox_inches='tight')
plt.close()
buf.seek(0)
plot_b64 = base64.b64encode(buf.read()).decode('ascii')

out_summary = run_capture(CELL_SUMMARY, namespace)

print("--- captured generators output ---")
print(out_generators)
print("--- captured simulate output ---")
print(out_simulate)
print("--- captured summary output ---")
print(out_summary)
print("--- plot b64 length ---", len(plot_b64))

# ---------------------------------------------------------------------
# Assemble the notebook JSON (nbformat v4)
# ---------------------------------------------------------------------

def md_cell(src):
    return {"cell_type": "markdown", "metadata": {}, "source": src.splitlines(keepends=True)}

def code_cell(src, exec_count, outputs):
    return {
        "cell_type": "code",
        "execution_count": exec_count,
        "metadata": {},
        "outputs": outputs,
        "source": src.splitlines(keepends=True),
    }

def stream_output(text):
    return [{"output_type": "stream", "name": "stdout", "text": text.splitlines(keepends=True)}]

def image_output(b64):
    return [{
        "output_type": "display_data",
        "data": {"image/png": b64, "text/plain": ["<Figure size 1100x600 with 1 Axes>"]},
        "metadata": {"image/png": {"width": 880, "height": 480}},
    }]

cells = [
    md_cell(
        "# Chrgr Reliability Score Engine — 90-Day Simulation\n"
        "\n"
        "Generates 90 days of synthetic check-in data for 5 chargers, each with a distinct "
        "reliability pattern, computes the daily reliability-score trajectory for each using "
        "`ReliabilityScoreEngine`, and plots how scores evolve over time.\n"
        "\n"
        "**Chargers simulated:**\n"
        "- `CHRGR-001` — Always Reliable (~99% success throughout)\n"
        "- `CHRGR-002` — Intermittent Failures (oscillates ~80%→40% success in 20-day cycles)\n"
        "- `CHRGR-003` — Recently Broken (reliable for 80 days, then fails hard in the last 10)\n"
        "- `CHRGR-004` — Slow Decline (failure rate ramps steadily from 5% to 55%)\n"
        "- `CHRGR-005` — Low Traffic (sparse check-ins, tests low-confidence scoring)\n"
    ),
    md_cell("## 1. Setup"),
    code_cell(CELL_IMPORTS, 1, []),
    md_cell("## 2. Define the 5 charger patterns"),
    code_cell(CELL_GENERATORS, 2, stream_output(out_generators)),
    md_cell(
        "## 3. Run the simulation\n"
        "\n"
        "For each charger, compute a daily reliability score using only the check-ins visible "
        "up to that day (so the trajectory shows how the score would have looked to a driver "
        "in real time, not with hindsight)."
    ),
    code_cell(CELL_SIMULATE, 3, stream_output(out_simulate)),
    md_cell("## 4. Plot: reliability score over time, all 5 chargers"),
    code_cell(CELL_PLOT, 4, image_output(plot_b64)),
    md_cell(
        "## 5. Final scores summary\n"
        "\n"
        "The score each charger would show *today* (end of the 90-day window), using every "
        "check-in collected."
    ),
    code_cell(CELL_SUMMARY, 5, stream_output(out_summary)),
    md_cell(
        "## Notes\n"
        "\n"
        "- Decay constant `λ = 0.02` (same default as `reliability_engine.py`) — "
        "≈35h half-life, so a check-in from ~1.5 days ago has already lost half its weight.\n"
        "- `CHRGR-003` (Recently Broken) is the clearest illustration of why time decay matters: "
        "80 days of perfect service couldn't be seen in a plain average, but barely registers "
        "here — the score craters within days of the failures starting.\n"
        "- `CHRGR-005` (Low Traffic) stays volatile throughout since each individual check-in "
        "carries much more weight when there are few of them — exactly what the confidence "
        "rating is meant to flag."
    ),
]

notebook = {
    "cells": cells,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.12"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}

with open("reliability_score_simulation.ipynb", "w") as f:
    json.dump(notebook, f, indent=1)

print("\nWrote reliability_score_simulation.ipynb")
