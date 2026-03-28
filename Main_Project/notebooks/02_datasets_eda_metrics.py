"""
=============================================================================
PoC Datasets, EDA & Metrics cho 3 Agent Skills + ML/OPS Orchestrator
=============================================================================

Mục tiêu:
  1. Tạo dataset thực tế cho từng agent (mô phỏng dữ liệu VN stock market)
  2. EDA từng dataset → hiểu phân phối, missing values, correlations
  3. Định nghĩa metrics cho từng agent VÀ cho orchestrator
  4. Tạo dataset huấn luyện cho orchestrator (query routing)

Nguồn dữ liệu tham chiếu (production):
  - VNDirect API, SSI iBoard, CafeF, Vietstock
  - Financial reports từ HOSE/HNX
  - Yahoo Finance (cho international reference)

Trong PoC: Synthetic data mô phỏng sát cấu trúc thực.
=============================================================================
"""

import numpy as np
import pandas as pd
import random
import json
from datetime import datetime, timedelta
from collections import Counter
import warnings
warnings.filterwarnings('ignore')

np.random.seed(42)
random.seed(42)


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  PHẦN 1: DATASET CHO FUNDAMENTAL AGENT                                  ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

print("=" * 70)
print("📊 PHẦN 1: DATASET CHO FUNDAMENTAL AGENT")
print("=" * 70)

# --- 1A. Dataset: Báo cáo tài chính hàng quý ---
# Mô phỏng dữ liệu từ CafeF / VNDirect financial statements

VN_TICKERS = [
    "VNM", "FPT", "VCB", "HPG", "VIC", "MWG", "MSN", "TCB",
    "VHM", "PNJ", "REE", "VRE", "ACB", "BID", "CTG", "GAS",
    "SAB", "VJC", "PLX", "POW", "SSI", "HDB", "TPB", "MBB",
    "STB", "NVL", "VPB", "KDH", "DGC", "GVR"
]

SECTORS = {
    "VNM": "Consumer Staples", "FPT": "Technology", "VCB": "Banking",
    "HPG": "Materials/Steel", "VIC": "Real Estate", "MWG": "Retail",
    "MSN": "Consumer Staples", "TCB": "Banking", "VHM": "Real Estate",
    "PNJ": "Retail/Jewelry", "REE": "Industrials", "VRE": "Real Estate",
    "ACB": "Banking", "BID": "Banking", "CTG": "Banking",
    "GAS": "Energy", "SAB": "Consumer Staples", "VJC": "Airlines",
    "PLX": "Energy", "POW": "Utilities", "SSI": "Financial Services",
    "HDB": "Banking", "TPB": "Banking", "MBB": "Banking",
    "STB": "Banking", "NVL": "Real Estate", "VPB": "Banking",
    "KDH": "Real Estate", "DGC": "Chemicals", "GVR": "Materials/Rubber"
}

SECTOR_PROFILES = {
    "Banking":              {"pe_range": (5, 18),   "roe_range": (0.10, 0.25), "de_range": (5.0, 15.0), "margin_range": (0.25, 0.55)},
    "Technology":           {"pe_range": (12, 30),  "roe_range": (0.15, 0.35), "de_range": (0.2, 1.5),  "margin_range": (0.10, 0.30)},
    "Real Estate":          {"pe_range": (8, 40),   "roe_range": (0.05, 0.20), "de_range": (1.0, 4.0),  "margin_range": (0.15, 0.45)},
    "Consumer Staples":     {"pe_range": (15, 35),  "roe_range": (0.20, 0.45), "de_range": (0.1, 1.0),  "margin_range": (0.25, 0.50)},
    "Materials/Steel":      {"pe_range": (5, 25),   "roe_range": (0.08, 0.25), "de_range": (0.5, 2.5),  "margin_range": (0.08, 0.25)},
    "Retail":               {"pe_range": (10, 30),  "roe_range": (0.12, 0.30), "de_range": (0.3, 2.0),  "margin_range": (0.05, 0.20)},
    "Retail/Jewelry":       {"pe_range": (10, 25),  "roe_range": (0.15, 0.30), "de_range": (0.2, 1.5),  "margin_range": (0.08, 0.18)},
    "Energy":               {"pe_range": (8, 20),   "roe_range": (0.10, 0.25), "de_range": (0.3, 2.0),  "margin_range": (0.10, 0.30)},
    "Industrials":          {"pe_range": (8, 22),   "roe_range": (0.10, 0.22), "de_range": (0.3, 1.8),  "margin_range": (0.10, 0.25)},
    "Airlines":             {"pe_range": (10, 50),  "roe_range": (0.05, 0.25), "de_range": (1.5, 5.0),  "margin_range": (0.03, 0.15)},
    "Utilities":            {"pe_range": (8, 18),   "roe_range": (0.08, 0.18), "de_range": (0.5, 2.5),  "margin_range": (0.10, 0.20)},
    "Financial Services":   {"pe_range": (8, 20),   "roe_range": (0.10, 0.20), "de_range": (1.0, 5.0),  "margin_range": (0.15, 0.40)},
    "Chemicals":            {"pe_range": (6, 18),   "roe_range": (0.12, 0.30), "de_range": (0.2, 1.5),  "margin_range": (0.15, 0.35)},
    "Materials/Rubber":     {"pe_range": (8, 20),   "roe_range": (0.08, 0.20), "de_range": (0.3, 1.5),  "margin_range": (0.10, 0.25)},
}

