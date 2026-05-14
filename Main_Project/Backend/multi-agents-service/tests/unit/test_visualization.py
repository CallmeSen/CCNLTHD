"""
Unit tests for Plotly visualization generation.
"""
import pytest
import os
import json
from unittest.mock import patch
from src.fin_agents.core.finance.visualization import (
    create_allocation_pie_chart,
    create_asset_metrics_bars,
    create_portfolio_metrics_bar,
    generate_dashboard,
    save_json_data,
)


class TestCreateAllocationPieChart:
    """Test pie chart creation."""

    def test_empty_dict_returns_none(self):
        assert create_allocation_pie_chart({}) is None

    def test_none_input_returns_none(self):
        assert create_allocation_pie_chart(None) is None

    def test_non_dict_input_returns_none(self):
        assert create_allocation_pie_chart([1, 2, 3]) is None

    def test_valid_single_asset(self):
        fig = create_allocation_pie_chart({"AAPL": 1.0})
        assert fig is not None
        assert len(fig.data) == 1
        assert fig.data[0].labels == ("AAPL",)
        assert fig.data[0].values == (1.0,)

    def test_valid_multiple_assets(self, sample_portfolio):
        fig = create_allocation_pie_chart(sample_portfolio)
        assert fig is not None
        labels = tuple(fig.data[0].labels)
        values = tuple(fig.data[0].values)
        assert "AAPL" in labels
        assert "MSFT" in labels
        # Values normalized to sum to 1.0 (weights are already fractions)
        assert sum(values) == pytest.approx(1.0)

    def test_chart_has_hole(self, sample_portfolio):
        fig = create_allocation_pie_chart(sample_portfolio)
        assert fig.data[0].hole == 0.3

    def test_chart_has_title(self, sample_portfolio):
        fig = create_allocation_pie_chart(sample_portfolio)
        assert "Portfolio Allocation" in fig.layout.title.text


class TestCreateAssetMetricsBars:
    """Test asset metrics bar chart creation."""

    def test_empty_metrics_returns_none(self):
        assert create_asset_metrics_bars({}, {"AAPL": 1.0}) is None

    def test_empty_allocation_returns_none(self):
        assert create_asset_metrics_bars({"AAPL": {"sharpe_ratio": 0.5}}, {}) is None

    def test_none_inputs_returns_none(self):
        assert create_asset_metrics_bars(None, None) is None

    def test_valid_single_asset(self):
        metrics = {"AAPL": {"annualized_return": 0.15, "annualized_volatility": 0.20, "sharpe_ratio": 0.5, "beta": 1.2}}
        alloc = {"AAPL": 1.0}
        fig = create_asset_metrics_bars(metrics, alloc)
        assert fig is not None
        # 2x2 subplot = 4 traces
        assert len(fig.data) == 4

    def test_valid_multiple_assets(self, sample_portfolio, sample_metrics):
        fig = create_asset_metrics_bars(sample_metrics, sample_portfolio)
        assert fig is not None
        assert len(fig.data) == 4  # 4 subplots

    def test_assets_without_metrics_skipped(self):
        metrics = {"AAPL": {"sharpe_ratio": 0.5}}
        alloc = {"AAPL": 0.5, "MSFT": 0.5}
        fig = create_asset_metrics_bars(metrics, alloc)
        assert fig is not None

    def test_subplot_titles_present(self, sample_portfolio, sample_metrics):
        fig = create_asset_metrics_bars(sample_metrics, sample_portfolio)
        titles = [t.text for t in fig.layout.annotations]
        assert any("Return" in t for t in titles)
        assert any("Volatility" in t for t in titles)


class TestCreatePortfolioMetricsBar:
    """Test portfolio-level metrics bar chart."""

    def test_empty_metrics_returns_none(self):
        assert create_portfolio_metrics_bar({}) is None

    def test_none_metrics_returns_none(self):
        assert create_portfolio_metrics_bar(None) is None

    def test_metrics_without_portfolio_key_returns_none(self):
        assert create_portfolio_metrics_bar({"AAPL": {}}) is None

    def test_portfolio_metrics_with_error_returns_none(self):
        assert create_portfolio_metrics_bar({"portfolio": {"error": "Failed"}}) is None

    def test_valid_portfolio_metrics(self, sample_metrics):
        fig = create_portfolio_metrics_bar(sample_metrics)
        assert fig is not None
        assert len(fig.data) == 1
        assert fig.data[0].type == "bar"

    def test_bar_labels(self, sample_metrics):
        fig = create_portfolio_metrics_bar(sample_metrics)
        labels = [l.text for l in fig.layout.xaxis.ticktext]
        assert len(labels) > 0

    def test_bar_text_formatted(self, sample_metrics):
        fig = create_portfolio_metrics_bar(sample_metrics)
        # Text should be formatted (has % or decimal)
        text_items = fig.data[0].text
        assert len(text_items) > 0
        assert any("%" in str(t) or "." in str(t) for t in text_items)

    def test_title_present(self, sample_metrics):
        fig = create_portfolio_metrics_bar(sample_metrics)
        assert "Portfolio Performance Metrics" in fig.layout.title.text


