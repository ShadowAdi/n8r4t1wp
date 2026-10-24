from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class SelectionMode(str, Enum):
    horizon = "horizon"
    day_ahead = "day_ahead"


class SeriesPoint(BaseModel):
    start_time: datetime
    actual: float
    forecast: float | None
    publish_time: datetime | None
    error: float | None


class Stats(BaseModel):
    count: int
    mean_actual: float
    mae: float
    rmse: float
    bias: float
    median_abs_error: float
    p90_abs_error: float
    p95_abs_error: float
    p99_abs_error: float
    max_abs_error: float
    normalised_mae: float


class Coverage(BaseModel):
    forecast_slots: int
    matched: int


class SeriesResponse(BaseModel):
    mode: SelectionMode
    horizon_hours: float | None
    cutoff: str | None
    points: list[SeriesPoint]
    stats: Stats | None
    coverage: Coverage


class HorizonPoint(BaseModel):
    horizon_hours: float
    count: int
    mae: float | None
    rmse: float | None
    bias: float | None
    p90_abs_error: float | None


class HistogramBin(BaseModel):
    lower: float
    upper: float
    count: int


class HourStats(BaseModel):
    hour: int
    mae: float
    bias: float
    count: int


class AnalysisResponse(BaseModel):
    mode: SelectionMode
    horizon_hours: float | None
    cutoff: str | None
    horizon_curve: list[HorizonPoint]
    histogram: list[HistogramBin]
    by_hour: list[HourStats]
