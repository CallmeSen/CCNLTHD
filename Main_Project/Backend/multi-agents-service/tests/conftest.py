"""Pytest configuration and shared fixtures for all tests."""
import sys
import os
from pathlib import Path

# Ensure the project root is on the Python path
project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root / "src"))

import pytest
from unittest.mock import MagicMock
import pandas as pd
import numpy as np


# --------------------------------------------------------------------------- #
# Pytest configuration
# --------------------------------------------------------------------------- #
def pytest_configure(config):
    config.addinivalue_line("markers", "unit: unit tests")
    config.addinivalue_line("markers", "integration: integration tests")
    config.addinivalue_line("markers", "slow: tests that take >1s (network/data)")


# --------------------------------------------------------------------------- #
# Shared fixtures
# --------------------------------------------------------------------------- #

@pytest.fixture
def sample_state():
    """A complete, valid workflow state for happy-path tests."""
    return {
        "initial_request": "Build a diversified portfolio for retirement, high risk tolerance, 10 years horizon",
        "user_profile": {
            "goal": "retirement",
            "risk_tolerance": "high",
            "time_horizon": "10 years",
            "initial_capital": 50000.0,
            "specific_preferences": "Tech stocks preferred",
            "suggested_assets": ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"],
        },
        "asset_universe": ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"],
        "market_news": "Market sentiment remains positive. Tech sector shows strong growth.",
    }


@pytest.fixture
def sample_metrics():
    """Mock metrics data for portfolio and individual assets."""
    return {
        "portfolio": {
            "total_return": 0.1234,
            "annualized_return": 0.0845,
            "annualized_volatility": 0.1823,
            "sharpe_ratio": 0.46,
            "max_drawdown": -0.1523,
            "expected_return_capm": 0.0721,
            "portfolio_sma_50": 1.234,
            "portfolio_sma_200": 1.102,
            "portfolio_momentum_outlook": "Bullish (50d > 200d SMA)",
            "included_assets": ["AAPL", "MSFT", "GOOGL"],
            "period_days": 252,
            "original_weight_sum": 1.0,
            "included_weight_sum": 0.85,
            "capm_calculation_weight_coverage": 0.85,
        },
        "AAPL": {
            "total_return": 0.25,
            "annualized_return": 0.18,
            "annualized_volatility": 0.22,
            "sharpe_ratio": 0.68,
            "max_drawdown": -0.12,
            "beta": 1.25,
            "expected_return_capm": 0.08375,
            "sma_50": 185.50,
            "sma_200": 170.20,
            "period_days": 252,
        },
        "MSFT": {
            "total_return": 0.15,
            "annualized_return": 0.10,
            "annualized_volatility": 0.18,
            "sharpe_ratio": 0.38,
            "max_drawdown": -0.08,
            "beta": 0.92,
            "expected_return_capm": 0.0664,
            "sma_50": 410.20,
            "sma_200": 395.00,
            "period_days": 252,
        },
        "GOOGL": {
            "total_return": 0.10,
            "annualized_return": 0.07,
            "annualized_volatility": 0.20,
            "sharpe_ratio": 0.20,
            "max_drawdown": -0.18,
            "beta": 1.10,
            "expected_return_capm": 0.0765,
            "sma_50": 155.00,
            "sma_200": 148.50,
            "period_days": 252,
        },
    }


@pytest.fixture
def sample_portfolio():
    """A valid portfolio allocation summing to 1.0."""
    return {"AAPL": 0.40, "MSFT": 0.35, "GOOGL": 0.25}


@pytest.fixture
def sample_portfolio_invalid_sum():
    """A portfolio whose weights do not sum to 1.0."""
    return {"AAPL": 0.40, "MSFT": 0.30}  # sum = 0.70


@pytest.fixture
def sample_portfolio_empty():
    """An empty portfolio."""
    return {}


@pytest.fixture
def sample_financial_data():
    """Mock pandas DataFrames for financial data."""
    dates = pd.date_range("2024-01-01", periods=100, freq="D")
    np.random.seed(42)

    def make_prices(start=100, vol=0.02):
        return start * np.exp(np.cumsum(np.random.randn(100) * vol))

    return {
        "AAPL": pd.DataFrame(
            {"open": make_prices(150), "high": make_prices(152), "low": make_prices(148), "close": make_prices(150), "volume": np.random.randint(1_000_000, 5_000_000, 100)},
            index=dates,
        ),
        "MSFT": pd.DataFrame(
            {"open": make_prices(400), "high": make_prices(402), "low": make_prices(398), "close": make_prices(400), "volume": np.random.randint(500_000, 2_000_000, 100)},
            index=dates,
        ),
        "^GSPC": pd.DataFrame(
            {"open": make_prices(5000, 0.01), "high": make_prices(5002, 0.01), "low": make_prices(4998, 0.01), "close": make_prices(5000, 0.01), "volume": np.random.randint(1_000_000_000, 2_147_483_647, 100)},
            index=dates,
        ),
    }


@pytest.fixture
def mock_db():
    """A mock SQLAlchemy Session."""
    return MagicMock()


@pytest.fixture
def tmp_storage(tmp_path, monkeypatch):
    """Patch STORAGE_BASE to a temp directory for file I/O tests."""
    storage = tmp_path / "storage"
    storage.mkdir()
    reports = storage / "reports"
    portfolios = storage / "portfolios"
    reports.mkdir()
    portfolios.mkdir()
    monkeypatch.setenv("STORAGE_BASE", str(storage))
    return storage
