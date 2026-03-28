# Datasets & EDA findings

## 4 datasets in data/ directory

### 1. dataset_fundamental.csv (240 rows × 18 cols)
- 30 VN tickers × 8 quarters (2023-Q1 to 2024-Q4)
- Key columns: pe_ratio, roe, eps_vnd, debt_to_equity, net_margin, revenue_bn_vnd
- Missing: pb_ratio (5%), dividend_yield (3.3%), book_value_vnd (2.5%)
- EDA insight: PE is right-skewed (skew +1.10), EPS is fat-tailed (kurt +7.41)
- EDA insight: gross_margin ↔ net_margin r=0.848 — use only one as feature
- EDA insight: PE ↔ D/E r=-0.361 — high-debt companies get PE discount
- Outlier rate: EPS 10%, revenue 3.8%, PE 3.3% (IQR method)
- Action: log-transform EPS, normalize PE by sector, forward-fill missing values

### 2. dataset_technical.csv (15,120 rows × 29 cols)
- 30 tickers × 504 trading days, OHLCV + 20 technical indicators
- Generated via Geometric Brownian Motion (realistic price simulation)
- Null pattern: first 200 rows/ticker missing MA200 (warmup period) = 39.5%
- RSI distribution: 10.8% oversold, 78.0% neutral, 11.3% overbought
- MACD: 50.8% bullish, 49.0% bearish (balanced)
- Volume spikes (>2x avg): 7.2% of days
- Daily returns: mean 7.57% annualized, std 40.81% annualized
- Action: drop first 200 rows per ticker, or use NaN-aware features

### 3. dataset_screening.csv (30 rows × 23 cols)
- Snapshot: all 30 stocks with combined fundamental + technical + scores
- composite_score = 0.6 × fundamental_score + 0.4 × technical_score
- Top 3: MSN (8.72), SAB (8.12), PLX (8.04)
- Filter example: PE<15 AND ROE>15% yields 11 stocks (mostly banking)

### 4. dataset_orchestrator.csv (140 rows × 7 cols)
- User queries with labels: fundamental (50), screening (50), technical (40)
- Difficulty: easy (31), medium (55), hard (54)
- 12.1% have attachment metadata
- Includes mixed-intent queries (hard): "phân tích toàn diện cả cơ bản lẫn kỹ thuật"

## Data sources for production
- Fundamental: CafeF, VNDirect API, SSI iBoard
- Technical: Yahoo Finance, TradingView, VNDirect OHLCV
- Orchestrator: user logs + human annotation
