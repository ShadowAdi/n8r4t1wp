from datetime import datetime, time, timedelta, timezone

from app.models import Forecast
from app.selection import day_ahead_cutoff, pair_with_actuals, select_by_horizon, select_day_ahead
from tests.conftest import at


def test_select_by_horizon_picks_latest_forecast_published_before_cutoff(forecasts):
    selected = select_by_horizon(forecasts, timedelta(hours=2))
    assert selected[at(0)].publish_time == at(-3)
    assert selected[at(1)].publish_time == at(-3)
    assert selected[at(2)].publish_time == at(-1)
    assert selected[at(3)].publish_time == at(-10)


def test_select_by_horizon_zero_uses_most_recent(forecasts):
    selected = select_by_horizon(forecasts, timedelta(0))
    assert selected[at(0)].generation == 1050.0


def test_select_by_horizon_skips_targets_without_old_enough_forecast(forecasts):
    selected = select_by_horizon(forecasts, timedelta(hours=14))
    assert selected == {}


def test_cutoff_is_inclusive():
    forecasts = [Forecast(at(4), at(0), 1.0)]
    assert at(4) in select_by_horizon(forecasts, timedelta(hours=4))


def test_day_ahead_cutoff_uses_uk_local_time():
    winter = datetime(2026, 1, 15, 12, tzinfo=timezone.utc)
    summer = datetime(2026, 7, 15, 12, tzinfo=timezone.utc)
    assert day_ahead_cutoff(winter, time(9)) == datetime(2026, 1, 14, 9, tzinfo=timezone.utc)
    assert day_ahead_cutoff(summer, time(9)) == datetime(2026, 7, 14, 8, tzinfo=timezone.utc)


def test_day_ahead_cutoff_groups_by_uk_delivery_day():
    late_evening_bst = datetime(2026, 7, 15, 23, 30, tzinfo=timezone.utc)
    assert day_ahead_cutoff(late_evening_bst, time(9)) == datetime(2026, 7, 15, 8, tzinfo=timezone.utc)


def test_select_day_ahead():
    target = datetime(2026, 1, 15, 6, tzinfo=timezone.utc)
    forecasts = [
        Forecast(target, datetime(2026, 1, 14, 7, 30, tzinfo=timezone.utc), 1.0),
        Forecast(target, datetime(2026, 1, 14, 9, 30, tzinfo=timezone.utc), 2.0),
    ]
    assert select_day_ahead(forecasts, time(9))[target].generation == 1.0


def test_pair_with_actuals_marks_missing_forecasts(actuals, forecasts):
    pairs = pair_with_actuals(actuals, select_by_horizon(forecasts, timedelta(hours=2)))
    assert len(pairs) == len(actuals)
    by_time = {p.start_time: p for p in pairs}
    assert by_time[at(0)].error == 1100.0 - 1000.0
    assert by_time[at(0.5)].forecast is None
    assert by_time[at(0.5)].error is None
