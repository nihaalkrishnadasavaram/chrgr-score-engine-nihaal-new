# chrgr-score-engine

Week 2 deliverable: the Chrgr Reliability Score Engine, plus a React
dashboard to visualize it (replaces the earlier Streamlit version).

- **`backend/`** — Python scoring engine, pytest suite, 90-day simulation
  across 5 chargers. See `backend/README.md`.
- **`frontend/`** — React + Vite + Recharts dashboard that visualizes the
  simulation output. See `frontend/README.md`.

## Quick start

```bash
# Backend: run tests + regenerate simulation data
cd backend
pip install -r requirements.txt
pytest tests/ -v
python simulate.py

# Frontend: view the dashboard
cd ../frontend
npm install
npm run dev
```
