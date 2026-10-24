from datetime import datetime, timedelta
from typing import Any, Iterable

import httpx

from app.config import ELEXON_BASE_URL, REQUEST_TIMEOUT_SECONDS
from app.models import Actual, Forecast


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def to_iso(value: datetime) -> str:
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_actuals(rows: Iterable[dict[str, Any]], start: datetime, end: datetime) -> list[Actual]:
    latest: dict[datetime, tuple[datetime, float]] = {}
    for row in rows:
        if row.get("fuelType") != "WIND" or row.get("generation") is None:
            continue
        start_time = parse_time(row["startTime"])
        if not start <= start_time < end:
            continue
        publish_time = parse_time(row["publishTime"])
        current = latest.get(start_time)
        if current is None or publish_time > current[0]:
            latest[start_time] = (publish_time, float(row["generation"]))
    return [Actual(start_time=t, generation=g) for t, (_, g) in sorted(latest.items())]


def parse_forecasts(rows: Iterable[dict[str, Any]]) -> list[Forecast]:
    forecasts: dict[tuple[datetime, datetime], Forecast] = {}
    for row in rows:
        if row.get("generation") is None:
            continue
        forecast = Forecast(
            start_time=parse_time(row["startTime"]),
            publish_time=parse_time(row["publishTime"]),
            generation=float(row["generation"]),
        )
        if forecast.horizon < timedelta(0):
            continue
        forecasts[(forecast.start_time, forecast.publish_time)] = forecast
    return sorted(forecasts.values(), key=lambda f: (f.start_time, f.publish_time))


class ElexonClient:
    def __init__(self, http: httpx.Client | None = None):
        self._http = http or httpx.Client(base_url=ELEXON_BASE_URL, timeout=REQUEST_TIMEOUT_SECONDS)

    def _get(self, path: str, params: dict[str, str]) -> list[dict[str, Any]]:
        response = self._http.get(path, params=params)
        response.raise_for_status()
        payload = response.json()
        return payload["data"] if isinstance(payload, dict) else payload

    def fetch_actuals(self, start: datetime, end: datetime) -> list[Actual]:
        rows = self._get(
            "/datasets/FUELHH/stream",
            {
                "settlementDateFrom": (start - timedelta(days=1)).date().isoformat(),
                "settlementDateTo": end.date().isoformat(),
                "fuelType": "WIND",
            },
        )
        return parse_actuals(rows, start, end)

    def fetch_forecasts(self, publish_start: datetime, publish_end: datetime) -> list[Forecast]:
        rows = self._get(
            "/datasets/WINDFOR/stream",
            {
                "publishDateTimeFrom": to_iso(publish_start),
                "publishDateTimeTo": to_iso(publish_end),
            },
        )
        return parse_forecasts(rows)

    def close(self) -> None:
        self._http.close()
