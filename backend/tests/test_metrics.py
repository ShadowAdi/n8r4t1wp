import math
from datetime import datetime, timezone

import pytest

from app.metrics import error_by_hour_of_day, error_histogram, error_stats, generation_percentiles, percentile
from app.selection import Pair

T = datetime(2026, 1, 15, tzinfo=timezone.utc)


def pair(actual, forecast, hour=0):
    return Pair(T.replace(hour=hour), actual, forecast, T if forecast is not None else None)


def test_percentile_interpolates_linearly():
    assert percentile([1, 2, 3, 4], 50) == 2.5
    assert percentile([10], 99) == 10
    assert percentile([0, 10], 90) == 9
    with pytest.raises(ValueError):
        percentile([], 50)


def test_error_stats():
    stats = error_stats([pair(100, 110), pair(100, 80), pair(200, 230), pair(50, None)])
    assert stats.count == 3
    assert stats.mae == pytest.approx(20)
    assert stats.bias == pytest.approx(20 / 3)
    assert stats.rmse == pytest.approx(math.sqrt((100 + 400 + 900) / 3))
    assert stats.median_abs_error == 20
    assert stats.max_abs_error == 30
    assert stats.mean_actual == pytest.approx(400 / 3)
    assert stats.normalised_mae == pytest.approx(20 / (400 / 3))


def test_error_stats_none_when_no_matches():
    assert error_stats([pair(100, None)]) is None


def test_error_histogram_fills_empty_bins():
    bins = error_histogram([pair(0, -600), pair(0, 100), pair(0, 1200)], bin_width=500)
    assert [(b.lower, b.count) for b in bins] == [(-1000, 1), (-500, 0), (0, 1), (500, 0), (1000, 1)]


def test_error_by_hour_of_day():
    rows = error_by_hour_of_day([pair(100, 110, 1), pair(100, 70, 1), pair(100, 100, 5)])
    assert [(r.hour, r.mae, r.bias, r.count) for r in rows] == [(1, 20, -10, 2), (5, 0, 0, 1)]


def test_generation_percentiles():
    result = generation_percentiles(list(range(0, 101)))
    assert (result.p10, result.p50, result.p90, result.minimum, result.maximum) == (10, 50, 90, 0, 100)
    assert generation_percentiles([]) is None
