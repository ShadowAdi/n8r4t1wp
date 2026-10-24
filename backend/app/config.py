import os
from pathlib import Path
from datetime import datetime, timedelta, timezone

ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
REQUEST_TIMEOUT_SECONDS = 60.0

TARGET_START = datetime(2026, 1, 1, tzinfo=timezone.utc)
TARGET_END = datetime(2026, 2, 2, tzinfo=timezone.utc)
MAX_HORIZON = timedelta(hours=72)
FORECAST_PUBLISH_START = TARGET_START - MAX_HORIZON
FORECAST_PUBLISH_END = TARGET_END

CACHE_DIR = os.environ.get("CACHE_DIR", str(Path(__file__).resolve().parent.parent / ".cache"))
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
DEFAULT_HORIZON_HOURS = 4.0
DEFAULT_DAY_AHEAD_CUTOFF = "09:00"
HORIZON_CURVE_HOURS = list(range(0, 49))
