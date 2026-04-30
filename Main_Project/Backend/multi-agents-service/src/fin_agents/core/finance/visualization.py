"""
Plotly visualization for portfolio analysis dashboard.
"""
import logging
import os
import json

import plotly.graph_objects as go
from plotly.subplots import make_subplots
from typing import Dict, Optional


def create_allocation_pie_chart(allocation_data: Dict) -> Optional[go.Figure]:
    """Creates a pie chart for portfolio allocation."""
    if not allocation_data or not isinstance(allocation_data, dict):
        return None
    labels = list(allocation_data.keys())
    values = list(allocation_data.values())
    fig = go.Figure(
        data=[
            go.Pie(
                labels=labels, values=values,
                hole=0.3,
                textinfo="percent+label",
                hoverinfo="label+percent+value",
            )
        ]
    )
    fig.update_layout(title_text="Portfolio Allocation")
    return fig


def create_asset_metrics_bars(metrics_data: Dict, allocation_data: Dict) -> Optional[go.Figure]:
    """Creates bar charts comparing individual asset metrics."""
    if not metrics_data or not isinstance(metrics_data, dict) or not allocation_data:
        return None
    assets = list(allocation_data.keys())
    asset_metrics = {asset: metrics_data.get(asset) for asset in assets if isinstance(metrics_data.get(asset), dict)}
    if not asset_metrics:
        return None

    plot_assets = list(asset_metrics.keys())
    plot_data = {
        "Annualized Return": [asset_metrics[a].get("annualized_return") for a in plot_assets],
        "Volatility": [asset_metrics[a].get("annualized_volatility") for a in plot_assets],
        "Sharpe Ratio": [asset_metrics[a].get("sharpe_ratio") for a in plot_assets],
        "Beta": [asset_metrics[a].get("beta") for a in plot_assets],
    }

    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=("Annualized Return", "Annualized Volatility", "Sharpe Ratio", "Beta"),
        shared_xaxes=False,
        vertical_spacing=0.15, horizontal_spacing=0.1,
    )
    fig.add_trace(
        go.Bar(
            x=assets, y=plot_data["Annualized Return"], name="Ann. Return",
            text=[f"{y:.2%}" if y is not None else "N/A" for y in plot_data["Annualized Return"]],
            textposition="auto",
        ), row=1, col=1,
    )
    fig.add_trace(
        go.Bar(
            x=assets, y=plot_data["Volatility"], name="Ann. Volatility",
            text=[f"{y:.2%}" if y is not None else "N/A" for y in plot_data["Volatility"]],
            textposition="auto",
        ), row=1, col=2,
    )
    fig.add_trace(
        go.Bar(
            x=assets, y=plot_data["Sharpe Ratio"], name="Sharpe Ratio",
            text=[f"{y:.2f}" if y is not None else "N/A" for y in plot_data["Sharpe Ratio"]],
            textposition="auto",
        ), row=2, col=1,
    )
    fig.add_trace(
        go.Bar(
            x=assets, y=plot_data["Beta"], name="Beta",
            text=[f"{y:.2f}" if y is not None else "N/A" for y in plot_data["Beta"]],
            textposition="auto",
        ), row=2, col=2,
    )
    fig.update_layout(title_text="Individual Asset Metrics Comparison", height=700, showlegend=True)
    fig.update_yaxes(tickformat=".1%", row=1, col=1)
    fig.update_yaxes(tickformat=".1%", row=1, col=2)
    if len(assets) > 5:
        fig.update_xaxes(tickangle=-45)
    return fig


def create_portfolio_metrics_bar(metrics_data: Dict) -> Optional[go.Figure]:
    """Creates a bar chart for portfolio-level metrics."""
    portfolio_metrics = metrics_data.get("portfolio") if isinstance(metrics_data, dict) else None
    if not portfolio_metrics or not isinstance(portfolio_metrics, dict) or "error" in portfolio_metrics:
        return None
    metrics_to_plot = {
        "Total Return": portfolio_metrics.get("total_return"),
        "Ann. Return": portfolio_metrics.get("annualized_return"),
        "Ann. Volatility": portfolio_metrics.get("annualized_volatility"),
        "Sharpe Ratio": portfolio_metrics.get("sharpe_ratio"),
        "Max Drawdown": portfolio_metrics.get("max_drawdown"),
        "Exp. Return (CAPM)": portfolio_metrics.get("expected_return_capm"),
    }
    labels = [k for k, v in metrics_to_plot.items() if v is not None]
    values = [v for v in metrics_to_plot.values() if v is not None]
    if not labels:
        return None

    fig = go.Figure(
        data=[
            go.Bar(
                x=labels, y=values,
                text=[
                    f"{v:.2%}" if "Return" in l or "Volatility" in l or "Drawdown" in l else f"{v:.2f}"
                    for l, v in zip(labels, values)
                ],
                textposition="auto",
                marker_color="skyblue",
            )
        ]
    )
    fig.update_layout(title_text="Overall Portfolio Performance Metrics")
    fig.update_yaxes(title_text="Value")
    return fig


def generate_dashboard(
    metrics_data: Dict,
    allocation_data: Dict,
    output_path: str,
) -> Optional[str]:
    """
    Generates a Plotly HTML dashboard and saves it to output_path.
    Returns the file path on success, None on failure.
    """
    logging.info(f"Generating dashboard to {output_path}")
    pie_fig = create_allocation_pie_chart(allocation_data)
    asset_bars_fig = create_asset_metrics_bars(metrics_data, allocation_data)
    portfolio_bar_fig = create_portfolio_metrics_bar(metrics_data)

    num_plots = sum(1 for fig in [pie_fig, asset_bars_fig, portfolio_bar_fig] if fig is not None)
    if num_plots == 0:
        logging.error("No valid plots could be generated.")
        return None

    dashboard_fig = make_subplots(
        rows=2, cols=2,
        specs=[
            [{"type": "domain"}, {"type": "xy"}],
            [{"type": "xy", "colspan": 2}, None],
        ],
        subplot_titles=("Portfolio Allocation", "Overall Portfolio Metrics", "Individual Asset Comparison"),
    )

    if pie_fig:
        dashboard_fig.add_trace(pie_fig.data[0], row=1, col=1)
    if portfolio_bar_fig:
        for trace in portfolio_bar_fig.data:
            dashboard_fig.add_trace(trace, row=1, col=2)
    if asset_bars_fig:
        for trace in asset_bars_fig.data:
            dashboard_fig.add_trace(trace, row=2, col=1)

    dashboard_fig.update_layout(
        title_text="Portfolio Analysis Dashboard",
        height=900,
        showlegend=True,
    )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    dashboard_fig.write_html(output_path)
    logging.info(f"Dashboard saved to {output_path}")
    return output_path


def save_json_data(data: Dict, file_path: str) -> bool:
    """Saves data to a JSON file."""
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        return True
    except Exception as e:
        logging.error(f"Error saving JSON to {file_path}: {e}")
        return False
