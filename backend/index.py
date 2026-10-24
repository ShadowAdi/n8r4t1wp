import os

os.environ.setdefault("CACHE_DIR", "/tmp/wind-cache")

from app.main import app

__all__ = ["app"]
