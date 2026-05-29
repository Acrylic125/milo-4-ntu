# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Builder: install deps with uv into a self-contained virtualenv
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_PYTHON_DOWNLOADS=never

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.11.17 /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev \
 && uv pip install --python /opt/venv/bin/python gunicorn

# -----------------------------------------------------------------------------
# Model: pre-download sentence-transformers weights into the image
# -----------------------------------------------------------------------------
FROM builder AS model
ENV PATH="/opt/venv/bin:$PATH" \
    HF_HOME=/opt/hf-cache \
    TRANSFORMERS_OFFLINE=0
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# -----------------------------------------------------------------------------
# Runtime: slim image with prebuilt venv, cached model, non-root user
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    HF_HOME=/opt/hf-cache \
    TRANSFORMERS_OFFLINE=1 \
    PORT=8002 \
    GUNICORN_WORKERS=1 \
    GUNICORN_THREADS=4 \
    GUNICORN_TIMEOUT=120

RUN apt-get update \
 && apt-get install -y --no-install-recommends libgomp1 \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 app \
 && useradd  --system --uid 1001 --gid app --create-home app

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --from=model   /opt/hf-cache /opt/hf-cache
RUN chown -R app:app /opt/hf-cache

COPY --chown=app:app app.py ./

USER app
EXPOSE 8002

CMD ["sh", "-c", "gunicorn app:app \
    --bind 0.0.0.0:${PORT} \
    --workers ${GUNICORN_WORKERS} \
    --threads ${GUNICORN_THREADS} \
    --timeout ${GUNICORN_TIMEOUT} \
    --access-logfile - \
    --error-logfile -"]
