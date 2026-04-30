# Architecture

## Overview

The `fin_agents` package provides a **Stock Portfolio Generation Workflow** — a LangGraph-based pipeline that takes a natural-language investment request and produces a diversified US stock portfolio with full analysis.

---

## Stock Portfolio Generation Workflow

### 8 LangGraph Nodes

| Node | Description |
|------|-------------|
| `parse_user_request` | Parses user input into structured investment goals |
| `fetch_market_news` | Retrieves market news via Tavily API |
| `fetch_data` | Fetches asset data via yfinance |
| `calculate_metrics` | Computes CAPM, Sharpe, SMA, Beta, Drawdown |
| `propose_portfolio` | Assigns weights via LLM |
| `validate_portfolio` | Validates risk alignment and weight sum |
| `generate_commentary` | Explains allocation via LLM |
| `structure_output` | Generates Markdown report |

### Workflow Flow

```
parse_user_request
       │
       ▼ (error → handle_error)
fetch_market_news ──► fetch_data
                              │
                              ▼ (error → handle_error)
                      calculate_metrics
                              │
                              ▼
                      propose_portfolio
                              │
                              ▼ (error → handle_error)
                      validate_portfolio
                              │
                              ▼ (error → handle_error)
                      generate_commentary
                              │
                              ▼
                      structure_output
                              │
                              ▼
                              END
```

---

## Package Structure

```
src/fin_agents/
├── graphs/
│   └── workflow/
│       └── stock_advisory/
│           ├── __init__.py       # compile_stock_advisory_graph export
│           ├── state.py          # StockAdvisoryState TypedDict
│           ├── builder.py         # LangGraph builder
│           ├── routing.py        # Conditional routing functions
│           ├── prompts.py        # System prompts
│           ├── nodes.py          # Node implementations
│           └── api.py            # FastAPI route handler
│
├── core/                        # Core utilities
│   ├── market/
│   │   ├── yahoo_finance.py     # YahooFinanceClient
│   │   └── tavily_news.py       # TavilyNewsClient
│   ├── finance/
│   │   ├── metrics.py           # CAPM, SMA, Sharpe calculations
│   │   ├── visualization.py     # Plotly dashboard generator
│   │   └── report.py            # Markdown report formatter
│   └── orchestrator.py          # Workflow orchestration & persistence
│
├── db/                          # Database layer
│   ├── database.py              # SQLAlchemy engine + session
│   ├── models.py                # ORM models
│   └── repositories.py           # Data access objects
│
└── api/
    ├── main.py                  # FastAPI app
    └── schemas.py                # Pydantic request/response models
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API status |
| GET | `/health` | Health check |
| GET | `/clients` | List clients |
| GET | `/clients/{id}` | Get client |
| GET | `/clients/{id}/portfolios` | Get client portfolios |
| GET | `/funds` | List mutual funds |
| GET | `/funds/{id}` | Get mutual fund |
| GET | `/portfolios/{id}` | Get portfolio |
| POST | `/portfolio/analyze` | Run stock portfolio generation workflow |
| GET | `/workflows` | List available workflows |

---

## Environment Variables

```bash
# Database
DATABASE_URL=sqlite:///./data/portfolio.db

# LLM
OPENAI_API_KEY=your_openai_key_here

# Market Data
BENCHMARK_TICKER=^GSPC
DEFAULT_PERIOD=5y

# News
TAVILY_API_KEY=your_tavily_key_here

# Logging
LOG_LEVEL=INFO
```
