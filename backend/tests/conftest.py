from datetime import datetime, timedelta, timezone

import pytest

from app.models import Actual, Forecast

T0 = datetime(2026, 1, 15, tzinfo=timezone.utc)


def at(hours: float) -> datetime:
    return T0 + timedelta(hours=hours)


@pytest.fixture
def actuals() -> list[Actual]:
    return [Actual(at(h / 2), 1000.0 + 100 * h) for h in range(8)]


@pytest.fixture
def forecasts() -> list[Forecast]:
    return [
        Forecast(at(0), at(-10), 900.0),
        Forecast(at(0), at(-3), 1100.0),
        Forecast(at(0), at(-1), 1050.0),
        Forecast(at(1), at(-10), 1500.0),
        Forecast(at(1), at(-3), 1250.0),
        Forecast(at(2), at(-1), 1300.0),
        Forecast(at(3), at(-10), 1400.0),
    ]
