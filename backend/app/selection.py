from bisect import bisect_right
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from typing import Callable, Iterable
from zoneinfo import ZoneInfo

from app.models import Actual, Forecast

UK = ZoneInfo("Europe/London")


@dataclass(frozen=True)
class Pair:
    start_time: datetime
    actual: float
    forecast: float | None
    publish_time: datetime | None

    @property
    def error(self) -> float | None:
        return None if self.forecast is None else self.forecast - self.actual


def _group_by_target(forecasts: Iterable[Forecast]) -> dict[datetime, list[Forecast]]:
    grouped: dict[datetime, list[Forecast]] = defaultdict(list)
    for forecast in forecasts:
        grouped[forecast.start_time].append(forecast)
    for items in grouped.values():
        items.sort(key=lambda f: f.publish_time)
    return grouped


def _latest_before(items: list[Forecast], cutoff: datetime) -> Forecast | None:
    index = bisect_right([f.publish_time for f in items], cutoff)
    return items[index - 1] if index else None


def _select(forecasts: Iterable[Forecast], cutoff_for: Callable[[datetime], datetime]) -> dict[datetime, Forecast]:
    selected: dict[datetime, Forecast] = {}
    for start_time, items in _group_by_target(forecasts).items():
        chosen = _latest_before(items, cutoff_for(start_time))
        if chosen is not None:
            selected[start_time] = chosen
    return selected


def select_by_horizon(forecasts: Iterable[Forecast], horizon: timedelta) -> dict[datetime, Forecast]:
    return _select(forecasts, lambda start_time: start_time - horizon)


def day_ahead_cutoff(start_time: datetime, cutoff: time) -> datetime:
    delivery_day = start_time.astimezone(UK).date()
    return datetime.combine(delivery_day - timedelta(days=1), cutoff, tzinfo=UK)


def select_day_ahead(forecasts: Iterable[Forecast], cutoff: time) -> dict[datetime, Forecast]:
    return _select(forecasts, lambda start_time: day_ahead_cutoff(start_time, cutoff))


def pair_with_actuals(actuals: Iterable[Actual], selected: dict[datetime, Forecast]) -> list[Pair]:
    pairs = []
    for actual in actuals:
        forecast = selected.get(actual.start_time)
        pairs.append(
            Pair(
                start_time=actual.start_time,
                actual=actual.generation,
                forecast=forecast.generation if forecast else None,
                publish_time=forecast.publish_time if forecast else None,
            )
        )
    return pairs