def generate_fundamental_dataset():
    """
    Tạo dataset báo cáo tài chính cho 30 mã, 8 quý (2 năm).
    Cấu trúc giống dữ liệu từ CafeF / VNDirect.
    """
    rows = []
    quarters = []
    for year in [2023, 2024]:
        for q in [1, 2, 3, 4]:
            quarters.append(f"{year}-Q{q}")

    for ticker in VN_TICKERS:
        sector = SECTORS[ticker]
        profile = SECTOR_PROFILES[sector]

        # Base values cho mỗi mã (tạo tính nhất quán)
        base_revenue = np.random.uniform(2000, 80000)  # tỷ VND
        base_price = np.random.uniform(15000, 120000)   # VND/share
        shares_outstanding = np.random.uniform(300, 5000) # triệu shares

        for i, quarter in enumerate(quarters):
            # Revenue tăng trưởng ngẫu nhiên với trend
            growth = np.random.normal(0.03, 0.08)  # trung bình +3%/quý
            revenue = base_revenue * (1 + growth) ** i
            
            # Các chỉ số tài chính dựa trên sector profile
            gross_margin = np.random.uniform(*profile["margin_range"])
            net_margin = gross_margin * np.random.uniform(0.3, 0.7)
            net_income = revenue * net_margin
            
            eps = net_income / shares_outstanding * 1e6  # VND/share
            pe = np.random.uniform(*profile["pe_range"])
            roe = np.random.uniform(*profile["roe_range"])
            de = np.random.uniform(*profile["de_range"])

            total_equity = net_income / roe if roe > 0 else net_income * 5
            total_debt = total_equity * de
            total_assets = total_equity + total_debt

            book_value = total_equity / shares_outstanding * 1e6
            pb = base_price / book_value if book_value > 0 else np.nan
            
            dividend_yield = np.random.uniform(0, 0.08) if random.random() > 0.3 else 0
            
            # Thêm noise & missing values (thực tế)
            row = {
                "ticker": ticker,
                "sector": sector,
                "quarter": quarter,
                "revenue_bn_vnd": round(revenue, 1),
                "net_income_bn_vnd": round(net_income, 1),
                "gross_margin": round(gross_margin, 4),
                "net_margin": round(net_margin, 4),
                "eps_vnd": round(eps, 0),
                "pe_ratio": round(pe, 2),
                "pb_ratio": round(pb, 2) if not np.isnan(pb) else np.nan,
                "roe": round(roe, 4),
                "debt_to_equity": round(de, 2),
                "total_assets_bn_vnd": round(total_assets, 1),
                "total_equity_bn_vnd": round(total_equity, 1),
                "book_value_vnd": round(book_value, 0),
                "dividend_yield": round(dividend_yield, 4),
                "shares_outstanding_m": round(shares_outstanding, 1),
                "market_cap_bn_vnd": round(base_price * shares_outstanding / 1e6, 1),
            }

            # Inject missing values (5% chance per field, thực tế hơn)
            for key in ["pb_ratio", "dividend_yield", "book_value_vnd"]:
                if random.random() < 0.05:
                    row[key] = np.nan

            rows.append(row)

    return pd.DataFrame(rows)


df_fundamental = generate_fundamental_dataset()

print(f"\n📋 Dataset shape: {df_fundamental.shape}")
print(f"   {df_fundamental.shape[0]} rows × {df_fundamental.shape[1]} columns")
print(f"   Tickers: {df_fundamental['ticker'].nunique()} mã")
print(f"   Quarters: {df_fundamental['quarter'].nunique()} quý")
print(f"   Sectors: {df_fundamental['sector'].nunique()} ngành")

print(f"\n📌 Columns:")
for col in df_fundamental.columns:
    dtype = df_fundamental[col].dtype
    nulls = df_fundamental[col].isnull().sum()
    null_pct = f" ({nulls} nulls = {nulls/len(df_fundamental):.1%})" if nulls > 0 else ""
    print(f"   {col:30s} {str(dtype):10s}{null_pct}")

print(f"\n📊 EDA - Thống kê mô tả (numeric):")
desc = df_fundamental.describe().T[["mean", "std", "min", "25%", "50%", "75%", "max"]]
for idx, row in desc.iterrows():
    if idx in ["ticker", "sector", "quarter"]:
        continue
    print(f"   {idx:30s} mean={row['mean']:12.1f}  std={row['std']:12.1f}  "
          f"min={row['min']:10.1f}  max={row['max']:12.1f}")

print(f"\n📊 EDA - Phân phối theo sector:")
sector_stats = df_fundamental.groupby("sector").agg({
    "pe_ratio": "mean",
    "roe": "mean",
    "debt_to_equity": "mean",
    "net_margin": "mean",
}).round(3)
print(sector_stats.to_string())

print(f"\n📊 EDA - Correlation matrix (key metrics):")
corr_cols = ["pe_ratio", "roe", "debt_to_equity", "net_margin", "eps_vnd", "dividend_yield"]
corr_matrix = df_fundamental[corr_cols].corr().round(3)
print(corr_matrix.to_string())

print(f"\n🎯 METRICS cho Fundamental Agent:")
print("""
   ┌─────────────────────────────────────────────────────────────────┐
   │  Metric                    │ Mô tả                │ Target     │
   ├────────────────────────────┼───────────────────────┼────────────┤
   │  valuation_accuracy        │ Sai số định giá vs    │ MAPE < 15% │
   │                            │ market price          │            │
   │  ratio_completeness        │ % chỉ số tính được    │ > 95%      │
   │                            │ (không null)          │            │
   │  sector_ranking_ndcg       │ Xếp hạng trong ngành  │ NDCG > 0.8 │
   │                            │ có đúng không         │            │
   │  signal_precision          │ BUY/SELL signal có    │ > 70%      │
   │                            │ đúng sau 3 tháng      │            │
   │  latency_p95_ms            │ Thời gian xử lý      │ < 500ms    │
   └─────────────────────────────────────────────────────────────────┘
""")


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  PHẦN 2: DATASET CHO TECHNICAL AGENT                                    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

print("\n" + "=" * 70)
print("📈 PHẦN 2: DATASET CHO TECHNICAL AGENT")
print("=" * 70)

def generate_ohlcv_data(ticker: str, n_days: int = 504):
    """
    Tạo dữ liệu OHLCV (Open, High, Low, Close, Volume) cho 1 mã.
    504 ngày giao dịch ≈ 2 năm.
    Sử dụng Geometric Brownian Motion để mô phỏng giá thực tế.
    """
    # Initial price
    S0 = np.random.uniform(15000, 120000)
    mu = np.random.uniform(-0.0005, 0.001)    # daily drift
    sigma = np.random.uniform(0.015, 0.035)     # daily volatility
    
    # GBM: dS = μSdt + σSdW
    dt = 1
    prices = [S0]
    for _ in range(n_days - 1):
        dW = np.random.normal(0, np.sqrt(dt))
        S_new = prices[-1] * np.exp((mu - 0.5 * sigma**2) * dt + sigma * dW)
        # Floor price & ceiling (thực tế VN: giá sàn/trần ±7%)
        S_new = max(S_new, prices[-1] * 0.93)
        S_new = min(S_new, prices[-1] * 1.07)
        prices.append(S_new)
    
    rows = []
    base_date = datetime(2023, 1, 3)
    trading_day = 0
    
    for i in range(n_days):
        # Skip weekends
        current_date = base_date + timedelta(days=int(trading_day * 7/5))
        while current_date.weekday() >= 5:
            current_date += timedelta(days=1)
        trading_day += 1
        
        close = prices[i]
        # OHLC từ close
        daily_range = close * np.random.uniform(0.005, 0.03)
        open_price = close + np.random.uniform(-daily_range/2, daily_range/2)
        high = max(open_price, close) + np.random.uniform(0, daily_range/2)
        low = min(open_price, close) - np.random.uniform(0, daily_range/2)
        
        # Volume with patterns (higher volume on big moves)
        base_volume = np.random.uniform(500000, 10000000)
        price_change = abs(close - open_price) / open_price
        volume_multiplier = 1 + price_change * 20  # volume spike on big moves
        volume = base_volume * volume_multiplier * np.random.uniform(0.5, 1.5)
        
        rows.append({
            "ticker": ticker,
            "date": current_date.strftime("%Y-%m-%d"),
            "open": round(open_price, 0),
            "high": round(high, 0),
            "low": round(low, 0),
            "close": round(close, 0),
            "volume": int(volume),
        })
    
    return rows


