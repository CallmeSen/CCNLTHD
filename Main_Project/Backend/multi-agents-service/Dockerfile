# # ============================================
# # Stage 1: Builder
# # ============================================
# FROM python:3.12-slim AS builder

# WORKDIR /app

# # Install uv
# COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# # Copy dependency files
# COPY pyproject.toml uv.lock ./

# # Sync dependencies into virtual environment
# RUN uv sync --frozen --no-install-project --no-dev

# # Copy source code
# COPY src/ ./src/

# # ============================================
# # Stage 2: Development
# # ============================================
# FROM builder AS development

# # Install dev dependencies
# RUN uv sync --frozen --no-install-project

# ENV PYTHONPATH=/app/src
# ENV PATH="/app/.venv/bin:$PATH"
# ENV LOG_LEVEL=INFO

# # Create non-root user
# RUN groupadd --gid 1000 appgroup && \
#     useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

# WORKDIR /app
# RUN mkdir -p storage && chown -R appuser:appgroup /app
# USER appuser

# # Expose port
# EXPOSE 8000

# CMD ["/app/.venv/bin/uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ============================================
# Stage 3: Production
# ============================================
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Sync dependencies (exclude dev tools)
    RUN uv sync --frozen --no-install-project --no-dev

# Copy source code
COPY --chown=0:0 src/ ./src/

# Create non-root user
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

RUN mkdir -p storage && chown -R appuser:appgroup /app
USER appuser

ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:$PATH"
ENV LOG_LEVEL=INFO

# Expose port
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health', timeout=5.0)"

CMD ["/app/.venv/bin/uvicorn", "src.fin_agents.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
