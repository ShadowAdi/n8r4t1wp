from datetime import datetime, timedelta, timezone

ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
REQUEST_TIMEOUT_SECONDS = 60.0

TARGET_START = datetime(2026, 1, 1, tzinfo=timezone.utc)
TARGET_END = datetime(2026, 2, 2, tzinfo=timezone.utc)
MAX_HORIZON = timedelta(hours=72)
FORECAST_PUBLISH_START = TARGET_START - MAX_HORIZON
FORECAST_PUBLISH_END = TARGET_END
