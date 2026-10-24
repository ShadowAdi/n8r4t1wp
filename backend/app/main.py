from dataclasses import asdict
from datetime import datetime, time, timedelta, timezone
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app import metrics
from app.config import (
    CORS_ORIGINS,
    DEFAULT_DAY_AHEAD_CUTOFF,
    DEFAULT_HORIZON_HOURS,
    HORIZON_CURVE_HOURS,
    MAX_HORIZON,
    TARGET_END,
    TARGET_START,
)
from app.schemas import (
    AnalysisResponse,
    Coverage,
    HistogramBin,
    HorizonPoint,
    HourStats,
    SelectionMode,
    SeriesPoint,
    SeriesResponse,
    Stats,
)
from app.selection import Pair, pair_with_actuals, select_by_horizon, select_day_ahead
from app.store import Dataset, DataStore

app = FastAPI(title="Wind Forecast Monitor API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET"], allow_headers=["*"])

_store = DataStore()


def get_dataset() -> Dataset:
    return _store.get()


DatasetDep = Annotated[Dataset, Depends(get_dataset)]
MAX_HORIZON_HOURS = MAX_HORIZON.total_seconds() / 3600


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _window(start: datetime | None, end: datetime | None) -> tuple[datetime, datetime]:
    start = max(_as_utc(start), TARGET_START) if start else TARGET_START
    end = min(_as_utc(end), TARGET_END) if end else TARGET_END
    if start >= end:
        raise HTTPException(status_code=422, detail="start must be before end and inside the January 2026 window")
    return start, end


def _parse_cutoff(value: str) -> time:
    try:
        return time.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=422, detail="cutoff must be HH:MM")


def _pairs(dataset: Dataset, start: datetime, end: datetime, mode: SelectionMode, horizon_hours: float, cutoff: str) -> list[Pair]:
    if mode is SelectionMode.day_ahead:
        selected = select_day_ahead(dataset.forecasts, _parse_cutoff(cutoff))
    else:
        selected = select_by_horizon(dataset.forecasts, timedelta(hours=horizon_hours))
    return pair_with_actuals(dataset.actuals_between(start, end), selected)


def _forecast_slots(dataset: Dataset, start: datetime, end: datetime) -> int:
    return len({f.start_time for f in dataset.forecasts if start <= f.start_time < end})


def _stats(pairs: list[Pair]) -> Stats | None:
    result = metrics.error_stats(pairs)
    return Stats(**asdict(result)) if result else None


def horizon_curve(dataset: Dataset, start: datetime, end: datetime) -> list[HorizonPoint]:
    actuals = dataset.actuals_between(start, end)
    curve = []
    for hours in HORIZON_CURVE_HOURS:
        result = metrics.error_stats(pair_with_actuals(actuals, select_by_horizon(dataset.forecasts, timedelta(hours=hours))))
        curve.append(
            HorizonPoint(
                horizon_hours=hours,
                count=result.count if result else 0,
                mae=result.mae if result else None,
                rmse=result.rmse if result else None,
                bias=result.bias if result else None,
                p90_abs_error=result.p90_abs_error if result else None,
            )
        )
    return curve


Start = Annotated[datetime | None, Query(description="Inclusive UTC start of target window")]
End = Annotated[datetime | None, Query(description="Exclusive UTC end of target window")]
Mode = Annotated[SelectionMode, Query()]
Horizon = Annotated[float, Query(ge=0, le=MAX_HORIZON_HOURS)]
Cutoff = Annotated[str, Query(pattern=r"^\d{2}:\d{2}$")]


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/series", response_model=SeriesResponse)
def series(
    dataset: DatasetDep,
    start: Start = None,
    end: End = None,
    mode: Mode = SelectionMode.horizon,
    horizon_hours: Horizon = DEFAULT_HORIZON_HOURS,
    cutoff: Cutoff = DEFAULT_DAY_AHEAD_CUTOFF,
) -> SeriesResponse:
    start, end = _window(start, end)
    pairs = _pairs(dataset, start, end, mode, horizon_hours, cutoff)
    matched = metrics.matched(pairs)
    return SeriesResponse(
        mode=mode,
        horizon_hours=horizon_hours if mode is SelectionMode.horizon else None,
        cutoff=cutoff if mode is SelectionMode.day_ahead else None,
        points=[
            SeriesPoint(
                start_time=p.start_time,
                actual=p.actual,
                forecast=p.forecast,
                publish_time=p.publish_time,
                error=p.error,
            )
            for p in pairs
        ],
        stats=_stats(pairs),
        coverage=Coverage(forecast_slots=_forecast_slots(dataset, start, end), matched=len(matched)),
    )


@app.get("/api/analysis", response_model=AnalysisResponse)
def analysis(
    dataset: DatasetDep,
    start: Start = None,
    end: End = None,
    mode: Mode = SelectionMode.horizon,
    horizon_hours: Horizon = DEFAULT_HORIZON_HOURS,
    cutoff: Cutoff = DEFAULT_DAY_AHEAD_CUTOFF,
) -> AnalysisResponse:
    start, end = _window(start, end)
    pairs = _pairs(dataset, start, end, mode, horizon_hours, cutoff)
    return AnalysisResponse(
        mode=mode,
        horizon_hours=horizon_hours if mode is SelectionMode.horizon else None,
        cutoff=cutoff if mode is SelectionMode.day_ahead else None,
        horizon_curve=horizon_curve(dataset, start, end),
        histogram=[HistogramBin(**asdict(b)) for b in metrics.error_histogram(pairs)],
        by_hour=[HourStats(**asdict(h)) for h in metrics.error_by_hour_of_day(pairs)],
    )