def compute_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Tính các chỉ báo kỹ thuật phổ biến.
    Đây là feature engineering cho Technical Agent.
    """
    df = df.copy()
    close = df["close"]
    
    # Moving Averages
    df["sma_20"] = close.rolling(20).mean().round(0)
    df["sma_50"] = close.rolling(50).mean().round(0)
    df["sma_200"] = close.rolling(200).mean().round(0)
    df["ema_12"] = close.ewm(span=12).mean().round(0)
    df["ema_26"] = close.ewm(span=26).mean().round(0)
    
    # MACD
    df["macd_line"] = (df["ema_12"] - df["ema_26"]).round(2)
    df["macd_signal"] = df["macd_line"].ewm(span=9).mean().round(2)
    df["macd_histogram"] = (df["macd_line"] - df["macd_signal"]).round(2)
    
    # RSI (14-period)
    delta = close.diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / loss
    df["rsi_14"] = (100 - 100 / (1 + rs)).round(2)
    
    # Bollinger Bands (20-period, 2 std)
    df["bb_middle"] = df["sma_20"]
    bb_std = close.rolling(20).std()
    df["bb_upper"] = (df["bb_middle"] + 2 * bb_std).round(0)
    df["bb_lower"] = (df["bb_middle"] - 2 * bb_std).round(0)
    df["bb_width"] = ((df["bb_upper"] - df["bb_lower"]) / df["bb_middle"]).round(4)
    
    # Volume indicators
    df["volume_sma_20"] = df["volume"].rolling(20).mean().round(0)
    df["volume_ratio"] = (df["volume"] / df["volume_sma_20"]).round(2)
    
    # Daily returns & volatility
    df["daily_return"] = close.pct_change().round(6)
    df["volatility_20d"] = df["daily_return"].rolling(20).std().round(6)
    
    # Price position relative to Bollinger Bands
    df["bb_position"] = ((close - df["bb_lower"]) / (df["bb_upper"] - df["bb_lower"])).round(4)
    
    # Golden Cross / Death Cross signals
    df["golden_cross"] = ((df["sma_50"] > df["sma_200"]) & 
                          (df["sma_50"].shift(1) <= df["sma_200"].shift(1))).astype(int)
    df["death_cross"] = ((df["sma_50"] < df["sma_200"]) & 
                         (df["sma_50"].shift(1) >= df["sma_200"].shift(1))).astype(int)
    
    # Support & Resistance (simplified: 20-day low/high)
    df["support_20d"] = df["low"].rolling(20).min().round(0)
    df["resistance_20d"] = df["high"].rolling(20).max().round(0)
    
    return df


# Tạo OHLCV cho tất cả tickers
print("\n⏳ Generating OHLCV data for 30 tickers × 504 days...")
all_ohlcv = []
for ticker in VN_TICKERS:
    rows = generate_ohlcv_data(ticker, n_days=504)
    all_ohlcv.extend(rows)

df_ohlcv = pd.DataFrame(all_ohlcv)
df_ohlcv["date"] = pd.to_datetime(df_ohlcv["date"])

# Tính technical indicators cho mỗi ticker
print("⏳ Computing technical indicators...")
df_technical_list = []
for ticker in VN_TICKERS:
    ticker_df = df_ohlcv[df_ohlcv["ticker"] == ticker].copy().reset_index(drop=True)
    ticker_df = compute_technical_indicators(ticker_df)
    df_technical_list.append(ticker_df)

df_technical = pd.concat(df_technical_list, ignore_index=True)

print(f"\n📋 Dataset shape: {df_technical.shape}")
print(f"   {df_technical.shape[0]} rows × {df_technical.shape[1]} columns")
print(f"   Date range: {df_technical['date'].min().date()} → {df_technical['date'].max().date()}")

print(f"\n📌 Columns ({len(df_technical.columns)}):")
for col in df_technical.columns:
    dtype = df_technical[col].dtype
    nulls = df_technical[col].isnull().sum()
    null_pct = f" ({nulls} nulls = {nulls/len(df_technical):.1%})" if nulls > 0 else ""
    print(f"   {col:25s} {str(dtype):12s}{null_pct}")

# EDA
print(f"\n📊 EDA - Phân phối RSI (across all tickers, non-null):")
rsi_data = df_technical["rsi_14"].dropna()
print(f"   Count: {len(rsi_data)}")
print(f"   Mean: {rsi_data.mean():.1f} | Std: {rsi_data.std():.1f}")
print(f"   Quá bán (RSI < 30): {(rsi_data < 30).sum()} ({(rsi_data < 30).mean():.1%})")
print(f"   Trung tính (30-70):  {((rsi_data >= 30) & (rsi_data <= 70)).sum()} ({((rsi_data >= 30) & (rsi_data <= 70)).mean():.1%})")
print(f"   Quá mua (RSI > 70):  {(rsi_data > 70).sum()} ({(rsi_data > 70).mean():.1%})")

print(f"\n📊 EDA - MACD Signal Distribution:")
macd_data = df_technical["macd_histogram"].dropna()
print(f"   Bullish (histogram > 0): {(macd_data > 0).sum()} ({(macd_data > 0).mean():.1%})")
print(f"   Bearish (histogram < 0): {(macd_data < 0).sum()} ({(macd_data < 0).mean():.1%})")

print(f"\n📊 EDA - Golden/Death Cross Events:")
print(f"   Golden Crosses: {df_technical['golden_cross'].sum()}")
print(f"   Death Crosses:  {df_technical['death_cross'].sum()}")

print(f"\n📊 EDA - Bollinger Band Position (bb_position):")
bb_data = df_technical["bb_position"].dropna()
print(f"   Below lower band (<0): {(bb_data < 0).sum()} ({(bb_data < 0).mean():.1%})")
print(f"   Inside bands (0-1):    {((bb_data >= 0) & (bb_data <= 1)).sum()} ({((bb_data >= 0) & (bb_data <= 1)).mean():.1%})")
print(f"   Above upper band (>1): {(bb_data > 1).sum()} ({(bb_data > 1).mean():.1%})")

print(f"\n📊 EDA - Volume Analysis:")
vol_ratio = df_technical["volume_ratio"].dropna()
print(f"   Avg volume ratio: {vol_ratio.mean():.2f}")
print(f"   Volume spikes (>2x avg): {(vol_ratio > 2).sum()} ({(vol_ratio > 2).mean():.1%})")

print(f"\n📊 EDA - Daily Return Distribution:")
returns = df_technical["daily_return"].dropna()
print(f"   Mean: {returns.mean():.6f} ({returns.mean()*252:.2%} annualized)")
print(f"   Std:  {returns.std():.6f} ({returns.std()*np.sqrt(252):.2%} annualized)")
print(f"   Skewness: {returns.skew():.3f}")
print(f"   Kurtosis: {returns.kurtosis():.3f}")
print(f"   Limit-up days (+7%):  {(returns > 0.065).sum()}")
print(f"   Limit-down days (-7%): {(returns < -0.065).sum()}")

print(f"\n📊 EDA - Correlation (key technical features):")
tech_corr_cols = ["rsi_14", "macd_histogram", "bb_position", "volume_ratio", "volatility_20d", "daily_return"]
tech_corr = df_technical[tech_corr_cols].corr().round(3)
print(tech_corr.to_string())

print(f"\n🎯 METRICS cho Technical Agent:")
print("""
   ┌─────────────────────────────────────────────────────────────────┐
   │  Metric                    │ Mô tả                │ Target     │
   ├────────────────────────────┼───────────────────────┼────────────┤
   │  signal_accuracy           │ Tín hiệu BUY/SELL    │ > 55%      │
   │                            │ đúng sau N ngày       │ (>random)  │
   │  trend_detection_f1        │ Phát hiện uptrend/    │ F1 > 0.65  │
   │                            │ downtrend chính xác   │            │
   │  indicator_coverage        │ % chỉ báo tính được   │ > 90%      │
   │                            │ (đủ data window)      │            │
   │  support_resistance_mae    │ Sai số vùng hỗ trợ/  │ MAE < 3%   │
   │                            │ kháng cự vs thực tế   │ of price   │
   │  pattern_recognition_prec  │ Mẫu hình nến nhận    │ > 60%      │
   │                            │ diện có xảy ra không  │            │
   │  latency_p95_ms            │ Thời gian xử lý      │ < 300ms    │
   └─────────────────────────────────────────────────────────────────┘
