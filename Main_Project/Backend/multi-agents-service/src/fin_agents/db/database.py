"""
Database Connection Management
File: src/fin_agents/db/database.py
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from typing import Generator
import os
import logging

from dotenv import load_dotenv

# Load .env first so DATABASE_URL is available
load_dotenv()

# Import from fin_agents.core.config for consistency
try:
    from src.fin_agents.core.config import DATABASE_URL as _cfg_url
    DATABASE_URL = _cfg_url
except ImportError:
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "sqlite:///./financial_advisor.db"
    )

logger = logging.getLogger(__name__)

# Create engine with appropriate settings based on database type
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=False,
    )

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db() -> Generator[Session, None, None]:
    """Dependency for FastAPI to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """Context manager for database session in scripts"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables."""
    from src.fin_agents.db.models import Base
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")


def drop_all_tables():
    """Drop all tables - DANGEROUS, use only in development."""
    from src.fin_agents.db.models import Base
    Base.metadata.drop_all(bind=engine)
    logger.warning("All tables dropped")


def test_connection():
    """Test database connection."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


def ensure_postgres_db():
    """For PostgreSQL: create the database if it doesn't exist.

    Called once at startup to handle the case where the financial_advisor
    database has not been created yet.
    """
    if not DATABASE_URL.startswith("postgresql"):
        return  # No action needed for SQLite

    try:
        # Parse DATABASE_URL like postgresql://user:pass@host:5432/dbname
        # and create a connection string without the database name
        import re
        match = re.match(
            r"postgresql://(?P<user>[^:@]+):(?P<password>[^@]+)@(?P<host>[^:/]+)(?::(?P<port>\d+))?/(?P<db>[^?]*)\??",
            DATABASE_URL,
        )
        if match:
            user = match.group("user")
            password = match.group("password")
            host = match.group("host")
            port = match.group("port") or "5432"
            db_name = match.group("db")
        else:
            return  # Could not parse URL

        admin_url = f"postgresql://{user}:{password}@{host}:{port}/postgres"
        admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
        try:
            with admin_engine.connect() as conn:
                result = conn.execute(
                    text(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'")
                )
                if not result.fetchone():
                    conn.execute(text(f"CREATE DATABASE {db_name}"))
                    logger.info(f"Created database '{db_name}'")
        finally:
            admin_engine.dispose()
    except Exception as e:
        logger.warning(f"Could not ensure postgres database: {e}")


if __name__ == "__main__":
    test_connection()