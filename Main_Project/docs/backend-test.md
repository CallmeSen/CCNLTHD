# Backend Testing Guide — InvestAdvisor Platform

This guide covers everything from a fresh `git clone` to a fully verified running stack, then goes into detail for each service.

All commands use **PowerShell** (`Invoke-RestMethod`) — no curl, Java, Python, or Maven needed locally. Everything runs inside Docker.

---

## 0. Quick Start — From Git Clone to Verified

### Prerequisites

| Tool | Min Version | Purpose |
|---|---|---|
| Git | any | Clone the repo |
| Docker Desktop | 4.x | Run all services and databases |
| PowerShell | 5.1 (Windows built-in) | Run the commands below |

> You do **not** need Java, Python, Maven, or Node installed locally.

### Step 1 — Clone and enter the backend folder

```powershell
git clone <repo-url>
Set-Location CCNLTHD\Main_Project\Backend
```

### Step 2 — Create `.env`

```powershell
Copy-Item .env.example .env
```

Open `.env` and review:

| Variable | Default | Notes |
|---|---|---|
| `JWT_SECRET` | pre-filled | Leave as-is for local dev |
| `VNSTOCK_API_KEY` | *(blank)* | Optional — free key from [vnstocks.com/login](https://vnstocks.com/login). Blank = 20 req/min (Guest); with key = 60 req/min (Community) |
| `MAIL_*` | *(blank)* | Optional — SMTP for email alerts. All other services work without it |

### Step 3 — Build and start the full stack

```powershell
docker compose up -d --build
```

First run pulls images and builds all services — expect **3–5 minutes**. Subsequent starts take ~30 seconds.

### Step 4 — Verify all services are healthy

```powershell
docker compose ps
```

All containers should show `healthy` or `running`. Open these dashboards:

| Dashboard | URL |
|---|---|
| API Gateway (all requests go here) | http://localhost:8080 |
| Eureka (service registry) | http://localhost:8761 |
| Kafka UI | http://localhost:8090 |

> All API calls below use **port 8080** (the gateway). Never call service ports directly.

### Step 5 — Register and get an auth token

```powershell
# First time: register a new user
$REGISTER = Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/auth/register `
  -ContentType "application/json" `
  -Body '{"fullName":"Test User","email":"smoke@test.com","password":"Test1234!"}'
$TOKEN   = $REGISTER.accessToken
$USER_ID = $REGISTER.user.id

# Already registered? Login instead:
# $LOGIN   = Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/auth/login `
#   -ContentType "application/json" `
#   -Body '{"email":"smoke@test.com","password":"Test1234!"}'
# $TOKEN   = $LOGIN.accessToken
# $USER_ID = $LOGIN.user.id

Write-Host "Token set. User: $USER_ID"
```

> `$TOKEN` lives only in the current PowerShell session. Re-run the login block in every new window.

### Step 6 — Seed stock master records

The database starts empty. Insert 5 HOSE blue-chips:

```powershell
$stocks = @(
  @{ ticker="VCB"; exchange="HOSE"; companyName="Vietcombank";    sector="Financials";       industry="Banking"          },
  @{ ticker="FPT"; exchange="HOSE"; companyName="FPT Corporation"; sector="Technology";       industry="IT Services"      },
  @{ ticker="VNM"; exchange="HOSE"; companyName="Vinamilk";        sector="Consumer Staples"; industry="Food & Beverage"  },
  @{ ticker="VHM"; exchange="HOSE"; companyName="Vinhomes";        sector="Real Estate";      industry="Residential"      },
  @{ ticker="HPG"; exchange="HOSE"; companyName="Hoa Phat Group";  sector="Materials";        industry="Steel"            }
)
foreach ($s in $stocks) {
  try {
    Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/market/stocks `
      -Headers @{ Authorization = "Bearer $TOKEN" } `
      -ContentType "application/json" `
      -Body ($s | ConvertTo-Json -Compress) | Out-Null
    Write-Host "Seeded $($s.ticker)"
  } catch { Write-Host "$($s.ticker) already exists — skipping" }
}
```

> `VNINDEX` and `VN30` are seeded automatically on startup — no manual step needed.

### Step 7 — Fetch real price history

The market-data-service is **Python/FastAPI**. It calls the `vnstock` library (VCI source) internally — no local Python needed.

```powershell
# Individual stocks
foreach ($ticker in @("VCB","FPT","VNM","VHM","HPG")) {
  $r = Invoke-RestMethod -Method POST `
    -Uri "http://localhost:8080/api/market/stocks/$ticker/fetch?interval=1D&from=2025-01-01&to=2026-04-29" `
    -Headers @{ Authorization = "Bearer $TOKEN" }
  Write-Host "$ticker ingested $($r.ingested) bars"
}

# Indices (VNINDEX and VN30)
foreach ($idx in @("VNINDEX","VN30")) {
  $r = Invoke-RestMethod -Method POST `
    -Uri "http://localhost:8080/api/market/indices/fetch?indexId=$idx&interval=1D&from=2025-01-01&to=2026-04-29" `
    -Headers @{ Authorization = "Bearer $TOKEN" }
  Write-Host "$idx ingested $($r.ingested) bars"
}
```

Expect ~326 bars per stock, ~308 bars for VNINDEX/VN30. Re-running is safe — duplicates skipped.

### Step 8 — Verify data

```powershell
# Latest bar for all active tickers in one call
@(Invoke-RestMethod -Method GET `
  -Uri "http://localhost:8080/api/market/prices/latest?interval=1D" `
  -Headers @{ Authorization = "Bearer $TOKEN" }) |
  Select-Object ticker, timestamp, open, high, low, close, volume | Format-Table -AutoSize
```

You should see a table with one row per seeded ticker. You're set — continue with the detailed sections below.

---

## 1. Detailed Setup Reference

### 1.1 Create `.env` from the example

```powershell
Set-Location D:\CNLTHD\CCNLTHD\Main_Project\Backend
Copy-Item .env.example .env
```

Open `.env` and check:
- `JWT_SECRET` — leave the default for local dev (it is 32+ chars)
- `VNSTOCK_API_KEY` — optional free key from [vnstocks.com/login](https://vnstocks.com/login) for higher rate limits
- `MAIL_*` — email sending will fail until real SMTP credentials are provided; only affects notification-service. All other services work fine without it.

### 1.2 Start the full stack

```powershell
Set-Location D:\CNLTHD\CCNLTHD\Main_Project\Backend
docker compose up -d --build
```

First run takes ~3–5 minutes to pull images and build all services. The **market-data-service** is Python/FastAPI (no JVM warm-up needed); all other services are Spring Boot Java.

### 1.3 Verify everything is up

```powershell
docker compose ps
```

All containers should show `healthy` or `running`. Key ports:

| Service | URL |
|---|---|
| Eureka dashboard | http://localhost:8761 |
| API Gateway (all traffic goes here) | http://localhost:8080 |
| Kafka UI | http://localhost:8090 |

> **All API commands in this guide use port 8080 (the gateway).** You never call individual service ports directly.

### 1.4 Watch logs while testing (optional but useful)

```powershell
# All services
docker compose logs -f

# Single service
docker compose logs -f user-service
docker compose logs -f market-data-service
```

---

## 2. Authentication (user-service)

Everything except `/api/auth/**` requires a JWT. Get one first.

### 2.1 Register a new user

```powershell
$REGISTER = Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/auth/register `
  -ContentType "application/json" `
  -Body '{"fullName":"Triet Do","email":"triet@test.com","password":"Test1234!"}'
$REGISTER | ConvertTo-Json
```

**Expected response (201 Created):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400000,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "triet@test.com",
    "fullName": "Triet Do",
    "role": "USER"
  }
}
```

Copy the `accessToken` value — you need it for every other request.

### 2.2 Login (get a new token)

```powershell
$LOGIN = Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"triet@test.com","password":"Test1234!"}'
$LOGIN | ConvertTo-Json
```

**Expected response (200 OK):** same shape as register.

### 2.3 Set token in PowerShell variable (convenient for the rest of this guide)

```powershell
# From register:
$TOKEN   = $REGISTER.accessToken
$USER_ID = $REGISTER.user.id

# Or from login:
$TOKEN   = $LOGIN.accessToken
$USER_ID = $LOGIN.user.id

Write-Host "Token OK. User: $USER_ID"
```

---

## 3. User Profile (user-service)

### 3.1 Get your own profile

```powershell
Invoke-RestMethod -Method GET -Uri "http://localhost:8080/api/users/$USER_ID" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json
```

**Expected (200 OK):** your `UserDto` JSON.

---

## 4. Market Data (market-data-service)

### 4.1 Seed the stock master list

The database starts empty. Insert a few HOSE tickers manually:

```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/market/stocks `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body '{"ticker":"VCB","exchange":"HOSE","companyName":"Vietcombank","sector":"Financials","industry":"Banking","marketCapVnd":452000000000000}'

Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/market/stocks `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body '{"ticker":"VNM","exchange":"HOSE","companyName":"Vinamilk","sector":"Consumer Staples","industry":"Food & Beverage","marketCapVnd":123000000000000}'

Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/market/stocks `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body '{"ticker":"FPT","exchange":"HOSE","companyName":"FPT Corporation","sector":"Technology","industry":"IT Services","marketCapVnd":85000000000000}'
```

### 4.2 Query all stocks

```powershell
Invoke-RestMethod -Method GET -Uri http://localhost:8080/api/market/stocks `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5
```

**Expected (200 OK):** JSON array of the tickers you inserted.

### 4.3 Query a single stock

```powershell
Invoke-RestMethod -Method GET -Uri http://localhost:8080/api/market/stocks/VCB `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json
```

### 4.4 Fetch real price history from vnstock

The market-data-service calls the `vnstock` Python library (VCI source) internally. No local Python or API key required.

```powershell
# Bulk-fetch all 5 stocks — one call per ticker, ~326 daily bars each
foreach ($ticker in @("VCB","FPT","VNM","VHM","HPG")) {
  $r = Invoke-RestMethod -Method POST `
    -Uri "http://localhost:8080/api/market/stocks/$ticker/fetch?interval=1D&from=2025-01-01&to=2026-04-29" `
    -Headers @{ Authorization = "Bearer $TOKEN" }
  Write-Host "$ticker ingested $($r.ingested) bars"
}
```

Response shape: `{ ticker, interval, from, to, ingested }`. Re-running is safe — duplicates are skipped.

### 4.4b All tickers' latest price in one call

```powershell
@(Invoke-RestMethod -Method GET `
  -Uri "http://localhost:8080/api/market/prices/latest?interval=1D" `
  -Headers @{ Authorization = "Bearer $TOKEN" }) |
  Select-Object ticker, timestamp, open, high, low, close, volume | Format-Table -AutoSize
```

### 4.5 Query latest price

```powershell
Invoke-RestMethod -Method GET -Uri "http://localhost:8080/api/market/stocks/VCB/price/latest?interval=1D" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json
```

### 4.6 Query price history (with date range)

```powershell
Invoke-RestMethod -Method GET -Uri "http://localhost:8080/api/market/stocks/VCB/price/history?interval=1D&from=2026-04-22T00:00:00&to=2026-04-25T00:00:00" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5
```

### 4.7 Query last N daily bars

```powershell
Invoke-RestMethod -Method GET -Uri "http://localhost:8080/api/market/stocks/VCB/price/daily?limit=30" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5
```

---

## 5. VN-Index & VN30 — Live Data from vnstock (VCI source)

> **Authentication required:** all `/api/market/**` routes go through `AuthenticationFilter` in the API gateway. Every request below needs `Authorization: Bearer $TOKEN`.
>
> The index tickers `VNINDEX` and `VN30` are seeded into the `stocks` table automatically when the service starts — you do **not** need to `POST /api/market/stocks` for them.
>
> Data is fetched via the `vnstock` Python library using the VCI data source — no API key required.

### 5.1 Check which indices are supported

```powershell
Invoke-RestMethod -Method GET -Uri http://localhost:8080/api/market/indices `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json
```

**Expected (200 OK):**
```json
["VNINDEX", "VN30"]
```

### 5.2 Backfill historical data (run this once)

This triggers the service to fetch data via vnstock (VCI source) and store all daily candles for the given date range.
No API key needed — vnstock VCI is a free data source.

```powershell
# Backfill VNINDEX — daily candles for the last year
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:8080/api/market/indices/fetch?indexId=VNINDEX&interval=1D&from=2025-01-01&to=2026-04-29" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json
```

**Expected (200 OK):**
```json
{
  "indexId":  "VNINDEX",
  "interval": "1D",
  "from":     "2025-01-01",
  "to":       "2026-04-29",
  "ingested": 308
}
```

`ingested` is the count of new rows written. Re-running is safe — duplicates are skipped automatically.

```powershell
# Backfill VN30 — same period
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:8080/api/market/indices/fetch?indexId=VN30&interval=1D&from=2025-01-01&to=2026-04-29" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json
```

```powershell
# Backfill hourly candles for a shorter period (intraday analysis)
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:8080/api/market/indices/fetch?indexId=VNINDEX&interval=1H&from=2026-04-01&to=2026-04-29" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json
```

Valid `interval` values: `1MIN`, `5MIN`, `15MIN`, `1H`, `1D`

### 5.3 Query latest price for an index

```powershell
Invoke-RestMethod -Method GET `
  -Uri "http://localhost:8080/api/market/indices/VNINDEX/price/latest?interval=1D" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json
```

**Expected (200 OK):**
```json
{
  "id":        1,
  "ticker":    "VNINDEX",
  "timestamp": "2026-04-29T00:00:00",
  "open":      1220.50,
  "high":      1235.10,
  "low":       1218.30,
  "close":     1231.75,
  "volume":    425000000,
  "interval":  "1D"
}
```

```powershell
# VN30 latest
Invoke-RestMethod -Method GET `
  -Uri "http://localhost:8080/api/market/indices/VN30/price/latest?interval=1D" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json
```

### 5.4 Query price history for a date range

The `from` and `to` parameters take `yyyy-MM-dd` date strings (not datetime).

```powershell
# VNINDEX — daily bars for Q1 2026
Invoke-RestMethod -Method GET `
  -Uri "http://localhost:8080/api/market/indices/VNINDEX/price/history?interval=1D&from=2026-01-01&to=2026-03-31" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5
```

```powershell
# VN30 — hourly bars for the last two weeks
Invoke-RestMethod -Method GET `
  -Uri "http://localhost:8080/api/market/indices/VN30/price/history?interval=1H&from=2026-04-15&to=2026-04-29" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5
```

**Expected (200 OK):** JSON array of OHLCV objects ordered by `timestamp` ascending.

### 5.5 Verify auto-scheduling is active

After 17:30 ICT on any trading weekday the scheduler will automatically call vnstock VCI and ingest the day's candle. Check the logs:

```powershell
docker compose logs market-data-service | Select-String "Fetching|Persisted|fetch failed"
```

You should see lines like:
```
Fetching VNINDEX 1D from 2026-04-29 to 2026-04-29
Persisted 1/1 records for VNINDEX (1D)
```

### 5.6 Verify index seed on startup

```powershell
# Confirm VNINDEX and VN30 exist in the stocks table
docker exec -it invest_postgres psql -U postgres -d market_data_db `
  -c "SELECT ticker, company_name, sector FROM stocks WHERE sector = 'INDEX';"
```

**Expected:**
```
  ticker  |    company_name    | sector
----------+--------------------+--------
 VNINDEX  | VN-Index (HOSE)    | INDEX
 VN30     | VN30 Index (HOSE)  | INDEX
```

---

## 6. Market Data — Where does real data come from?

All market data is fetched from the **vnstock Python library (VCI source)** running inside the container — no API key or account required.

| What runs automatically | When |
|---|---|
| Daily (1D) candle for VNINDEX + VN30 | Every trading weekday at 17:30 ICT |
| Hourly (1H) candles for VNINDEX + VN30 | Weekdays at 09:15, 11:30, 15:15 ICT |

For individual HOSE/HNX stocks (VCB, FPT, etc.) use `POST /api/market/stocks/{ticker}/fetch` to trigger a backfill via the API:

```powershell
# Backfill VCB daily bars from the API (no local Python needed)
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:8080/api/market/stocks/VCB/fetch?interval=1D&from=2025-01-01&to=2026-04-29" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json
```

The backend calls vnstock VCI internally and persists the result directly to PostgreSQL.

---

## 7. Portfolio (portfolio-service)

Portfolios are **watchlists** — named collections of tickers for AI analysis. No buying or selling; just track which stocks you want the AI to analyze.

### 7.1 Create a portfolio

```powershell
$PORTFOLIO = Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/portfolios `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body '{"name":"Growth Portfolio","description":"High risk, long term","riskProfile":"AGGRESSIVE"}'
$PORTFOLIO_ID = $PORTFOLIO.id
Write-Host "Portfolio ID: $PORTFOLIO_ID"
```

`riskProfile` must be one of: `CONSERVATIVE`, `MODERATE`, `AGGRESSIVE`.

**Expected (201 Created):** `PortfolioDto` with a UUID `id` and empty `tickers` list.

### 7.2 List your portfolios

```powershell
Invoke-RestMethod -Method GET -Uri http://localhost:8080/api/portfolios `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5
```

### 7.3 Add stocks to watch

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:8080/api/portfolios/$PORTFOLIO_ID/stocks" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body '{"ticker":"VCB"}' | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method POST -Uri "http://localhost:8080/api/portfolios/$PORTFOLIO_ID/stocks" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body '{"ticker":"VNM"}' | ConvertTo-Json -Depth 5
```

**Expected (200 OK):** updated `PortfolioDto` with `tickers: ["VCB", "VNM"]`.

### 7.4 Remove a stock

```powershell
Invoke-RestMethod -Method DELETE -Uri "http://localhost:8080/api/portfolios/$PORTFOLIO_ID/stocks/VNM" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5
```

### 7.5 Update risk profile

```powershell
Invoke-RestMethod -Method PATCH -Uri "http://localhost:8080/api/portfolios/$PORTFOLIO_ID/risk-profile?riskProfile=MODERATE" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json
```

---

## 8. Notifications (notification-service)

Notifications are written automatically by the Kafka consumers when you:
- Register a user → `USER_REGISTERED` event
- Add/remove stocks in a portfolio → `STOCK_ADDED` / `STOCK_REMOVED` event
- Ingest a price → `MARKET_PRICE_ALERT` event (if alert logic is configured)

### 8.1 View your notifications

```powershell
Invoke-RestMethod -Method GET -Uri http://localhost:8080/api/notifications `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5
```

### 8.2 Filter by type

```powershell
Invoke-RestMethod -Method GET -Uri http://localhost:8080/api/notifications/type/USER_REGISTERED `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5
```

Valid types: `USER_REGISTERED`, `MARKET_PRICE_ALERT`, `PORTFOLIO_TRANSACTION`, `SYSTEM_ALERT`.

> **Email sending** requires real SMTP credentials in `.env`. Until then, notification records are still saved to the database with `status: FAILED` and an `errorMessage` — so you can verify the Kafka pipeline works even without a real SMTP server.

---

## 9. Verify Kafka Events

Open Kafka UI at **http://localhost:8090** after any operation above.

1. Click **Topics** in the left menu.
2. Check these topics:
   - `user-events` — after register/login
   - `portfolio-events` — after any transaction
   - `market-data-events` — after any `/api/market/ingest` call
3. Click a topic → **Messages** tab to see the raw event JSON.

This confirms producers are publishing and the pipeline is live.

---

## 10. Verify Service Registration

Open Eureka at **http://localhost:8761**. Under *"Instances currently registered with Eureka"* you should see:

- `API-GATEWAY`
- `USER-SERVICE`
- `MARKET-DATA-SERVICE`
- `PORTFOLIO-SERVICE`
- `NOTIFICATION-SERVICE`

Services take ~30 seconds after startup to register. Refresh if empty.

---

## 11. Verify Databases Directly

```powershell
# Connect to PostgreSQL inside Docker
docker exec -it invest_postgres psql -U postgres

# List databases
\l

# Switch to portfolio DB and check data
\c portfolio_db
SELECT id, name, risk_profile FROM portfolios;
SELECT portfolio_id, ticker, added_at FROM watchlist_items ORDER BY added_at DESC;

# Switch to user DB
\c user_db
SELECT id, email, role FROM users;

# Switch to market data DB
\c market_data_db
SELECT ticker, timestamp, close, interval FROM stock_prices ORDER BY timestamp DESC LIMIT 10;

# Exit
\q
```

---

## 12. Quick Smoke-Test Sequence (copy-paste order)

Run these in order to validate the full happy path in one go:

```powershell
# 1. Get a token — use Login if already registered, otherwise Register
# Option A: Login (already have an account)
$LOGIN = Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"smoke@test.com","password":"Test1234!"}'
$TOKEN = $LOGIN.accessToken
$USER_ID = $LOGIN.user.id
Write-Host "Token acquired. User ID: $USER_ID"

Option B: Register (first time only — skip if account already exists)
$REGISTER = Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/auth/register `
  -ContentType "application/json" `
  -Body '{"fullName":"Test User","email":"smoke@test.com","password":"Test1234!"}'
$TOKEN = $REGISTER.accessToken
$USER_ID = $REGISTER.user.id
Write-Host "Token acquired. User ID: $USER_ID"

# 2. Seed 5 VN30 blue-chip stocks into the master list
$stocks = @(
  @{ ticker="VCB"; exchange="HOSE"; companyName="Vietcombank";   sector="Financials";      industry="Banking"        },
  @{ ticker="FPT"; exchange="HOSE"; companyName="FPT Corporation"; sector="Technology";    industry="IT Services"    },
  @{ ticker="VNM"; exchange="HOSE"; companyName="Vinamilk";       sector="Consumer Staples"; industry="Food & Beverage" },
  @{ ticker="VHM"; exchange="HOSE"; companyName="Vinhomes";       sector="Real Estate";    industry="Residential"    },
  @{ ticker="HPG"; exchange="HOSE"; companyName="Hoa Phat Group"; sector="Materials";      industry="Steel"          }
)
foreach ($s in $stocks) {
  try {
    Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/market/stocks `
      -Headers @{ Authorization = "Bearer $TOKEN" } `
      -ContentType "application/json" `
      -Body ($s | ConvertTo-Json -Compress) | Out-Null
    Write-Host "Seeded $($s.ticker)"
  } catch {
    Write-Host "$($s.ticker) already exists — skipping"
  }
}
```

```powershell
# 3. Bulk-ingest real price history for all 5 stocks via the backend API
# The backend calls vnstock (VCI source) internally — no local Python needed
# Re-running is safe: duplicate bars are skipped automatically
foreach ($ticker in @("VCB","FPT","VNM","VHM","HPG")) {
  $result = Invoke-RestMethod -Method POST `
    -Uri "http://localhost:8080/api/market/stocks/$ticker/fetch?interval=1D&from=2025-01-01&to=2026-04-29" `
    -Headers @{ Authorization = "Bearer $TOKEN" }
  Write-Host "$ticker ingested $($result.ingested) bars"
}
```

> Each call hits `POST /api/market/stocks/{ticker}/fetch`, which fetches OHLCV history
> directly from vnstock VCI inside the container and persists it to PostgreSQL.
> Expect ~326 bars per ticker (trading days only). Response: `{ ticker, interval, from, to, ingested }`.

```powershell
# 3b. Verify ingested price data

# Latest closing price for each stock (use $p.timestamp, not $p.time)
foreach ($ticker in @("VCB","FPT","VNM","VHM","HPG")) {
  $p = Invoke-RestMethod -Method GET `
    -Uri "http://localhost:8080/api/market/stocks/$ticker/price/latest?interval=1D" `
    -Headers @{ Authorization = "Bearer $TOKEN" }
  Write-Host "$ticker  $($p.timestamp)  open=$($p.open)  high=$($p.high)  low=$($p.low)  close=$($p.close)  vol=$($p.volume)"
}

# All tickers latest price in one call
@(Invoke-RestMethod -Method GET `
  -Uri "http://localhost:8080/api/market/prices/latest?interval=1D" `
  -Headers @{ Authorization = "Bearer $TOKEN" }) |
  Select-Object ticker, timestamp, open, high, low, close, volume | Format-Table -AutoSize

# Last 5 daily bars for VCB (wrap in @() so Format-Table receives individual items)
@(Invoke-RestMethod -Method GET `
  -Uri "http://localhost:8080/api/market/stocks/VCB/price/daily?limit=5" `
  -Headers @{ Authorization = "Bearer $TOKEN" }) |
  Select-Object timestamp, open, high, low, close, volume | Format-Table -AutoSize

# Full date-range history for FPT (returns all ingested bars as JSON)
Invoke-RestMethod -Method GET `
  -Uri "http://localhost:8080/api/market/stocks/FPT/price/history?interval=1D&from=2025-01-01&to=2026-04-29" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json | Select-Object -First 80
```

> **Expected (200 OK)**
>
> - `latest` → `{ id, ticker, interval, timestamp, open, high, low, close, volume }`
> - `prices/latest` → array of all active tickers' latest bar in one request
> - `daily` → array of the last N bars, newest first (wrap response in `@()` before piping to `Format-Table`)
> - `history` → full array ordered by timestamp ascending; length should match `ingested` count (~326)
>
> **Note:** The timestamp field is named `timestamp`, not `time`.

```powershell
# 4. Fetch VNINDEX and VN30 live data from vnstock (backfill last 30 days)
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:8080/api/market/indices/fetch?indexId=VNINDEX&interval=1D&from=2026-03-30&to=2026-04-29" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:8080/api/market/indices/fetch?indexId=VN30&interval=1D&from=2026-03-30&to=2026-04-29" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json

# 5. Verify latest VNINDEX price was stored
Invoke-RestMethod -Method GET `
  -Uri "http://localhost:8080/api/market/indices/VNINDEX/price/latest?interval=1D" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json

# 6. Create a portfolio and capture ID
$PORTFOLIO = Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/portfolios `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body '{"name":"Smoke Test Portfolio","riskProfile":"MODERATE"}'
$PORTFOLIO_ID = $PORTFOLIO.id
Write-Host "Portfolio ID: $PORTFOLIO_ID"

# 7. Add all 5 seeded stocks to the watchlist
foreach ($ticker in @("VCB","FPT","VNM","VHM","HPG")) {
  Invoke-RestMethod -Method POST -Uri "http://localhost:8080/api/portfolios/$PORTFOLIO_ID/stocks" `
    -Headers @{ Authorization = "Bearer $TOKEN" } `
    -ContentType "application/json" `
    -Body "{`"ticker`":`"$ticker`"}" | Out-Null
  Write-Host "Added $ticker to portfolio"
}

# 8. Verify portfolio state (should show all 5 tickers)
Invoke-RestMethod -Method GET -Uri "http://localhost:8080/api/portfolios/$PORTFOLIO_ID" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 10

# 9. Check notifications
Invoke-RestMethod -Method GET -Uri http://localhost:8080/api/notifications `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5
```

---

## 13. Tear Down

```powershell
# Stop containers (keeps database volumes)
docker compose down

# Stop and wipe all data (clean slate for next run)
docker compose down -v
```

---

## 14. Common Problems

| Symptom | Likely cause | Fix |
|---|---|---|
| `401 Unauthorized` on any request | Token expired or wrong | Re-login and copy fresh token |
| `503 Service Unavailable` from gateway | Downstream service not registered in Eureka yet | Wait 30 sec and retry |
| `409 Conflict` on `POST /api/market/stocks` | Ticker already exists in DB | Expected — ticker is unique. Use `GET /api/market/stocks` to verify it's there |
| `409 Conflict` on `POST /api/portfolios/{id}/stocks` | Ticker already in this portfolio | Expected — use `GET /api/portfolios/{id}` to see current tickers |
| `500` on ingest with unknown ticker | Stock master row doesn't exist | Run Step 4.1 to create the stock first |
| Notification records have `status: FAILED` | No real SMTP configured | Expected — add Gmail App Password to `.env` to fix |
| `docker compose up` fails on port conflict | Port already in use | `docker compose down` then retry, or change port in `docker-compose.yml` |
| `ingested: 0` on `/indices/fetch` or `/stocks/{ticker}/fetch` | vnstock VCI unreachable or no trading day in range | Check internet connectivity; try a wider date range to confirm |
| Kafka topics don't appear in UI | Services still starting | Wait 60 sec after `docker compose up` |
