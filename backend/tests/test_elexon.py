import json
from datetime import datetime, timezone

import httpx

from app.elexon import ElexonClient, parse_actuals, parse_forecasts, parse_time

START = datetime(2026, 1, 1, tzinfo=timezone.utc)
END = datetime(2026, 1, 2, tzinfo=timezone.utc)


def fuel_row(start, generation, publish="2026-01-01T12:00:00Z", fuel="WIND"):
    return {"startTime": start, "publishTime": publish, "fuelType": fuel, "generation": generation}


def test_parse_actuals_filters_fuel_window_and_nulls():
    rows = [
        fuel_row("2026-01-01T00:00:00Z", 100),
        fuel_row("2026-01-01T00:00:00Z", 999, fuel="CCGT"),
        fuel_row("2026-01-01T00:30:00Z", None),
        fuel_row("2025-12-31T23:30:00Z", 50),
        fuel_row("2026-01-02T00:00:00Z", 50),
    ]
    result = parse_actuals(rows, START, END)
    assert [(a.start_time, a.generation) for a in result] == [(START, 100.0)]


def test_parse_actuals_keeps_latest_publish_for_duplicates():
    rows = [
        fuel_row("2026-01-01T01:00:00Z", 100, publish="2026-01-01T02:00:00Z"),
        fuel_row("2026-01-01T01:00:00Z", 120, publish="2026-01-01T03:00:00Z"),
        fuel_row("2026-01-01T00:00:00Z", 80),
    ]
    result = parse_actuals(rows, START, END)
    assert [a.generation for a in result] == [80.0, 120.0]


def test_parse_forecasts_drops_negative_horizon_and_sorts():
    rows = [
        {"startTime": "2026-01-01T05:00:00Z", "publishTime": "2026-01-01T02:30:00Z", "generation": 10},
        {"startTime": "2026-01-01T01:00:00Z", "publishTime": "2026-01-01T02:30:00Z", "generation": 20},
        {"startTime": "2026-01-01T03:00:00Z", "publishTime": "2026-01-01T02:30:00Z", "generation": 30},
        {"startTime": "2026-01-01T04:00:00Z", "publishTime": "2026-01-01T02:30:00Z", "generation": None},
    ]
    result = parse_forecasts(rows)
    assert [f.generation for f in result] == [30.0, 10.0]
    assert all(f.horizon.total_seconds() >= 0 for f in result)


def test_client_sends_expected_params_and_parses_both_payload_shapes():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen[request.url.path] = dict(request.url.params)
        if request.url.path.endswith("FUELHH/stream"):
            return httpx.Response(200, content=json.dumps([fuel_row("2026-01-01T00:00:00Z", 100)]))
        body = {"data": [{"startTime": "2026-01-01T03:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "generation": 5}]}
        return httpx.Response(200, content=json.dumps(body))

    client = ElexonClient(httpx.Client(base_url="https://example.test", transport=httpx.MockTransport(handler)))
    actuals = client.fetch_actuals(START, END)
    forecasts = client.fetch_forecasts(START, END)

    assert seen["/datasets/FUELHH/stream"] == {
        "settlementDateFrom": "2025-12-31",
        "settlementDateTo": "2026-01-02",
        "fuelType": "WIND",
    }
    assert seen["/datasets/WINDFOR/stream"] == {
        "publishDateTimeFrom": "2026-01-01T00:00:00Z",
        "publishDateTimeTo": "2026-01-02T00:00:00Z",
    }
    assert actuals[0].generation == 100.0
    assert forecasts[0].start_time == parse_time("2026-01-01T03:00:00Z")