""")


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  PHẦN 3: DATASET CHO SCREENING AGENT                                    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

print("\n" + "=" * 70)
print("🔍 PHẦN 3: DATASET CHO SCREENING AGENT")
print("=" * 70)

def generate_screening_dataset():
    """
    Tạo dataset tổng hợp cho screening agent.
    Kết hợp fundamental + technical + market data thành 1 bảng "stock universe".
    Đây là bảng chính mà Screening Agent query/filter.
    """
    rows = []
    
    for ticker in VN_TICKERS:
        sector = SECTORS[ticker]
        profile = SECTOR_PROFILES[sector]
        
        # Latest fundamental data
        pe = np.random.uniform(*profile["pe_range"])
        roe = np.random.uniform(*profile["roe_range"])
        de = np.random.uniform(*profile["de_range"])
        margin = np.random.uniform(*profile["margin_range"])
        
        # Market data
        market_cap = np.random.uniform(5000, 300000)  # tỷ VND
        price = np.random.uniform(10000, 150000)
        
        # Technical summary
        rsi = np.random.uniform(20, 80)
        macd_signal_val = np.random.choice(["BULLISH", "BEARISH", "NEUTRAL"])
        trend = np.random.choice(["UPTREND", "DOWNTREND", "SIDEWAYS"])
        
        # Performance
        return_1m = np.random.normal(0.02, 0.08)
        return_3m = np.random.normal(0.05, 0.15)
        return_6m = np.random.normal(0.10, 0.25)
        return_1y = np.random.normal(0.15, 0.35)
        
        # Quality scores (composite)
        fundamental_score = (roe / 0.3 * 0.4 + (1 - de/5) * 0.3 + margin / 0.5 * 0.3) * 10
        technical_score = ((100 - abs(rsi - 50)) / 100 * 0.5 + 
                          (1 if macd_signal_val == "BULLISH" else 0.3) * 0.5) * 10
        
        # Dividend
        div_yield = np.random.uniform(0, 0.08) if random.random() > 0.25 else 0
        
        # Liquidity
        avg_volume_20d = np.random.uniform(100000, 15000000)
        
        row = {
            "ticker": ticker,
            "sector": sector,
            "price_vnd": round(price, 0),
            "market_cap_bn_vnd": round(market_cap, 1),
            "pe_ratio": round(pe, 2),
            "pb_ratio": round(np.random.uniform(0.5, 5.0), 2),
            "roe": round(roe, 4),
            "debt_to_equity": round(de, 2),
            "gross_margin": round(margin, 4),
            "eps_vnd": round(price / pe, 0),
            "dividend_yield": round(div_yield, 4),
            "rsi_14": round(rsi, 2),
            "macd_signal": macd_signal_val,
            "trend": trend,
            "return_1m": round(return_1m, 4),
            "return_3m": round(return_3m, 4),
            "return_6m": round(return_6m, 4),
            "return_1y": round(return_1y, 4),
            "volatility_ann": round(np.random.uniform(0.15, 0.60), 4),
            "avg_volume_20d": int(avg_volume_20d),
            "fundamental_score": round(min(10, max(0, fundamental_score)), 2),
            "technical_score": round(min(10, max(0, technical_score)), 2),
            "composite_score": round(min(10, max(0, fundamental_score * 0.6 + technical_score * 0.4)), 2),
        }
        
        # Some missing values
        for key in ["dividend_yield", "pb_ratio"]:
            if random.random() < 0.03:
                row[key] = np.nan
        
        rows.append(row)
    
    return pd.DataFrame(rows)


df_screening = generate_screening_dataset()

print(f"\n📋 Dataset shape: {df_screening.shape}")
print(f"   {df_screening.shape[0]} stocks in universe")
print(f"   {df_screening.shape[1]} features per stock")

print(f"\n📌 Columns:")
for col in df_screening.columns:
    dtype = df_screening[col].dtype
    nulls = df_screening[col].isnull().sum()
    null_pct = f" ({nulls} nulls)" if nulls > 0 else ""
    print(f"   {col:25s} {str(dtype):12s}{null_pct}")

print(f"\n📊 EDA - Top 10 by Composite Score:")
top10 = df_screening.nlargest(10, "composite_score")[
    ["ticker", "sector", "composite_score", "fundamental_score", "technical_score", "pe_ratio", "roe"]
]
print(top10.to_string(index=False))

print(f"\n📊 EDA - Sector Breakdown:")
sector_agg = df_screening.groupby("sector").agg({
    "composite_score": "mean",
    "pe_ratio": "mean",
    "return_1y": "mean",
    "ticker": "count"
}).rename(columns={"ticker": "count"}).round(3).sort_values("composite_score", ascending=False)
print(sector_agg.to_string())

print(f"\n📊 EDA - Filter Example: P/E < 15 AND ROE > 15%:")
filtered = df_screening[(df_screening["pe_ratio"] < 15) & (df_screening["roe"] > 0.15)]
print(f"   Số mã thỏa mãn: {len(filtered)}")
if len(filtered) > 0:
    print(filtered[["ticker", "sector", "pe_ratio", "roe", "composite_score"]].to_string(index=False))

print(f"\n📊 EDA - Return Distribution (1-year):")
r1y = df_screening["return_1y"]
print(f"   Mean: {r1y.mean():.2%} | Std: {r1y.std():.2%}")
print(f"   Best:  {df_screening.loc[r1y.idxmax(), 'ticker']} ({r1y.max():.2%})")
print(f"   Worst: {df_screening.loc[r1y.idxmin(), 'ticker']} ({r1y.min():.2%})")

print(f"\n🎯 METRICS cho Screening Agent:")
print("""
   ┌─────────────────────────────────────────────────────────────────┐
   │  Metric                    │ Mô tả                │ Target     │
   ├────────────────────────────┼───────────────────────┼────────────┤
   │  filter_precision          │ Mã lọc ra có đúng    │ > 85%      │
   │                            │ tiêu chí user yêu cầu│            │
   │  ranking_ndcg@10           │ Top 10 gợi ý có khớp │ > 0.75     │
   │                            │ với kỳ vọng expert    │            │
   │  coverage                  │ % universe được scan  │ = 100%     │
   │  comparison_accuracy       │ So sánh A vs B có     │ > 90%      │
   │                            │ chính xác trên tất    │            │
   │                            │ cả tiêu chí           │            │
   │  response_relevance        │ Kết quả có liên quan  │ > 80%      │
   │                            │ đến câu hỏi user      │            │
   │  latency_p95_ms            │ Thời gian xử lý      │ < 800ms    │
   └─────────────────────────────────────────────────────────────────┘
