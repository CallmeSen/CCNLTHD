"""
Portfolio metric computation functions for stock advisory workflow.

Exports calculate_financial_metrics, validate_portfolio_calculations,
and calculate_metrics_node for the stock advisory LangGraph pipeline.
"""

import logging
from typing import Dict, Optional

import pandas as pd
import numpy as np
import yfinance as yf

logger = logging.getLogger(__name__)

RISK_FREE_RATE = 0.045
EXPECTED_MARKET_RETURN = 0.09
BENCHMARK_TICKER = "^GSPC"
MIN_PERIODS_FOR_BETA = 60


def calculate_financial_metrics(
    data: Dict[str, pd.DataFrame],
    portfolio: Optional[Dict[str, float]] = None,
) -> Dict:
    """Calculates financial metrics, including CAPM (with manual Beta calc) and SMAs."""
    logger.info("Calculating Financial Metrics (CAPM & SMAs with manual Beta)")
    metrics_results: Dict = {}
    if not data:
        logger.warning("No financial data provided.")
        return {"error": "No financial data available"}

    logger.info(f"CAPM assumptions: Rf={RISK_FREE_RATE:.1%}, E(Rm)={EXPECTED_MARKET_RETURN:.1%}")

    benchmark_data = data.get(BENCHMARK_TICKER)
    benchmark_returns: Optional[pd.Series] = None
    if benchmark_data is not None and "close" in benchmark_data.columns:
        benchmark_returns = benchmark_data["close"].pct_change().dropna()
        if benchmark_returns.empty:
            benchmark_returns = None
            logger.warning("Could not calculate returns for benchmark. Manual Beta disabled.")

    asset_betas: Dict = {}
    asset_tickers = [t for t in data.keys() if t != BENCHMARK_TICKER]

    for ticker in asset_tickers:
        beta = None
        source = "N/A"
        try:
            tkr_info = None
            try:
                tkr_info = yf.Ticker(ticker).info
            except Exception:
                pass
            beta_info = tkr_info.get("beta") if tkr_info else None
            if beta_info is not None:
                beta = float(beta_info)
                source = "yf.info"
            elif benchmark_returns is not None:
                asset_df = data.get(ticker)
                if asset_df is not None and "close" in asset_df.columns:
                    asset_returns = asset_df["close"].pct_change().dropna()
                    if not asset_returns.empty:
                        aligned_df = pd.merge(
                            asset_returns.rename("asset"),
                            benchmark_returns.rename("benchmark"),
                            left_index=True, right_index=True, how="inner",
                        )
                        if len(aligned_df) >= MIN_PERIODS_FOR_BETA:
                            cov_matrix = aligned_df.cov()
                            covariance = cov_matrix.loc["asset", "benchmark"]
                            benchmark_variance = aligned_df["benchmark"].var()
                            if benchmark_variance != 0:
                                calculated_beta = covariance / benchmark_variance
                                beta = float(calculated_beta)
                                source = "Calculated"
            if beta is None:
                logger.warning(f"  {ticker}: Beta not available.")
        except Exception as e:
            logger.error(f"  Error processing beta for {ticker}: {e}")
            beta = None
        asset_betas[ticker] = beta

    try:
        if portfolio:
            logger.info(f"Calculating portfolio metrics for: {list(portfolio.keys())}")
            aligned_data: Dict[str, pd.DataFrame] = {}
            common_index = None
            for ticker, weight in portfolio.items():
                ticker = ticker.upper()
                if ticker in asset_tickers and ticker in data and not data[ticker].empty and "close" in data[ticker].columns:
                    df_ticker = data[ticker][["close"]].copy()
                    df_ticker.rename(columns={"close": ticker}, inplace=True)
                    aligned_data[ticker] = df_ticker
                    if common_index is None:
                        common_index = df_ticker.index
                    else:
                        common_index = common_index.intersection(df_ticker.index)

            if not aligned_data or common_index is None or common_index.empty:
                return {"error": "No valid/aligned data found for portfolio."}

            portfolio_df = pd.DataFrame(index=common_index)
            valid_tickers_in_portfolio = []
            weights_list = []
            for ticker, df_ticker in aligned_data.items():
                portfolio_df = pd.merge(portfolio_df, df_ticker.loc[common_index], left_index=True, right_index=True, how="inner")
                valid_tickers_in_portfolio.append(ticker)
                weights_list.append(portfolio[ticker])

            if portfolio_df.empty:
                return {"error": "Could not align data for portfolio calculation."}

            valid_weight_sum = sum(weights_list)
            if abs(valid_weight_sum) < 1e-6:
                return {"error": "Portfolio weights sum to zero."}
            normalized_weights = [w / valid_weight_sum for w in weights_list]
            returns = portfolio_df.pct_change().dropna()
            if returns.empty:
                return {"error": "Could not calculate returns."}

            portfolio_return = (returns * normalized_weights).sum(axis=1)
            cumulative_return = (1 + portfolio_return).cumprod() - 1
            total_return = cumulative_return.iloc[-1] if not cumulative_return.empty else 0.0
            num_days = len(portfolio_return)
            if num_days < 5:
                annualized_return = total_return
                volatility = portfolio_return.std() * (252 ** 0.5) if num_days > 1 else 0.0
            else:
                annualized_return = (1 + total_return) ** (252 / num_days) - 1
                volatility = portfolio_return.std() * (252 ** 0.5)
            sharpe_ratio = annualized_return / volatility if volatility != 0 else 0.0
            rolling_max = (1 + cumulative_return).cummax()
            daily_drawdown = (1 + cumulative_return) / rolling_max - 1.0
            max_drawdown = daily_drawdown.min() if not daily_drawdown.empty else 0.0

            weighted_capm_sum = 0.0
            weight_sum_for_capm = 0.0
            for i, ticker in enumerate(valid_tickers_in_portfolio):
                beta = asset_betas.get(ticker)
                if beta is not None:
                    capm_ret = RISK_FREE_RATE + beta * (EXPECTED_MARKET_RETURN - RISK_FREE_RATE)
                    weight = normalized_weights[i]
                    weighted_capm_sum += weight * capm_ret
                    weight_sum_for_capm += weight
            portfolio_expected_return_capm = weighted_capm_sum / weight_sum_for_capm if weight_sum_for_capm > 1e-6 else None

            portfolio_value = (1 + portfolio_return).cumprod()
            portfolio_sma_50 = None
            portfolio_sma_200 = None
            portfolio_momentum_outlook = "Neutral"
            if len(portfolio_value) >= 50:
                portfolio_sma_50 = portfolio_value.rolling(window=50).mean().iloc[-1]
            if len(portfolio_value) >= 200:
                portfolio_sma_200 = portfolio_value.rolling(window=200).mean().iloc[-1]
            if portfolio_sma_50 is not None and portfolio_sma_200 is not None:
                portfolio_momentum_outlook = "Bullish (50d > 200d SMA)" if portfolio_sma_50 > portfolio_sma_200 else "Bearish (50d < 200d SMA)"
            elif portfolio_sma_50 is not None:
                portfolio_momentum_outlook = "Neutral (Insufficient history for 200d SMA)"

            metrics_results["portfolio"] = {
                "total_return": round(total_return, 4),
                "annualized_return": round(annualized_return, 4),
                "annualized_volatility": round(volatility, 4),
                "sharpe_ratio": round(sharpe_ratio, 2),
                "max_drawdown": round(max_drawdown, 4),
                "expected_return_capm": round(portfolio_expected_return_capm, 4) if portfolio_expected_return_capm is not None else None,
                "portfolio_sma_50": round(portfolio_sma_50, 2) if portfolio_sma_50 is not None else None,
                "portfolio_sma_200": round(portfolio_sma_200, 2) if portfolio_sma_200 is not None else None,
                "portfolio_momentum_outlook": portfolio_momentum_outlook,
                "included_assets": valid_tickers_in_portfolio,
                "period_days": num_days,
                "original_weight_sum": round(sum(portfolio.values()), 4),
                "included_weight_sum": round(valid_weight_sum, 4),
                "capm_calculation_weight_coverage": round(weight_sum_for_capm, 4),
            }

        logger.info("Calculating metrics for individual assets...")
        for ticker in asset_tickers:
            df = data.get(ticker)
            if df is None or df.empty or "close" not in df.columns:
                logger.warning(f"Skipping {ticker}: no data.")
                continue
            returns_series = df["close"].pct_change().dropna()
            if returns_series.empty or len(returns_series) < 2:
                logger.warning(f"Skipping {ticker}: insufficient data.")
                continue

            total_ret = (1 + returns_series).prod() - 1
            num_days = len(returns_series)
            if num_days < 5:
                ann_ret = total_ret
                vol = returns_series.std() * (252 ** 0.5)
            else:
                ann_ret = (1 + total_ret) ** (252 / num_days) - 1
                vol = returns_series.std() * (252 ** 0.5)
            sharpe = ann_ret / vol if vol != 0 else 0.0
            cum_ret = (1 + returns_series).cumprod() - 1
            roll_max = (1 + cum_ret).cummax()
            daily_dd = (1 + cum_ret) / roll_max - 1.0
            max_dd = daily_dd.min() if not daily_dd.empty else 0.0
            beta = asset_betas.get(ticker)
            capm_ret_val = None
            if beta is not None:
                capm_ret_val = RISK_FREE_RATE + beta * (EXPECTED_MARKET_RETURN - RISK_FREE_RATE)
            close_prices = df["close"]
            sma_50 = close_prices.rolling(window=50).mean().iloc[-1] if len(close_prices) >= 50 else None
            sma_200 = close_prices.rolling(window=200).mean().iloc[-1] if len(close_prices) >= 200 else None

            metrics_results[ticker.upper()] = {
                "total_return": round(total_ret, 4),
                "annualized_return": round(ann_ret, 4),
                "annualized_volatility": round(vol, 4),
                "sharpe_ratio": round(sharpe, 2),
                "max_drawdown": round(max_dd, 4),
                "beta": round(beta, 2) if beta is not None else None,
                "expected_return_capm": round(capm_ret_val, 4) if capm_ret_val is not None else None,
                "sma_50": round(sma_50, 2) if sma_50 is not None else None,
                "sma_200": round(sma_200, 2) if sma_200 is not None else None,
                "period_days": num_days,
            }

        if portfolio is None:
            logger.info("(Portfolio metrics not requested, only individual metrics calculated)")
        logger.info("Metrics Calculation Complete")
        return metrics_results
    except Exception as e:
        logger.error(f"Error calculating metrics: {e}")
        metrics_results["error"] = f"Calculation failed: {str(e)}"
        return metrics_results


