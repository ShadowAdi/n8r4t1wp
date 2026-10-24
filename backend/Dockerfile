FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    CACHE_DIR=/app/.cache

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app

ARG PREFETCH_DATA=true
RUN if [ "$PREFETCH_DATA" = "true" ]; then python -c "from app.store import DataStore; DataStore().get()" || echo "prefetch skipped"; fi

RUN useradd --create-home --uid 1000 appuser && mkdir -p /app/.cache && chown -R appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8000\")}/api/health', timeout=4)"

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]