""")


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  PHẦN 4: DATASET CHO ORCHESTRATOR (QUERY ROUTING)                       ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

print("\n" + "=" * 70)
print("🧠 PHẦN 4: DATASET CHO ORCHESTRATOR (QUERY ROUTING)")
print("=" * 70)

def generate_orchestrator_dataset():
    """
    Dataset lớn hơn cho orchestrator training.
    Mỗi mẫu = (query, metadata, correct_agent, difficulty).
    
    Metadata bao gồm:
    - has_attachment: user có đính kèm file không
    - query_length: độ dài câu hỏi
    - mentioned_tickers: số mã cổ phiếu được nhắc
    - intent_keywords: từ khóa phân loại
    """
    
    templates = {
        "fundamental": [
            "Chỉ số {metric} của {ticker} hiện tại là bao nhiêu?",
            "Phân tích báo cáo tài chính quý {q} của {ticker}",
            "{metric} của {ticker} so với ngành {sector} như thế nào?",
            "Tỷ lệ {metric} tăng trưởng của {ticker} trong {n} năm qua",
            "Doanh thu và lợi nhuận ròng của {ticker} quý vừa rồi",
            "{ticker} có đang bị định giá cao không? Xét {metric}",
            "Xem báo cáo kết quả kinh doanh của {ticker}",
            "Phân tích sức khỏe tài chính của {ticker} dựa trên balance sheet",
            "Cash flow từ hoạt động kinh doanh của {ticker} ra sao?",
            "Tỷ suất cổ tức dividend yield của {ticker} có hấp dẫn không?",
            "So sánh {metric} của {ticker} qua các quý gần đây",
            "Đánh giá giá trị nội tại {ticker} bằng phương pháp DCF",
            "Income statement {ticker} cho thấy xu hướng gì?",
            "{ticker} có nợ nhiều không? Debt to equity bao nhiêu?",
            "Biên lợi nhuận gross margin của {ticker} đang tăng hay giảm?",
        ],
        "technical": [
            "RSI của {ticker} đang ở vùng quá mua hay quá bán?",
            "MACD của {ticker} cho tín hiệu gì hiện tại?",
            "Đường MA50 và MA200 của {ticker} đang thế nào?",
            "Xu hướng giá {ticker} trong {n} tháng gần đây",
            "Vùng hỗ trợ kháng cự của {ticker} ở đâu?",
            "Biểu đồ nến {ticker} tuần này có mẫu hình gì?",
            "Khối lượng giao dịch {ticker} có tăng đột biến?",
            "Bollinger Bands của {ticker} đang co hẹp hay mở rộng?",
            "Điểm entry mua {ticker} theo phân tích kỹ thuật",
            "Stochastic oscillator của {ticker} cho tín hiệu gì?",
            "{ticker} có đang breakout khỏi vùng tích lũy không?",
            "EMA {n} ngày của {ticker} trending up hay down?",
            "Volume profile {ticker} cho thấy vùng giá nào quan trọng?",
            "Phân tích chart pattern {ticker} - double top/bottom?",
            "Fibonacci retracement cho {ticker} ở mức nào?",
        ],
        "screening": [
            "Lọc top {n} cổ phiếu có {metric} tốt nhất sàn HOSE",
            "So sánh {ticker} và {ticker2} - mã nào tốt hơn?",
            "Tìm cổ phiếu ngành {sector} có ROE trên {n}%",
            "Gợi ý {n} cổ phiếu tốt nhất để đầu tư dài hạn",
            "Xếp hạng cổ phiếu ngành {sector} theo vốn hóa",
            "Danh sách cổ phiếu có cổ tức cao nhất năm nay",
            "Cổ phiếu nào ngành {sector} đáng mua nhất?",
            "So sánh hiệu suất các mã trong VN30",
            "Filter cổ phiếu market cap trên {n} nghìn tỷ",
            "Recommend cổ phiếu phù hợp cho người mới",
            "Tìm cổ phiếu penny stock tiềm năng tăng giá",
            "Đề xuất portfolio {n} mã cho ngân sách {n2} triệu",
            "Top cổ phiếu tăng giá mạnh nhất tháng qua",
            "Sàng lọc cổ phiếu theo tiêu chí value investing",
            "Những mã nào ngành {sector} có PE thấp nhất?",
        ],
        "mixed_fundamental_technical": [
            "{ticker} vừa ra báo cáo tốt, chart có ủng hộ mua không?",
            "Phân tích toàn diện {ticker}: cả cơ bản lẫn kỹ thuật",
            "{ticker} PE thấp nhưng RSI cao, nên xử lý thế nào?",
        ],
        "mixed_screening_fundamental": [
            "Tìm mã ngành {sector} có fundamental tốt nhất để phân tích sâu",
            "Lọc cổ phiếu giá trị rồi phân tích báo cáo tài chính từng mã",
        ],
    }
    
    metrics = ["P/E", "ROE", "EPS", "P/B", "Debt/Equity", "Revenue Growth", "Net Margin"]
    sectors_list = list(set(SECTORS.values()))
    
    dataset = []
    
    for agent_type, tmpls in templates.items():
        n_samples = 40 if "mixed" not in agent_type else 10
        
        for _ in range(n_samples):
            tmpl = random.choice(tmpls)
            
            ticker = random.choice(VN_TICKERS)
            ticker2 = random.choice([t for t in VN_TICKERS if t != ticker])
            metric = random.choice(metrics)
            sector = random.choice(sectors_list)
            q = random.choice([1, 2, 3, 4])
            n = random.choice([3, 5, 6, 10, 12, 20, 50, 100, 200])
            n2 = random.choice([50, 100, 200, 500, 1000])
            
            query = tmpl.format(
                ticker=ticker, ticker2=ticker2, metric=metric,
                sector=sector, q=q, n=n, n2=n2
            )
            
            # Determine primary agent for mixed queries
            if "mixed" in agent_type:
                primary = agent_type.split("_")[1]  # first agent in mix
                difficulty = "hard"
            else:
                primary = agent_type
                difficulty = random.choice(["easy", "medium", "medium", "hard"])
            
            # Count mentioned tickers
            mentioned = sum(1 for t in VN_TICKERS if t in query)
            
            has_attachment = random.random() < 0.15  # 15% có đính kèm
            attachment_type = random.choice(["pdf", "xlsx", "csv", None]) if has_attachment else None
            
            dataset.append({
                "query": query,
                "correct_agent": primary,
                "difficulty": difficulty,
                "query_length": len(query),
                "mentioned_tickers": mentioned,
                "has_attachment": has_attachment,
                "attachment_type": attachment_type,
            })
    
    random.shuffle(dataset)
    return pd.DataFrame(dataset)


df_orchestrator = generate_orchestrator_dataset()

print(f"\n📋 Dataset shape: {df_orchestrator.shape}")

print(f"\n📊 EDA - Agent Distribution:")
agent_dist = df_orchestrator["correct_agent"].value_counts()
for agent, count in agent_dist.items():
    print(f"   {agent:20s}: {count:4d} ({count/len(df_orchestrator):.1%})")

print(f"\n📊 EDA - Difficulty Distribution:")
diff_dist = df_orchestrator["difficulty"].value_counts()
for diff, count in diff_dist.items():
    print(f"   {diff:10s}: {count:4d} ({count/len(df_orchestrator):.1%})")

print(f"\n📊 EDA - Query Length Stats:")
ql = df_orchestrator["query_length"]
print(f"   Mean: {ql.mean():.0f} chars | Std: {ql.std():.0f}")
print(f"   Min: {ql.min()} | Max: {ql.max()}")

print(f"\n📊 EDA - Attachment Distribution:")
att_dist = df_orchestrator["has_attachment"].value_counts()
print(f"   With attachment: {att_dist.get(True, 0)} ({att_dist.get(True, 0)/len(df_orchestrator):.1%})")
print(f"   Without:         {att_dist.get(False, 0)} ({att_dist.get(False, 0)/len(df_orchestrator):.1%})")

print(f"\n📊 EDA - Mentioned Tickers per Query:")
mt = df_orchestrator["mentioned_tickers"]
print(f"   0 tickers: {(mt == 0).sum()} | 1 ticker: {(mt == 1).sum()} | 2+: {(mt >= 2).sum()}")

print(f"\n📊 EDA - Cross-tab: Agent × Difficulty:")
ct = pd.crosstab(df_orchestrator["correct_agent"], df_orchestrator["difficulty"])
print(ct.to_string())

print(f"\n📊 EDA - Sample Queries (5 per agent):")
for agent in df_orchestrator["correct_agent"].unique():
    print(f"\n   [{agent.upper()}]")
    samples = df_orchestrator[df_orchestrator["correct_agent"] == agent].sample(min(5, len(df_orchestrator[df_orchestrator["correct_agent"] == agent])))
    for _, row in samples.iterrows():
        diff_marker = {"easy": "🟢", "medium": "🟡", "hard": "🔴"}.get(row["difficulty"], "⚪")
        print(f"   {diff_marker} {row['query'][:80]}")

print(f"\n🎯 METRICS cho ML/OPS Orchestrator:")
print("""
   ┌─────────────────────────────────────────────────────────────────────┐
   │  Metric                      │ Mô tả              │ Target         │
   ├──────────────────────────────┼─────────────────────┼────────────────┤
   │  routing_accuracy            │ % chọn đúng agent   │ > 85%          │
   │  routing_accuracy_by_diff    │ Accuracy theo mức   │ easy>95%       │
   │                              │ difficulty           │ hard>70%       │
   │  cumulative_reward           │ Tổng reward trung   │ Tăng monotonic │
   │                              │ bình per episode     │                │
   │  convergence_episode         │ Episode đạt 85%     │ < 200 episodes │
   │                              │ accuracy lần đầu    │                │
   │  exploration_efficiency      │ Reward gained per   │ Cao hơn random │
   │                              │ exploration step     │ 3x sau 100 ep │
   │  q_value_stability           │ Variance Q-values   │ Giảm dần       │
   │                              │ trong 50 ep cuối    │                │
   │  multi_agent_precision       │ Với mixed queries,  │ > 60%          │
   │                              │ chọn agent chính    │                │
   │                              │ đúng                │                │
   │  end_to_end_latency_p95     │ Tổng thời gian từ   │ < 2 seconds    │
   │                              │ query → response    │                │
   └─────────────────────────────────────────────────────────────────────┘