def validate_portfolio_calculations(
    portfolio: Optional[Dict[str, float]],
    metrics: Optional[Dict],
) -> Dict:
    """Performs validation checks on the portfolio and its metrics."""
    logger.info("Validating Portfolio Calculations")
    errors: list = []
    status = "pass"
    if not isinstance(portfolio, dict) or not portfolio:
        errors.append("Portfolio allocation is missing or not a dictionary.")
        status = "fail"
        return {"status": status, "errors": errors}
    if not isinstance(metrics, dict):
        errors.append("Metrics data is missing or not a dictionary.")
        status = "fail"
        metrics = {}
    total_weight = sum(portfolio.values())
    if not abs(total_weight - 1.0) < 0.01:
        errors.append(f"Portfolio weights sum to {total_weight:.4f}, significantly different from 1.0.")
        status = "fail"
    portfolio_metrics = metrics.get("portfolio", None) if isinstance(metrics, dict) else None
    if not isinstance(portfolio_metrics, dict) or not portfolio_metrics:
        if portfolio:
            errors.append("Portfolio metrics dictionary is missing.")
            status = "fail"
    elif "error" in portfolio_metrics:
        errors.append(f"Portfolio metrics calculation error: {portfolio_metrics['error']}")
        status = "fail"
    logger.info(f"Validation Complete: Status={status}")
    return {"status": status, "errors": errors}


