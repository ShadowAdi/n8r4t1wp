import math
from collections import defaultdict
from dataclasses import dataclass
from statistics import fmean, median
from typing import Iterable, Sequence
from zoneinfo import ZoneInfo

from app.selection import Pair

UK = ZoneInfo("Europe/London")


def percentile(values: Sequence[float], q: float) -> float:
    if not values:
        raise ValueError("percentile of empty sequence")
    ordered = sorted(values)
    position = (len(ordered) - 1) * q / 100
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


@dataclass(frozen=True)
class ErrorStats:
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


def matched(pairs: Iterable[Pair]) -> list[Pair]:
    return [p for p in pairs if p.forecast is not None]


def error_stats(pairs: Iterable[Pair]) -> ErrorStats | None:
    rows = matched(pairs)
    if not rows:
        return None
    errors = [p.error for p in rows]
    abs_errors = [abs(e) for e in errors]
    mean_actual = fmean(p.actual for p in rows)
    mae = fmean(abs_errors)
    return ErrorStats(
        count=len(rows),
        mean_actual=mean_actual,
        mae=mae,
        rmse=math.sqrt(fmean(e * e for e in errors)),
        bias=fmean(errors),
        median_abs_error=median(abs_errors),
        p90_abs_error=percentile(abs_errors, 90),
        p95_abs_error=percentile(abs_errors, 95),
        p99_abs_error=percentile(abs_errors, 99),
        max_abs_error=max(abs_errors),
        normalised_mae=mae / mean_actual if mean_actual else 0.0,
    )


@dataclass(frozen=True)
class HistogramBin:
    lower: float
    upper: float
    count: int


def error_histogram(pairs: Iterable[Pair], bin_width: float = 500.0) -> list[HistogramBin]:
    errors = [p.error for p in matched(pairs)]
    if not errors:
        return []
    counts: dict[int, int] = defaultdict(int)
    for error in errors:
        counts[math.floor(error / bin_width)] += 1
    first, last = min(counts), max(counts)
    return [
        HistogramBin(lower=i * bin_width, upper=(i + 1) * bin_width, count=counts.get(i, 0))
        for i in range(first, last + 1)
    ]


@dataclass(frozen=True)
class HourStats:
    hour: int
    mae: float
    bias: float
    count: int


def error_by_hour_of_day(pairs: Iterable[Pair]) -> list[HourStats]:
    grouped: dict[int, list[float]] = defaultdict(list)
    for p in matched(pairs):
        grouped[p.start_time.astimezone(UK).hour].append(p.error)
    return [
        HourStats(hour=h, mae=fmean(abs(e) for e in errs), bias=fmean(errs), count=len(errs))
        for h, errs in sorted(grouped.items())
    ]


@dataclass(frozen=True)
class GenerationPercentiles:
    p10: float
    p50: float
    p90: float
    minimum: float
    maximum: float


def generation_percentiles(values: Sequence[float]) -> GenerationPercentiles | None:
    if not values:
        return None
    return GenerationPercentiles(
        p10=percentile(values, 10),
        p50=percentile(values, 50),
        p90=percentile(values, 90),
        minimum=min(values),
        maximum=max(values),
    )
