import pytest
from fastapi.testclient import TestClient

from app.main import app, get_dataset
from app.store import Dataset
from tests.conftest import at


@pytest.fixture
def client(actuals, forecasts):
    app.dependency_overrides[get_dataset] = lambda: Dataset(actuals=actuals, forecasts=forecasts)
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_meta(client):
    body = client.get("/api/meta").json()
    assert body["actual_count"] == 8
    assert body["forecast_count"] == 7
    assert body["target_start"] == "2026-01-01T00:00:00Z"


def test_series_horizon(client):
    body = client.get("/api/series", params={"horizon_hours": 2}).json()
    assert body["mode"] == "horizon"
    assert len(body["points"]) == 8
    assert body["coverage"] == {"forecast_slots": 4, "matched": 4}
    first = body["points"][0]
    assert first["forecast"] == 1100.0
    assert first["error"] == 100.0
    assert body["stats"]["count"] == 4


def test_series_respects_window(client):
    params = {"start": at(1).isoformat(), "end": at(2).isoformat(), "horizon_hours": 0}
    body = client.get("/api/series", params=params).json()
    assert [p["start_time"] for p in body["points"]] == ["2026-01-15T01:00:00Z", "2026-01-15T01:30:00Z"]


def test_series_day_ahead_mode(client):
    body = client.get("/api/series", params={"mode": "day_ahead", "cutoff": "09:00"}).json()
    assert body["mode"] == "day_ahead"
    assert body["cutoff"] == "09:00"
    assert body["horizon_hours"] is None


@pytest.mark.parametrize(
    "params",
    [
        {"horizon_hours": -1},
        {"horizon_hours": 100},
        {"mode": "nope"},
        {"cutoff": "9am"},
        {"cutoff": "25:00", "mode": "day_ahead"},
        {"start": "2026-03-01T00:00:00Z"},
        {"start": "2026-01-10T00:00:00Z", "end": "2026-01-09T00:00:00Z"},
    ],
)
def test_series_rejects_invalid_params(client, params):
    assert client.get("/api/series", params=params).status_code == 422


def test_analysis(client):
    body = client.get("/api/analysis", params={"horizon_hours": 2}).json()
    assert len(body["horizon_curve"]) == 49
    assert body["horizon_curve"][0]["count"] == 4
    assert body["horizon_curve"][14]["count"] == 0
    assert body["horizon_curve"][14]["mae"] is None
    assert sum(b["count"] for b in body["histogram"]) == 4
    assert body["generation"]["maximum"] == 1700.0
