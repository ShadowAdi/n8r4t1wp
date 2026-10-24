# Wind Forecast Monitor

A web app for a UK energy utility's day-ahead trading desk. It shows the national wind generation forecast that was available when purchase decisions were made, compares it with what was actually generated, and quantifies the forecast error so the desk can size how much extra power to buy.

Scope: GB national wind only, Elexon BMRS data only, purchase decisions made in **January 2026** (delivery 1 Jan – 1 Feb 2026).

**Live app:** https://n8r4t1wp-1bsm.vercel.app
**API:** https://n8r4t1wp-backend.vercel.app/api/health · interactive docs at https://n8r4t1wp-backend.vercel.app/docs
**Video walkthrough:** https://youtu.be/9jYLRNMmCts

---

## What it does

| Need from the brief | How the app answers it |
|---|---|
| See the latest forecast available when deciding | **Day-ahead (D-1)** mode picks, for every delivery hour, the latest forecast published before a chosen bidding time on the day before (default 09:00 UK). **Hours ahead** mode picks the latest forecast published at least *N* hours before delivery (0–48h). |
| Evaluate forecast accuracy quantitatively | Average miss (MAE), systematic over/under-forecast (bias), the range that contains 9 in 10 errors (P90), the rare worst case (P99) and error as a % of typical output. |
| Make decisions considering the error | "How much extra to buy" turns the error distribution into buffer sizes that cover the shortfall in 1 in 2, 9 in 10 and 19 in 20 periods. |

Supporting views: error vs forecast horizon (0–48h), and, behind **More detail**, the error distribution and error by hour of day.

### Key findings for January 2026

- Using the forecast available at 09:00 the day before, wind was **over-forecast by about 1.8 GW on average**. Most of the error is a systematic bias, not random noise, so relying on the raw forecast leaves the book short.
- Buying **about 4.3 GW extra** would have covered the wind shortfall in 9 out of 10 delivery hours.
- Error grows with lead time: the average miss rises from about 1.8 GW at 1h ahead to about 2.3 GW at 48h ahead.
- Day-ahead forecasts are least reliable in the early morning hours (about 2.4 GW average miss between 03:00 and 06:00) and best in the afternoon and evening (about 2.0 GW or less).

---

## How to run it

### Option 1: Docker (recommended)

Requires Docker Desktop.

```bash
docker compose up --build
```

Open http://localhost:8080. The backend is also exposed on http://localhost:8000.

### Option 2: Run backend and frontend separately

Requires Python 3.12+ and Node 20+.

Backend (terminal 1):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

Frontend (terminal 2):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the backend on port 8000.

The first backend request downloads January's data from Elexon (about 3 seconds) and caches it in `backend/.cache/`. Later starts load from the cache.

### Tests and checks

```bash
cd backend && source .venv/bin/activate && pytest
cd frontend && npm run lint && npm run build
```

---

## Architecture

```
Browser (React + Recharts)
   │  GET /api/series, /api/analysis
   ▼
FastAPI backend ──► in-memory dataset (cached to disk) ──► Elexon BMRS
                      FUELHH (wind actuals) + WINDFOR (wind forecasts)
```

**Data pipeline (backend)**

1. **Fetch** (`elexon.py`): FUELHH stream filtered to `fuelType=WIND`, and WINDFOR stream for forecasts published from 72h before the window to the end of it. One request each; no API key needed.
2. **Clean**: keep only wind rows, drop nulls, clip actuals to the window and keep the latest publish per half-hour. Drop forecast rows whose `startTime` is before their `publishTime` (about 20% of WINDFOR rows are backcasts, not forecasts).
3. **Select** (`selection.py`): for each target hour, binary-search the forecasts for that hour by publish time and take the latest one at or before the cutoff. The cutoff is either `startTime − horizon` or a fixed UK-local time on the previous day (handles GMT/BST via `Europe/London`).
4. **Pair**: join the selected forecasts with actuals on `startTime`. Forecasts are hourly and actuals half-hourly, so errors are computed only on the hourly timestamps where both exist; no interpolation.
5. **Measure** (`metrics.py`): error = forecast − actual (positive means wind was over-forecast). MAE, RMSE, bias, median/P90/P95/P99/max absolute error, normalised MAE, histogram and hour-of-day breakdown.

