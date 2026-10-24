import json
import threading
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from app.config import (
    CACHE_DIR,
    FORECAST_PUBLISH_END,
    FORECAST_PUBLISH_START,
    TARGET_END,
    TARGET_START,
)
from app.elexon import ElexonClient, parse_time, to_iso
from app.models import Actual, Forecast


@dataclass(frozen=True)
class Dataset:
    actuals: list[Actual]
    forecasts: list[Forecast]

    def actuals_between(self, start: datetime, end: datetime) -> list[Actual]:
        return [a for a in self.actuals if start <= a.start_time < end]


def _dump(dataset: Dataset) -> dict:
    return {
        "actuals": [[to_iso(a.start_time), a.generation] for a in dataset.actuals],
        "forecasts": [[to_iso(f.start_time), to_iso(f.publish_time), f.generation] for f in dataset.forecasts],
    }


def _load(payload: dict) -> Dataset:
    return Dataset(
        actuals=[Actual(parse_time(t), g) for t, g in payload["actuals"]],
        forecasts=[Forecast(parse_time(t), parse_time(p), g) for t, p, g in payload["forecasts"]],
    )


class DataStore:
    def __init__(self, client_factory=ElexonClient, cache_dir: str | None = CACHE_DIR):
        self._client_factory = client_factory
        self._cache_path = Path(cache_dir) / "elexon_wind_jan2026.json" if cache_dir else None
        self._dataset: Dataset | None = None
        self._lock = threading.Lock()

    def get(self) -> Dataset:
        if self._dataset is None:
            with self._lock:
                if self._dataset is None:
                    self._dataset = self._read_cache() or self._fetch()
        return self._dataset

    def _read_cache(self) -> Dataset | None:
        if not self._cache_path or not self._cache_path.exists():
            return None
        try:
            return _load(json.loads(self._cache_path.read_text()))
        except (ValueError, KeyError, TypeError):
            return None

    def _fetch(self) -> Dataset:
        client = self._client_factory()
        try:
            dataset = Dataset(
                actuals=client.fetch_actuals(TARGET_START, TARGET_END),
                forecasts=client.fetch_forecasts(FORECAST_PUBLISH_START, FORECAST_PUBLISH_END),
            )
        finally:
            client.close()
        self._write_cache(dataset)
        return dataset

    def _write_cache(self, dataset: Dataset) -> None:
        if not self._cache_path:
            return
        try:
            self._cache_path.parent.mkdir(parents=True, exist_ok=True)
            self._cache_path.write_text(json.dumps(_dump(dataset)))
        except OSError:
            pass