def _ensure_close_col(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize columns to flat lowercase names, handling multi-index from yfinance."""
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [str(col[0]).lower() for col in df.columns]
    else:
        df.columns = [str(c).lower() for c in df.columns]
    return df


def calculate_metrics_node(state) -> Dict:
    """LangGraph node function to call metrics calculation."""
    logger.info("Calculating Metrics Node")
    financial_data = state.get("financial_data")
    if not financial_data:
        logger.error("Financial data missing, cannot calculate metrics.")
        return {"error_message": "Cannot calculate metrics: Financial data is missing."}

    # Normalize column names in all DataFrames
    normalized_data = {}
    for ticker, df in financial_data.items():
        if isinstance(df, pd.DataFrame) and not df.empty:
            normalized_data[ticker] = _ensure_close_col(df.copy())
        else:
            normalized_data[ticker] = df
    financial_data = normalized_data

    metrics = calculate_financial_metrics(data=financial_data, portfolio=None)
    if "error" in metrics and not any(k for k in metrics if k != "error"):
        return {"metrics": metrics, "error_message": f"Metrics calculation failed: {metrics.get('error', 'unknown')}"}

    # Check if we have at least some individual asset metrics
    asset_metric_keys = [k for k in metrics if k not in ("portfolio", "error")]
    if not asset_metric_keys:
        return {"metrics": metrics, "error_message": "No asset metrics could be calculated from available data."}

    proposed_portfolio = state.get("proposed_portfolio")
    if proposed_portfolio:
        portfolio_metrics = calculate_financial_metrics(data=financial_data, portfolio=proposed_portfolio)
        if "portfolio" in portfolio_metrics:
            metrics["portfolio"] = portfolio_metrics["portfolio"]
        elif "error" in portfolio_metrics:
            metrics["portfolio"] = {"error": portfolio_metrics["error"]}
    return {"metrics": metrics}
