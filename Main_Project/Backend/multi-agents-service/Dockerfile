# ============================================
# Stage 1: Builder — install dependencies only
# ============================================
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv (pin specific version for reproducibility)
COPY --from=ghcr.io/astral-sh/uv:0.5.20 /uv /usr/local/bin/uv

# Copy lock files FIRST — this layer changes rarely
COPY pyproject.toml uv.lock ./

# Mount uv cache to avoid re-downloading across builds
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# ============================================
# Stage 2: Production image
# ============================================
FROM python:3.12-slim AS production

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy source code — this layer changes most often, placed last for cache efficiency
COPY --chown=0:0 src/ ./src/

# Non-root user
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

RUN mkdir -p storage && chown -R appuser:appgroup /app
USER appuser

ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:$PATH"
ENV LOG_LEVEL=INFO

EXPOSE 8086

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8086/health', timeout=5.0)"

CMD ["/app/.venv/bin/uvicorn", "src.fin_agents.api.main:app", "--host", "0.0.0.0", "--port", "8086"]
