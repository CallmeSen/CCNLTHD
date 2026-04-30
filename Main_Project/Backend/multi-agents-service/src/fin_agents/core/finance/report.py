"""
Markdown report formatter for portfolio generation output.
"""
import logging
from typing import Dict


def structure_output_report(state: Dict) -> str:
    """Formats the final results into a clear Markdown report using tables."""
    logging.info("Structuring Output Report")
    report = "# Financial Portfolio Report\n\n"
    user_profile = state.get("user_profile", {})
    proposed_portfolio = state.get("proposed_portfolio", {})
    metrics = state.get("metrics", {})
    validation = state.get("validation_result", {})
    commentary = state.get("llm_commentary", "No commentary generated.")
    news = state.get("market_news", None)
    error_msg = state.get("error_message", None)
    rf_rate = 0.045
    exp_market_return = 0.09

    if error_msg:
        report += f"## Execution Error\n{error_msg}\n\n"

    report += "## User Profile Summary\n"
    report += f"- **Goal:** {user_profile.get('goal', 'N/A')}\n"
    report += f"- **Risk Tolerance:** {user_profile.get('risk_tolerance', 'N/A')}\n"
    report += f"- **Time Horizon:** {user_profile.get('time_horizon', 'N/A')}\n"
    capital = user_profile.get("initial_capital")
    if capital:
        report += f"- **Initial Capital:** ${capital:,.2f}\n"
    prefs = user_profile.get("specific_preferences") or user_profile.get("preferences")
    if prefs:
        report += f"- **Preferences:** {prefs}\n"
    report += "\n"

    if news:
        report += f"## Recent Market News Context\n{news}\n\n"

    report += "## Proposed Portfolio Allocation\n"
    if isinstance(proposed_portfolio, dict) and proposed_portfolio:
        report += "| Asset | Weight |\n|-------|--------|\n"
        for ticker, weight in proposed_portfolio.items():
            report += f"| {ticker.upper()} | {weight:.2%} |\n"
    else:
        report += "- No valid portfolio allocation was proposed.\n"
    report += "\n"

    report += "## Portfolio Performance Metrics\n"
    portfolio_metrics = metrics.get("portfolio", {}) if isinstance(metrics, dict) else {}
    if isinstance(portfolio_metrics, dict) and "error" not in portfolio_metrics and proposed_portfolio:
        included_assets_str = ", ".join(portfolio_metrics.get("included_assets", list(proposed_portfolio.keys())))
        report += f"- **Included Assets:** {included_assets_str}\n"
        report += f"- **Calculation Period Days:** {portfolio_metrics.get('period_days', 'N/A')}\n"
        report += "| Metric                         | Value      |\n|--------------------------------|------------|\n"

        def fmt(value, spec):
            if isinstance(value, (int, float)):
                try:
                    return format(value, spec)
                except (ValueError, TypeError):
                    return str(value)
            return str(value) if value is not None else "N/A"

        report += f"| Total Return                   | {fmt(portfolio_metrics.get('total_return'), '.2%')} |\n"
        report += f"| Annualized Return              | {fmt(portfolio_metrics.get('annualized_return'), '.2%')} |\n"
        report += f"| Annualized Volatility          | {fmt(portfolio_metrics.get('annualized_volatility'), '.2%')} |\n"
        report += f"| Sharpe Ratio                   | {fmt(portfolio_metrics.get('sharpe_ratio'), '.2f')} |\n"
        report += f"| Max Drawdown                   | {fmt(portfolio_metrics.get('max_drawdown'), '.2%')} |\n"
        exp_ret_capm = portfolio_metrics.get("expected_return_capm")
        report += f"| Expected Return (CAPM)         | {fmt(exp_ret_capm, '.2%')} |\n"
        momentum = portfolio_metrics.get("portfolio_momentum_outlook", "N/A")
        report += f"| Momentum Outlook (SMA)         | {momentum} |\n"
        report += f"*CAPM Expected Return: Rf={rf_rate:.1%}, E(Rm)={exp_market_return:.1%}.*\n"
        capm_coverage = portfolio_metrics.get("capm_calculation_weight_coverage")
        if capm_coverage is not None:
            report += f"*Portfolio CAPM calculation covers {fmt(capm_coverage, '.1%')} of portfolio weight.*\n"
    elif isinstance(portfolio_metrics, dict) and "error" in portfolio_metrics:
        report += f"- **Metrics Calculation Error:** {portfolio_metrics['error']}\n"
    elif not proposed_portfolio:
        report += "- Portfolio metrics not calculated.\n"
    else:
        report += "- Portfolio metrics are unavailable.\n"
    report += "\n"

    if isinstance(metrics, dict) and proposed_portfolio:
        report += "## Individual Asset Metrics\n"
        report += f"*CAPM Expected Return: Rf={rf_rate:.1%}, E(Rm)={exp_market_return:.1%}.*\n"
        report += "| Asset | Ann. Return | Volatility | Sharpe | Max Drawdown | Exp. Return (CAPM) | Beta | SMA 50 | SMA 200 |\n"
        report += "|-------|-------------|------------|--------|--------------|--------------------|------|--------|---------|\n"
        for ticker in proposed_portfolio.keys():
            asset_metrics = metrics.get(ticker.upper())
            if isinstance(asset_metrics, dict):
                report += f"| **{ticker.upper()}** | "
                report += f"{fmt(asset_metrics.get('annualized_return'), '.2%')} | "
                report += f"{fmt(asset_metrics.get('annualized_volatility'), '.2%')} | "
                report += f"{fmt(asset_metrics.get('sharpe_ratio'), '.2f')} | "
                report += f"{fmt(asset_metrics.get('max_drawdown'), '.2%')} | "
                report += f"{fmt(asset_metrics.get('expected_return_capm'), '.2%')} | "
                report += f"{fmt(asset_metrics.get('beta'), '.2f')} | "
                report += f"{fmt(asset_metrics.get('sma_50'), '.2f')} | "
                report += f"{fmt(asset_metrics.get('sma_200'), '.2f')} |\n"
        report += "\n"

    report += "## Validation Status\n"
    if isinstance(validation, dict):
        report += f"- **Status:** {validation.get('status', 'N/A').upper()}\n"
        if validation.get("errors"):
            report += "- **Issues Found:**\n"
            for err in validation["errors"]:
                report += f"  - {err}\n"
    else:
        report += "- Validation did not run or failed.\n"
    report += "\n"

    report += "## LLM Commentary & Reasoning\n"
    report += f"{commentary}\n\n"
    report += "---\n"
    report += "**Disclaimer:** This report is generated by an AI system for informational purposes only. It does not constitute financial advice. Consult with a qualified financial advisor before making investment decisions.\n"
    logging.info("Report Structuring Complete")
    return report
