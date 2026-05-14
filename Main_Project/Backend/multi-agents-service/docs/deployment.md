# Deployment

## Local Development

### Prerequisites

- Python 3.12+
- API keys: `OPENAI_API_KEY`, `TAVILY_API_KEY`

### Setup

```bash
cd Main_Project/Backend/multi-agents-service

# Install dependencies
pip install -e .

# Or with uv
uv sync
uv pip install -e .

# Run the API
uvicorn src.api.main:app --reload --port 8000

# Or run the CLI
python -m src.fin_agents.portfolio.cli --request "Growth portfolio, high risk, select 10 stocks"
```

### Environment

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

### Run Tests

```bash
pytest tests/ -v
```

---

## Docker

### Build & Run

```bash
docker compose up --build
```

The API will be available at `http://localhost:8000`.

### Using Pre-built Image

```yaml
services:
  api:
    image: fin-agents:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/financial_advisor
      - OPENAI_API_KEY=your_key
      - TAVILY_API_KEY=your_key
    depends_on:
      - db
```

---

## Production Considerations

### Database

- Use PostgreSQL in production (not SQLite)
- Set `DATABASE_URL` environment variable
- Run migrations before deployment

### API Keys

- Never commit `.env` files
- Use Docker secrets or environment variables in production
- Consider using a secrets manager

### Storage

- Reports and visualizations are saved to `./storage/`
- Mount a persistent volume in production:

```yaml
volumes:
  - ./storage:/app/storage
```

### API Server

- Use `uvicorn` with `--workers` for multi-process
- Use `gunicorn` for production:
  ```bash
  gunicorn src.api.main:app -w 4 -k uvicorn.workers.UvicornWorker
  ```

### Logging

- Set `LOG_LEVEL=INFO` in production
- Consider shipping logs to a centralized logging service

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./data/portfolio.db` | Database connection string |
| `OPENAI_API_KEY` | — | OpenAI API key (required) |
| `TAVILY_API_KEY` | — | Tavily API key (optional) |
| `BENCHMARK_TICKER` | `^GSPC` | Market benchmark ticker |
| `DEFAULT_PERIOD` | `5y` | Default data period |
| `LOG_LEVEL` | `INFO` | Logging level |
| `STORAGE_BASE` | `./storage` | Base directory for reports/viz |