**API**

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Liveness check |
| `GET /api/series` | Half-hourly actuals with the selected forecast, its publish time and error, plus summary stats and coverage |
| `GET /api/analysis` | Error-vs-horizon curve (0–48h), error histogram, error by hour of day |

Both data endpoints take `start`, `end` (UTC, end exclusive), `mode=horizon|day_ahead`, `horizon_hours` (0–72) and `cutoff` (`HH:MM`). Invalid input returns 422.

**Frontend**

- Filters live in the URL (`?from=2026-01-15&to=2026-01-15&mode=day_ahead&cutoff=09:00`), so any view can be shared or bookmarked.
- Requests are debounced and cancelled when filters change; the previous chart stays visible, dimmed, while new data loads.
- Light and dark themes follow the OS setting; the chart palette was checked for colour-blind safety; every chart has a table or tooltip equivalent; layout works down to 390px wide.

**Design decisions**

- January 2026 is historical and immutable, so the backend loads it once and serves everything from memory. No database is needed.
- Selection and metrics are pure functions over plain dataclasses, which keeps them easy to unit test without the network.
- Buffer sizes are computed in the browser from the error series already returned by `/api/series`, which avoids a second round trip.

---

## Files and directories

```
.
├── backend/
│   ├── app/
│   │   ├── config.py        Data window, API base URL, defaults, env settings
│   │   ├── elexon.py        Elexon BMRS client and parsing/cleaning of FUELHH and WINDFOR
│   │   ├── models.py        Actual and Forecast dataclasses
│   │   ├── selection.py     Forecast selection by horizon or day-ahead cutoff; pairing with actuals
│   │   ├── metrics.py       Error statistics, histogram, hour-of-day breakdown
│   │   ├── store.py         Loads the dataset once, caches it in memory and on disk
│   │   ├── schemas.py       Pydantic response models
│   │   └── main.py          FastAPI app and endpoints
│   ├── tests/               pytest suite (parsing, selection, metrics, store, API)
│   ├── index.py             Vercel entry point
│   ├── Dockerfile           Backend image (prefetches January data at build time)
│   ├── requirements.txt     Runtime dependencies
│   └── requirements-dev.txt Runtime + test dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx          Page layout and data loading
│   │   ├── api.ts           Typed API client
│   │   ├── format.ts        Number, date and axis formatting (UK time)
│   │   ├── stats.ts         Percentiles and buffer sizes
│   │   ├── hooks/           useApi (fetch + cancel), useDebounced, useUrlFilters
│   │   ├── components/      Filter bar, date range picker, headline, KPI tiles, charts
│   │   ├── index.css        Design tokens (light/dark) and app shell
│   │   └── components.css   Component styles and responsive breakpoints
│   ├── Dockerfile           Builds the app and serves it with nginx
│   ├── nginx.conf           Static hosting, SPA fallback, /api proxy
│   └── vercel.json          Vercel build settings
├── docker-compose.yml       Runs backend (8000) and frontend (8080) together
└── README.md
```

---

## Deployment

Both parts are deployed on Vercel as two projects from this repo.

| Project | Root directory | Environment variable |
|---|---|---|
| Backend | `backend` | `CORS_ORIGINS` = frontend URL |
| Frontend | `frontend` | `VITE_API_BASE_URL` = backend URL |

The backend runs as a Vercel Python function (FastAPI detected from `index.py`) and caches data in `/tmp`.

---

## Possible next steps

- Extend beyond January 2026: the window is set in `backend/app/config.py`, so supporting any month or a rolling live window is a small change.
- Add solar and other renewables once the client wants more than wind.
- Bias-corrected forecast: subtract the observed systematic bias to give the desk an adjusted forecast directly.

---

## Use of AI tools

This project was built with the help of **Claude Code** (Anthropic's AI coding assistant). I used it to explore the Elexon API, write and refactor the backend and frontend code, write tests, set up Docker and Vercel configuration, and draft this README. I directed the scope, reviewed the output, made the product and design decisions, and verified the app locally and in deployment.
