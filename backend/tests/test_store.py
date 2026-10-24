from app.store import DataStore
from tests.conftest import at


class FakeClient:
    calls = 0

    def __init__(self, actuals, forecasts):
        self._actuals = actuals
        self._forecasts = forecasts

    def fetch_actuals(self, start, end):
        FakeClient.calls += 1
        return self._actuals

    def fetch_forecasts(self, start, end):
        return self._forecasts

    def close(self):
        pass


def test_store_fetches_once_and_round_trips_disk_cache(tmp_path, actuals, forecasts):
    FakeClient.calls = 0
    factory = lambda: FakeClient(actuals, forecasts)

    first = DataStore(factory, str(tmp_path))
    assert first.get() is first.get()
    assert FakeClient.calls == 1

    second = DataStore(factory, str(tmp_path)).get()
    assert FakeClient.calls == 1
    assert second.actuals == actuals
    assert second.forecasts == forecasts
    assert [a.start_time for a in second.actuals_between(at(1), at(2))] == [at(1), at(1.5)]


def test_store_refetches_when_cache_is_corrupt(tmp_path, actuals, forecasts):
    FakeClient.calls = 0
    (tmp_path / "elexon_wind_jan2026.json").write_text("not json")
    DataStore(lambda: FakeClient(actuals, forecasts), str(tmp_path)).get()
    assert FakeClient.calls == 1
