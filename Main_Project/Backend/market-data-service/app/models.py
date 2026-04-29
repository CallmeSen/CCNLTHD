from sqlalchemy import (
    BigInteger, Boolean, Column, ForeignKey,
    Index, Integer, Numeric, String, DateTime, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base


class Stock(Base):
    __tablename__ = "stocks"
    __table_args__ = (
        Index("idx_stock_ticker", "ticker", unique=True),
        Index("idx_stock_exchange", "exchange"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ticker = Column(String(10), nullable=False, unique=True)
    company_name = Column(String(200), nullable=False)
    exchange = Column(String(10), nullable=False)
    sector = Column(String(50))
    industry = Column(String(50))
    market_cap_vnd = Column(BigInteger)
    active = Column(Boolean, nullable=False, default=True)

    prices = relationship("StockPrice", back_populates="stock", lazy="dynamic")


class StockPrice(Base):
    __tablename__ = "stock_prices"
    __table_args__ = (
        Index("idx_price_ticker_ts", "ticker", "timestamp"),
        UniqueConstraint("ticker", "interval", "timestamp", name="uq_price_ticker_interval_ts"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    stock_id = Column(BigInteger, ForeignKey("stocks.id"), nullable=False)
    ticker = Column(String(10), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    open = Column(Numeric(18, 2))
    high = Column(Numeric(18, 2))
    low = Column(Numeric(18, 2))
    close = Column(Numeric(18, 2), nullable=False)
    volume = Column(BigInteger)
    interval = Column(String(10), nullable=False)

    stock = relationship("Stock", back_populates="prices")
