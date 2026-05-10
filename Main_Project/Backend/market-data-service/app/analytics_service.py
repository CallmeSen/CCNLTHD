"""
Portfolio Analytics Service — Modern Portfolio Theory (MPT) + CAPM
==================================================================
Implements the five core financial calculation groups:

1. Portfolio Expected Return  E(Rp) = Σ wi * E(Ri)
2. Portfolio Volatility       σp    = sqrt(w' Σ w)
3. Sharpe Ratio               S     = (Rp - Rf) / σp
4. Beta (CAPM)                β     = Cov(Rp, Rm) / Var(Rm)
5. Markowitz Rebalancing Optimization (Max-Sharpe via scipy.optimize)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sqlalchemy.orm import Session

from app.models import StockPrice

logger = logging.getLogger(__name__)

# ─── Constants ───────────────────────────────────────────────────────────────

TRADING_DAYS_PER_YEAR: int = 252
# VN government 10-year bond yield (annualised) used as risk-free rate
DEFAULT_RISK_FREE_RATE: float = 0.03
MARKET_TICKER: str = "VNINDEX"

# ─── Helper: fetch close-price series ────────────────────────────────────────


def _fetch_close_series(db: Session, ticker: str, lookback_days: int) -> pd.Series:
    """Return a daily close-price Series for *ticker* going back *lookback_days* calendar days."""
    cutoff = datetime.utcnow() - timedelta(days=lookback_days)
    rows = (
        db.query(StockPrice.timestamp, StockPrice.close)
        .filter(
            StockPrice.ticker == ticker.upper(),
            StockPrice.interval == "1D",
            StockPrice.timestamp >= cutoff,
        )
        .order_by(StockPrice.timestamp.asc())
        .all()
    )
    if not rows:
        return pd.Series(dtype=float, name=ticker)
    dates = [r.timestamp for r in rows]
    closes = [float(r.close) for r in rows]
    return pd.Series(closes, index=pd.DatetimeIndex(dates), name=ticker)


def _build_returns_matrix(
    db: Session,
    tickers: list[str],
    lookback_days: int,
) -> pd.DataFrame:
    """
    Build a DataFrame of daily log-returns for all tickers.
    Tickers with fewer than 20 observations are dropped.
    """
    series_list: list[pd.Series] = []
    for t in tickers:
        s = _fetch_close_series(db, t, lookback_days)
        if len(s) >= 20:
            series_list.append(np.log(s / s.shift(1)).rename(t))
        else:
            logger.warning("Insufficient price history for %s (%d rows) – skipped", t, len(s))

    if not series_list:
        return pd.DataFrame()

    returns = pd.concat(series_list, axis=1).dropna()
    return returns


# ─── Core MPT Calculations ───────────────────────────────────────────────────


def compute_portfolio_metrics(
    db: Session,
    holdings: list[dict],          # [{ticker, quantity, avg_price}]
    risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
    lookback_days: int = 365,
    market_ticker: str = MARKET_TICKER,
) -> dict:
    """
    Main entry point.  Returns a dict with all MPT metrics + rebalancing actions.

    holdings  – list of {ticker, quantity, avg_price} from the portfolio service.
    """
    if not holdings:
        return _empty_result()

    tickers = [h["ticker"].upper() for h in holdings]
    quantities = [float(h.get("quantity", 0)) for h in holdings]
    avg_prices = [float(h.get("avg_price", 0)) for h in holdings]

    # ── 1. Current values & weights ──────────────────────────────────────────
    # Attempt to get latest close price from DB; fall back to avg_price.
    current_prices = []
    for t in tickers:
        row = (
            db.query(StockPrice.close)
            .filter(StockPrice.ticker == t, StockPrice.interval == "1D")
            .order_by(StockPrice.timestamp.desc())
            .first()
        )
        current_prices.append(float(row.close) if row else avg_prices[tickers.index(t)])

    values = np.array([q * p for q, p in zip(quantities, current_prices)], dtype=float)
    total_value = float(values.sum())

    if total_value <= 0:
        return _empty_result()

    weights = values / total_value                     # numpy array, sums to 1

    # ── 2. Historical returns matrix ─────────────────────────────────────────
    returns_df = _build_returns_matrix(db, tickers, lookback_days)

    if returns_df.empty or returns_df.shape[0] < 5:
        # Fall back to deterministic estimates when no historical data exists
        return _fallback_metrics(
            tickers=tickers,
            weights=weights,
            quantities=quantities,
            current_prices=current_prices,
            avg_prices=avg_prices,
            total_value=total_value,
            risk_free_rate=risk_free_rate,
        )

    # Keep only tickers for which we have return data
    available = [t for t in tickers if t in returns_df.columns]
    if not available:
        return _fallback_metrics(
            tickers=tickers,
            weights=weights,
            quantities=quantities,
            current_prices=current_prices,
            avg_prices=avg_prices,
            total_value=total_value,
            risk_free_rate=risk_free_rate,
        )

    # Re-align weights to available tickers only
    idx_map = {t: i for i, t in enumerate(tickers)}
    avail_weights = np.array([weights[idx_map[t]] for t in available], dtype=float)
    if avail_weights.sum() > 0:
        avail_weights = avail_weights / avail_weights.sum()

    ret = returns_df[available]

    # ── Formula 1: Portfolio Expected Return ─────────────────────────────────
    #   E(Rp) = Σ wi * E(Ri)   (annualised from daily mean)
    mean_daily = ret.mean()                                   # Series
    expected_returns_annual = mean_daily * TRADING_DAYS_PER_YEAR  # annualised
    portfolio_expected_return = float(np.dot(avail_weights, expected_returns_annual.values))

    # ── Formula 2: Portfolio Volatility ──────────────────────────────────────
    #   σp = sqrt(w' Σ w)
    cov_matrix = ret.cov() * TRADING_DAYS_PER_YEAR           # annualised covariance
    portfolio_variance = float(avail_weights @ cov_matrix.values @ avail_weights)
    portfolio_volatility = float(np.sqrt(max(portfolio_variance, 0.0)))

    # ── Formula 3: Sharpe Ratio ───────────────────────────────────────────────
    #   S = (Rp - Rf) / σp
    sharpe = (
        (portfolio_expected_return - risk_free_rate) / portfolio_volatility
        if portfolio_volatility > 1e-9
        else 0.0
    )

    # ── Formula 4: Beta (CAPM) ───────────────────────────────────────────────
    #   β = Cov(Rp, Rm) / Var(Rm)
    beta = _compute_beta(db, avail_weights, ret, available, lookback_days, market_ticker)

    # ── P&L ──────────────────────────────────────────────────────────────────
    cost_basis = float(sum(q * a for q, a in zip(quantities, avg_prices)))
    pnl_vnd = total_value - cost_basis

    # ── Per-ticker metrics ────────────────────────────────────────────────────
    metrics_per_ticker = []
    for i, t in enumerate(tickers):
        cp = current_prices[i]
        ap = avg_prices[i]
        qty = quantities[i]
        w = float(weights[i])
        if t in expected_returns_annual:
            er = float(expected_returns_annual[t])
            vol = float(ret[t].std() * np.sqrt(TRADING_DAYS_PER_YEAR)) if t in ret else 0.0
        else:
            er, vol = 0.0, 0.0
        metrics_per_ticker.append({
            "ticker": t,
            "quantity": int(qty),
            "avg_price": ap,
            "current_price": cp,
            "market_value": float(qty * cp),
            "weight": round(w * 100, 2),
            "pnl_pct": round(((cp - ap) / ap * 100) if ap > 0 else 0.0, 2),
            "expected_return_annual_pct": round(er * 100, 2),
            "volatility_annual_pct": round(vol * 100, 2),
        })

    # ── Formula 5: Rebalancing Optimization (Max-Sharpe) ─────────────────────
    rebalance_actions = _compute_rebalancing(
        tickers=available,
        current_weights=avail_weights,
        expected_returns=expected_returns_annual.values,
        cov_matrix=cov_matrix.values,
        risk_free_rate=risk_free_rate,
        quantities=quantities,
        current_prices=current_prices,
        total_value=total_value,
        idx_map=idx_map,
    )

    return {
        "total_value_vnd": round(total_value, 2),
        "total_pnl_vnd": round(pnl_vnd, 2),
        "expected_return_annual_pct": round(portfolio_expected_return * 100, 2),
        "volatility_annual_pct": round(portfolio_volatility * 100, 2),
        "sharpe_ratio": round(sharpe, 4),
        "beta": round(beta, 4),
        "risk_free_rate_pct": round(risk_free_rate * 100, 2),
        "metrics_per_ticker": metrics_per_ticker,
        "rebalance_actions": rebalance_actions,
    }


# ─── Beta Calculation ─────────────────────────────────────────────────────────


def _compute_beta(
    db: Session,
    weights: np.ndarray,
    portfolio_returns: pd.DataFrame,
    available_tickers: list[str],
    lookback_days: int,
    market_ticker: str,
) -> float:
    """
    β = Cov(Rp, Rm) / Var(Rm)

    Rp  = weighted sum of individual stock returns
    Rm  = VN-Index daily log-returns
    """
    market_series = _fetch_close_series(db, market_ticker, lookback_days)
    if len(market_series) < 5:
        logger.info("No VN-Index data; returning beta=1.0")
        return 1.0

    rm = np.log(market_series / market_series.shift(1)).dropna()
    rm.name = "market"

    rp_series = portfolio_returns.dot(weights)              # daily portfolio return
    rp_series.name = "portfolio"

    combined = pd.concat([rp_series, rm], axis=1).dropna()
    if len(combined) < 5:
        return 1.0

    cov_pm = combined["portfolio"].cov(combined["market"])
    var_m = combined["market"].var()
    return float(cov_pm / var_m) if var_m > 1e-12 else 1.0


# ─── Markowitz Max-Sharpe Optimization ───────────────────────────────────────


def _compute_rebalancing(
    tickers: list[str],
    current_weights: np.ndarray,
    expected_returns: np.ndarray,     # annualised
    cov_matrix: np.ndarray,           # annualised
    risk_free_rate: float,
    quantities: list[float],
    current_prices: list[float],
    total_value: float,
    idx_map: dict[str, int],
) -> list[dict]:
    """
    Runs Markowitz Max-Sharpe optimisation to find target weights, then
    computes the delta (buy/sell actions) to move from current to target.
    """
    n = len(tickers)
    if n < 2:
        return []

    def neg_sharpe(w: np.ndarray) -> float:
        rp = float(np.dot(w, expected_returns))
        vp = float(w @ cov_matrix @ w)
        sp = (rp - risk_free_rate) / np.sqrt(max(vp, 1e-12))
        return -sp

    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}]
    bounds = [(0.0, 1.0)] * n
    w0 = np.ones(n) / n                                     # equal-weight start

    try:
        result = minimize(
            neg_sharpe,
            w0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
            options={"maxiter": 500, "ftol": 1e-9},
        )
        target_weights = result.x if result.success else w0
    except Exception as exc:
        logger.warning("Optimisation failed: %s – using equal weights", exc)
        target_weights = w0

    # Round tiny weights to zero (< 1%)
    target_weights = np.where(target_weights < 0.01, 0.0, target_weights)
    if target_weights.sum() > 0:
        target_weights = target_weights / target_weights.sum()

    actions: list[dict] = []
    for i, ticker in enumerate(tickers):
        orig_idx = idx_map.get(ticker, i)
        cp = current_prices[orig_idx] if orig_idx < len(current_prices) else 0.0
        qty_now = quantities[orig_idx] if orig_idx < len(quantities) else 0.0

        cw = float(current_weights[i])
        tw = float(target_weights[i])
        delta_weight = tw - cw

        # Only suggest action if delta > 2% of portfolio
        if abs(delta_weight) < 0.02:
            continue

        target_value = total_value * tw
        qty_target = int(target_value / cp) if cp > 0 else 0
        qty_delta = qty_target - int(qty_now)

        if qty_delta == 0:
            continue

        actions.append({
            "ticker": ticker,
            "current_weight_pct": round(cw * 100, 2),
            "target_weight_pct": round(tw * 100, 2),
            "delta_weight_pct": round(delta_weight * 100, 2),
            "action": "BUY" if qty_delta > 0 else "SELL",
            "quantity_delta": qty_delta,
            "current_price": cp,
            "estimated_transaction_vnd": round(abs(qty_delta) * cp, 0),
        })

    return sorted(actions, key=lambda x: abs(x["delta_weight_pct"]), reverse=True)


# ─── Fallback (no historical data) ───────────────────────────────────────────


def _fallback_metrics(
    tickers: list[str],
    weights: np.ndarray,
    quantities: list[float],
    current_prices: list[float],
    avg_prices: list[float],
    total_value: float,
    risk_free_rate: float,
) -> dict:
    """
    When there is no historical price data in the DB, return deterministic
    estimates so the frontend always gets sensible numbers to display.
    """
    cost_basis = float(sum(q * a for q, a in zip(quantities, avg_prices)))
    pnl_vnd = total_value - cost_basis

    metrics_per_ticker = []
    for i, t in enumerate(tickers):
        cp = current_prices[i]
        ap = avg_prices[i]
        qty = quantities[i]
        w = float(weights[i])
        pnl_pct = ((cp - ap) / ap * 100) if ap > 0 else 0.0
        metrics_per_ticker.append({
            "ticker": t,
            "quantity": int(qty),
            "avg_price": ap,
            "current_price": cp,
            "market_value": float(qty * cp),
            "weight": round(w * 100, 2),
            "pnl_pct": round(pnl_pct, 2),
            "expected_return_annual_pct": 0.0,
            "volatility_annual_pct": 0.0,
        })

    return {
        "total_value_vnd": round(total_value, 2),
        "total_pnl_vnd": round(pnl_vnd, 2),
        "expected_return_annual_pct": 0.0,
        "volatility_annual_pct": 0.0,
        "sharpe_ratio": 0.0,
        "beta": 1.0,
        "risk_free_rate_pct": round(risk_free_rate * 100, 2),
        "metrics_per_ticker": metrics_per_ticker,
        "rebalance_actions": [],
    }


def _empty_result() -> dict:
    return {
        "total_value_vnd": 0.0,
        "total_pnl_vnd": 0.0,
        "expected_return_annual_pct": 0.0,
        "volatility_annual_pct": 0.0,
        "sharpe_ratio": 0.0,
        "beta": 1.0,
        "risk_free_rate_pct": DEFAULT_RISK_FREE_RATE * 100,
        "metrics_per_ticker": [],
        "rebalance_actions": [],
    }
