"""
Shared pytest fixtures for market-data-service tests.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def app():
    """FastAPI app instance with all external dependencies mocked."""
    mock_session = MagicMock()
    mock_session_factory = MagicMock(return_value=mock_session)

    with patch("app.database.engine"), \
         patch("app.database.Base.metadata.create_all"), \
         patch("app.database.SessionLocal", mock_session_factory), \
         patch("py_eureka_client.eureka_client.init_async"), \
         patch("app.scheduler.start_scheduler"), \
         patch("app.scheduler.stop_scheduler"):
        from app.main import app as fastapi_app
        yield fastapi_app


@pytest.fixture
def client(app):
    """TestClient wrapping the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_db_session():
    """Mock SQLAlchemy session for unit tests."""
    session = MagicMock()
    session.__enter__ = MagicMock(return_value=session)
    session.__exit__ = MagicMock(return_value=False)
    return session


@pytest.fixture
def sample_tickers():
    return ["VNM", "VCB", "HPG"]


@pytest.fixture
def sample_weights():
    return [0.4, 0.35, 0.25]