""")


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  PHẦN 5: TỔNG HỢP - DATASET SUMMARY & EXPORT                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

print("\n" + "=" * 70)
print("📦 PHẦN 5: TỔNG HỢP DATASET")
print("=" * 70)

summary = f"""
┌──────────────────────────────────────────────────────────────────────────┐
│                        DATASET SUMMARY                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. FUNDAMENTAL DATASET                                                  │
│     Shape:    {df_fundamental.shape[0]:>6d} rows × {df_fundamental.shape[1]:>2d} cols                                  │
│     Content:  Quarterly financial reports (30 tickers × 8 quarters)      │
│     Key cols: PE, ROE, EPS, D/E, margins, revenue, net income           │
│     Nulls:    ~5% in pb_ratio, dividend_yield, book_value               │
│     Use:      Training data for Fundamental Agent                        │
│                                                                          │
│  2. TECHNICAL DATASET (OHLCV + Indicators)                               │
│     Shape:    {df_technical.shape[0]:>6d} rows × {df_technical.shape[1]:>2d} cols                                  │
│     Content:  Daily OHLCV + 20 technical indicators (30 tickers × 504d) │
│     Key cols: OHLCV, SMA, EMA, MACD, RSI, Bollinger, volume ratio      │
│     Nulls:    First 200 rows per ticker (warmup period for MA200)       │
│     Use:      Training data for Technical Agent                          │
│                                                                          │
│  3. SCREENING DATASET (Stock Universe)                                   │
│     Shape:    {df_screening.shape[0]:>6d} rows × {df_screening.shape[1]:>2d} cols                                  │
│     Content:  Snapshot of all 30 stocks with combined metrics            │
│     Key cols: All fundamental + technical + scores + returns             │
│     Nulls:    ~3% in dividend_yield, pb_ratio                           │
│     Use:      Reference data for Screening Agent                         │
│                                                                          │
│  4. ORCHESTRATOR DATASET (Query Routing)                                 │
│     Shape:    {df_orchestrator.shape[0]:>6d} rows × {df_orchestrator.shape[1]:>2d} cols                                  │
│     Content:  User queries with correct agent labels                     │
│     Key cols: query, correct_agent, difficulty, metadata                 │
│     Nulls:    None (clean)                                              │
│     Use:      Training RL orchestrator to route queries                  │
│                                                                          │
│  TOTAL: {df_fundamental.shape[0] + df_technical.shape[0] + df_screening.shape[0] + df_orchestrator.shape[0]:>6d} rows across 4 datasets                                │
└──────────────────────────────────────────────────────────────────────────┘
"""
print(summary)

# Export datasets to CSV
print("💾 Exporting datasets...")
df_fundamental.to_csv("/home/claude/dataset_fundamental.csv", index=False)
df_technical.to_csv("/home/claude/dataset_technical.csv", index=False)
df_screening.to_csv("/home/claude/dataset_screening.csv", index=False)
df_orchestrator.to_csv("/home/claude/dataset_orchestrator.csv", index=False)
print("   ✅ dataset_fundamental.csv")
print("   ✅ dataset_technical.csv")
print("   ✅ dataset_screening.csv")
print("   ✅ dataset_orchestrator.csv")


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  PHẦN 6: CHẠY THỬ ORCHESTRATOR VỚI DATASET MỚI                        ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

print("\n" + "=" * 70)
print("🚀 PHẦN 6: HUẤN LUYỆN ORCHESTRATOR VỚI DATASET ĐẦY ĐỦ")
print("=" * 70)

# Import orchestrator từ PoC trước
# (inline lại để self-contained)

class QLearningOrchestratorV2:
    """
    Version 2: Hỗ trợ dataset mới với metadata features.
    """
    
    def __init__(self, n_states=81, n_actions=3, lr=0.15, gamma=0.9,
                 eps_start=1.0, eps_end=0.01, eps_decay=0.995):
        self.n_states = n_states
        self.n_actions = n_actions
        self.lr = lr
        self.gamma = gamma
        self.epsilon = eps_start
        self.eps_end = eps_end
        self.eps_decay = eps_decay
        self.q_table = np.zeros((n_states, n_actions))
        self.history = {"rewards": [], "accuracies": [], "epsilons": []}
    
    def _extract_state(self, query: str, metadata: dict = None) -> int:
        """
        Feature extraction: query → discrete state.
        
        Features:
          f1: fundamental keyword score (0-2)
          f2: technical keyword score (0-2)
          f3: screening keyword score (0-2)
          f4: has_attachment (0-1)
        
        State space: 3 × 3 × 3 × 2 = 54 (hợp lý cho Q-table)
        Tuy nhiên để đơn giản, ta dùng 3^3 = 27 + metadata bonus
        """
        fund_kw = ["P/E", "PE", "ROE", "EPS", "doanh thu", "lợi nhuận", "revenue",
                    "báo cáo", "tài chính", "cổ tức", "dividend", "nội tại", "DCF",
                    "margin", "nợ", "debt", "equity", "balance", "income", "cash flow",
                    "định giá", "valuation", "fundamental", "book value"]
        
        tech_kw = ["RSI", "MACD", "MA", "SMA", "EMA", "Bollinger", "xu hướng",
                   "trend", "support", "resistance", "hỗ trợ", "kháng cự",
                   "nến", "candlestick", "chart", "biểu đồ", "volume",
                   "breakout", "momentum", "stochastic", "entry", "exit",
                   "technical", "fibonacci", "pattern"]
        
        screen_kw = ["lọc", "sàng lọc", "screen", "filter", "so sánh", "compare",
                     "top", "best", "tốt nhất", "xếp hạng", "ranking", "danh sách",
                     "list", "tìm", "search", "find", "gợi ý", "đề xuất",
                     "recommend", "nào", "which", "portfolio"]
        
        q_lower = query.lower()
        
        def score(keywords):
            matches = sum(1 for kw in keywords if kw.lower() in q_lower)
            if matches == 0: return 0
            elif matches <= 2: return 1
            else: return 2
        
        f1, f2, f3 = score(fund_kw), score(tech_kw), score(screen_kw)
        
        # Metadata bonus
        has_att = 1 if (metadata and metadata.get("has_attachment")) else 0
        
        state = f1 * 18 + f2 * 6 + f3 * 2 + has_att
        return min(state, self.n_states - 1)
    
    def select_action(self, state, training=True):
        if training and random.random() < self.epsilon:
            return random.randint(0, self.n_actions - 1)
        return int(np.argmax(self.q_table[state]))
    
    def update(self, s, a, r, s_next):
        td_target = r + self.gamma * np.max(self.q_table[s_next])
        self.q_table[s, a] += self.lr * (td_target - self.q_table[s, a])
    
    def train(self, df: pd.DataFrame, n_episodes=500):
        agent_map = {"fundamental": 0, "technical": 1, "screening": 2}
        agent_names = ["fundamental", "technical", "screening"]
        
        print(f"\n   Training on {len(df)} queries × {n_episodes} episodes...")
        print(f"   State space: {self.n_states} | Action space: {self.n_actions}")
        
        for ep in range(n_episodes):
            shuffled = df.sample(frac=1).reset_index(drop=True)
            ep_reward = 0
            correct = 0
            
            for idx, row in shuffled.iterrows():
                state = self._extract_state(row["query"], {
                    "has_attachment": row.get("has_attachment", False)
                })
                
                action = self.select_action(state, training=True)
                chosen = agent_names[action]
                correct_agent = row["correct_agent"]
                
                # Reward
                if chosen == correct_agent:
                    reward = 1.0
                    if row.get("difficulty") == "hard":
                        reward += 0.5  # bonus cho hard queries
                    correct += 1
                else:
                    reward = -0.5
                    if row.get("difficulty") == "easy":
                        reward -= 0.3  # extra penalty cho easy miss
                
                # Next state
                next_idx = (idx + 1) % len(shuffled)
                next_row = shuffled.iloc[next_idx]
                next_state = self._extract_state(next_row["query"], {
                    "has_attachment": next_row.get("has_attachment", False)
                })
                
                self.update(state, action, reward, next_state)
                ep_reward += reward
            
            self.epsilon = max(self.eps_end, self.epsilon * self.eps_decay)
            acc = correct / len(shuffled)
            self.history["rewards"].append(ep_reward)
            self.history["accuracies"].append(acc)
            self.history["epsilons"].append(self.epsilon)
            
            if ep % 100 == 0:
                print(f"   Ep {ep:4d} | Reward: {ep_reward:8.1f} | "
                      f"Acc: {acc:.1%} | ε: {self.epsilon:.4f}")
        
        print(f"\n   ✅ Final accuracy: {self.history['accuracies'][-1]:.1%}")
        return self.history
    
    def evaluate(self, df: pd.DataFrame) -> dict:
        agent_names = ["fundamental", "technical", "screening"]
        results = {"correct": 0, "total": 0, "by_agent": {}, "by_diff": {}, "errors": []}
        
        for _, row in df.iterrows():
            state = self._extract_state(row["query"], {
                "has_attachment": row.get("has_attachment", False)
            })
            action = self.select_action(state, training=False)
            chosen = agent_names[action]
            correct_agent = row["correct_agent"]
            diff = row.get("difficulty", "unknown")
            
            is_correct = chosen == correct_agent
            results["total"] += 1
            if is_correct:
                results["correct"] += 1
            else:
                results["errors"].append({
                    "query": row["query"][:60],
                    "expected": correct_agent,
                    "got": chosen,
                    "difficulty": diff,
                })
            
            # By agent
            if correct_agent not in results["by_agent"]:
                results["by_agent"][correct_agent] = {"correct": 0, "total": 0}
            results["by_agent"][correct_agent]["total"] += 1
            if is_correct:
                results["by_agent"][correct_agent]["correct"] += 1
            
            # By difficulty
            if diff not in results["by_diff"]:
                results["by_diff"][diff] = {"correct": 0, "total": 0}
            results["by_diff"][diff]["total"] += 1
            if is_correct:
                results["by_diff"][diff]["correct"] += 1
        
        results["accuracy"] = results["correct"] / results["total"]
        return results


# Train/test split
train_df = df_orchestrator.sample(frac=0.8, random_state=42)
test_df = df_orchestrator.drop(train_df.index)

print(f"\n   Train: {len(train_df)} | Test: {len(test_df)}")

orchestrator_v2 = QLearningOrchestratorV2(
    n_states=81, n_actions=3,
    lr=0.15, gamma=0.9,
    eps_start=1.0, eps_end=0.01, eps_decay=0.995
)

history = orchestrator_v2.train(train_df, n_episodes=500)

# Evaluate
print("\n" + "-" * 50)
print("📈 EVALUATION RESULTS")
print("-" * 50)

eval_results = orchestrator_v2.evaluate(test_df)

print(f"\n   Overall Accuracy: {eval_results['accuracy']:.1%} "
      f"({eval_results['correct']}/{eval_results['total']})")

print(f"\n   Accuracy by Agent:")
for agent, stats in eval_results["by_agent"].items():
    acc = stats["correct"] / stats["total"] if stats["total"] > 0 else 0
    print(f"     {agent:15s}: {acc:.1%} ({stats['correct']}/{stats['total']})")

print(f"\n   Accuracy by Difficulty:")
for diff, stats in sorted(eval_results["by_diff"].items()):
    acc = stats["correct"] / stats["total"] if stats["total"] > 0 else 0
    bar = "█" * int(acc * 20)
    print(f"     {diff:10s}: {acc:.1%} ({stats['correct']:2d}/{stats['total']:2d}) {bar}")

if eval_results["errors"]:
    print(f"\n   ❌ Misclassified ({len(eval_results['errors'])} errors):")
    for err in eval_results["errors"][:10]:
        print(f"     [{err['difficulty']:6s}] Expected: {err['expected']:13s} "
              f"Got: {err['got']:13s} | {err['query']}")

# Training convergence analysis
print(f"\n📊 CONVERGENCE ANALYSIS:")
accs = history["accuracies"]
for threshold in [0.7, 0.8, 0.85, 0.9]:
    ep = next((i for i, a in enumerate(accs) if a >= threshold), None)
    if ep is not None:
        print(f"   Reached {threshold:.0%} accuracy at episode {ep}")
    else:
        print(f"   Never reached {threshold:.0%} accuracy")

print(f"\n   Last 50 episodes:")
print(f"     Avg accuracy:  {np.mean(accs[-50:]):.1%} ± {np.std(accs[-50:]):.1%}")
print(f"     Avg reward:    {np.mean(history['rewards'][-50:]):.1f} ± {np.std(history['rewards'][-50:]):.1f}")
print(f"     Final epsilon: {history['epsilons'][-1]:.4f}")