class TestGenerateDashboard:
    """Test full dashboard generation."""

    def test_all_empty_returns_none(self):
        result = generate_dashboard({}, {}, "/tmp/dashboard.html")
        assert result is None

    def test_valid_dashboard_generated(self, tmp_storage):
        output_path = str(tmp_storage / "dashboard.html")
        result = generate_dashboard(
            {"portfolio": {"total_return": 0.1, "sharpe_ratio": 0.5}},
            {"AAPL": 1.0},
            output_path,
        )
        assert result is not None
        assert os.path.exists(output_path)

    def test_partial_data_works(self, tmp_storage):
        """Dashboard generates with only pie chart (minimal data)."""
        output_path = str(tmp_storage / "dashboard.html")
        result = generate_dashboard({}, {"AAPL": 1.0}, output_path)
        assert result is not None
        assert os.path.exists(output_path)

    def test_html_file_valid(self, tmp_storage):
        output_path = str(tmp_storage / "dashboard.html")
        generate_dashboard(
            {"portfolio": {"total_return": 0.1, "sharpe_ratio": 0.5}},
            {"AAPL": 0.6, "MSFT": 0.4},
            output_path,
        )
        content = open(output_path, "r", encoding="utf-8").read()
        assert "<div" in content  # Plotly HTML
        assert "Portfolio Analysis Dashboard" in content

    def test_directory_created(self, tmp_storage):
        output_path = str(tmp_storage / "subdir" / "dashboard.html")
        result = generate_dashboard({"portfolio": {}}, {"AAPL": 1.0}, output_path)
        assert result is not None
        assert os.path.exists(os.path.dirname(output_path))

    def test_asset_metrics_in_dashboard(self, tmp_storage, sample_metrics, sample_portfolio):
        output_path = str(tmp_storage / "dashboard.html")
        result = generate_dashboard(sample_metrics, sample_portfolio, output_path)
        assert result is not None
        content = open(output_path, "r", encoding="utf-8").read()
        assert "AAPL" in content

    def test_multiple_assets_dashboard(self, tmp_storage):
        output_path = str(tmp_storage / "dashboard.html")
        result = generate_dashboard(
            {
                "portfolio": {"sharpe_ratio": 0.5},
                "AAPL": {"sharpe_ratio": 0.5},
                "MSFT": {"sharpe_ratio": 0.4},
            },
            {"AAPL": 0.5, "MSFT": 0.3, "GOOGL": 0.2},
            output_path,
        )
        assert result is not None


class TestSaveJsonData:
    """Test JSON data persistence."""

    def test_save_simple_dict(self, tmp_path):
        file_path = tmp_path / "data.json"
        result = save_json_data({"key": "value"}, str(file_path))
        assert result is True
        assert file_path.exists()
        with open(file_path) as f:
            assert json.load(f) == {"key": "value"}

    def test_save_nested_dict(self, tmp_path):
        file_path = tmp_path / "nested.json"
        data = {
            "portfolio": {"AAPL": 0.5, "MSFT": 0.5},
            "metrics": {"sharpe": 0.5},
        }
        result = save_json_data(data, str(file_path))
        assert result is True
        with open(file_path) as f:
            loaded = json.load(f)
            assert loaded["portfolio"]["AAPL"] == 0.5

    def test_save_with_datetime(self, tmp_path):
        file_path = tmp_path / "dt.json"
        from datetime import datetime
        result = save_json_data({"timestamp": datetime(2026, 4, 28)}, str(file_path))
        assert result is True

    def test_save_none_value(self, tmp_path):
        file_path = tmp_path / "none.json"
        result = save_json_data({"key": None}, str(file_path))
        assert result is True
        with open(file_path) as f:
            assert json.load(f) == {"key": None}

    def test_save_empty_dict(self, tmp_path):
        file_path = tmp_path / "empty.json"
        result = save_json_data({}, str(file_path))
        assert result is True
        with open(file_path) as f:
            assert json.load(f) == {}

    def test_directory_created(self, tmp_path):
        file_path = tmp_path / "sub" / "deep" / "data.json"
        result = save_json_data({"a": 1}, str(file_path))
        assert result is True
        assert file_path.exists()
