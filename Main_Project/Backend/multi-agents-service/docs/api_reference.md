# API Reference

## Portfolio Generation API

Base URL: `/portfolio`

---

### POST `/portfolio/analyze`

Run the full portfolio generation LangGraph workflow.

**Request Body:**

```json
{
  "request": "I want a diversified retirement portfolio, high risk tolerance, select 15 growth stocks",
  "lang": "en"
}
```

**Response:**

```json
{
  "run_id": "a1b2c3d4",
  "status": "completed",
  "report": "# Financial Portfolio Report\n\n## User Profile Summary\n...",
  "user_profile": {
    "goal": "retirement",
    "risk_tolerance": "high",
    "time_horizon": "10 years",
    "suggested_assets": ["AAPL", "MSFT", "GOOGL", ...]
  },
  "proposed_portfolio": {
    "AAPL": 0.15,
    "MSFT": 0.12,
    "GOOGL": 0.10,
    ...
  },
  "metrics": {
    "AAPL": { "annualized_return": 0.25, "sharpe_ratio": 1.2, ... },
    "portfolio": { "total_return": 0.18, "sharpe_ratio": 1.1, ... }
  },
  "validation_result": {
    "status": "pass",
    "errors": []
  }
}
```

---

### GET `/portfolio/history`

List all past portfolio analysis runs.

**Response:**

```json
[
  {
    "run_id": "a1b2c3d4",
    "timestamp": "2026-04-27T12:00:00",
    "request": "I want a diversified retirement portfolio...",
    "status": "completed",
    "portfolio": { "AAPL": 0.15, ... }
  }
]
```

---

### GET `/portfolio/report/{run_id}`

Get the Markdown report for a specific run.

**Response:**

```json
{
  "run_id": "a1b2c3d4",
  "report": "# Financial Portfolio Report\n\n..."
}
```

---

### GET `/portfolio/visualization/{run_id}`

Generate (or retrieve) the Plotly HTML dashboard.

**Response:**

```json
{
  "run_id": "a1b2c3d4",
  "visualization_url": "/storage/visualizations/a1b2c3d4.html"
}
```

---

## Advisory API

Base URL: `/`

### GET `/`

API status.

**Response:**

```json
{
  "status": "healthy",
  "service": "Financial Advisor API",
  "version": "0.1.0",
  "timestamp": "2026-04-27T12:00:00"
}
```

---

### GET `/health`

Health check with database status.

**Response:**

```json
{
  "status": "healthy",
  "service": "Financial Advisor API",
  "version": "0.1.0",
  "timestamp": "2026-04-27T12:00:00",
  "database": "connected"
}
```

---

### GET `/clients`

List all clients with pagination.

**Query Parameters:**
- `skip` (int, default: 0)
- `limit` (int, default: 100)

---

### GET `/clients/{client_id}`

Get client by ID.

---

### GET `/clients/{client_id}/portfolios`

Get all portfolios for a client.

---

### GET `/funds`

List mutual funds with optional category filter.

**Query Parameters:**
- `skip` (int, default: 0)
- `limit` (int, default: 100)
- `category` (string, optional)

---

### POST `/advisory/request`

Create an advisory request.

**Request Body:**

```json
{
  "client_id": "CLT001",
  "portfolio_id": "PF001",
  "question": "Should I rebalance my portfolio?"
}
```

---

### GET `/advisory/{request_id}`

Get advisory request status.

---

### GET `/advisory/status/{status}`

Get all requests with a specific status.

Valid statuses: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `HOLD`, `BLOCKED`
