from decimal import Decimal
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app import kafka_producer
from app.models import Stock, StockPrice
from app.schemas import PriceIngest, PriceResponse, StockCreate, StockResponse


# ── Stocks ─────────────────────────────────────────────────────────────────────

def get_all_active_stocks(db: Session) -> list[StockResponse]:
    rows = db.query(Stock).filter(Stock.active == True).all()
    return [StockResponse.model_validate(r) for r in rows]


def get_stock_by_ticker(db: Session, ticker: str) -> StockResponse:
    row = db.query(Stock).filter(Stock.ticker == ticker.upper()).first()
    if not row:
        raise ValueError(f"Stock not found: {ticker}")
    return StockResponse.model_validate(row)


def create_stock(db: Session, payload: StockCreate) -> StockResponse:
    ticker = payload.ticker.upper()
    if db.query(Stock).filter(Stock.ticker == ticker).first():
        raise LookupError(f"Ticker already exists: {ticker}")
    stock = Stock(
        ticker=ticker,
        company_name=payload.company_name,
        exchange=payload.exchange,
        sector=payload.sector,
        industry=payload.industry,
        market_cap_vnd=payload.market_cap_vnd,
        active=True,
    )
    db.add(stock)
    db.commit()
    db.refresh(stock)
    return StockResponse.model_validate(stock)


# ── Prices ─────────────────────────────────────────────────────────────────────

def get_latest_price(db: Session, ticker: str, interval: str) -> PriceResponse:
    row = (
        db.query(StockPrice)
        .filter(StockPrice.ticker == ticker.upper(), StockPrice.interval == interval.upper())
        .order_by(StockPrice.timestamp.desc())
        .first()
    )
    if not row:
        raise ValueError(f"No price data for: {ticker}")
    return PriceResponse.model_validate(row)


def get_price_history(
    db: Session,
    ticker: str,
    interval: str,
    from_dt: datetime,
    to_dt: datetime,
) -> list[PriceResponse]:
    rows = (
        db.query(StockPrice)
        .filter(
            StockPrice.ticker == ticker.upper(),
            StockPrice.interval == interval.upper(),
            StockPrice.timestamp >= from_dt,
            StockPrice.timestamp < to_dt,
        )
        .order_by(StockPrice.timestamp.asc())
        .all()
    )
    return [PriceResponse.model_validate(r) for r in rows]


def get_daily_history(db: Session, ticker: str, limit: int) -> list[PriceResponse]:
    rows = (
        db.query(StockPrice)
        .filter(StockPrice.ticker == ticker.upper(), StockPrice.interval == "1D")
        .order_by(StockPrice.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [PriceResponse.model_validate(r) for r in rows]


def ingest_price(db: Session, payload: PriceIngest) -> PriceResponse:
    stock = db.query(Stock).filter(Stock.ticker == payload.ticker).first()
    if not stock:
        raise ValueError(f"Unknown ticker: {payload.ticker}")

    price = StockPrice(
        stock_id=stock.id,
        ticker=payload.ticker,
        timestamp=payload.timestamp,
        open=payload.open,
        high=payload.high,
        low=payload.low,
        close=payload.close,
        volume=payload.volume,
        interval=payload.interval,
    )
    db.add(price)
    db.commit()
    db.refresh(price)

    kafka_producer.publish_price_event(
        ticker=price.ticker,
        price=price.close,
        volume=price.volume,
        interval=price.interval,
    )

    return PriceResponse.model_validate(price)


def get_all_latest_prices(db: Session, interval: str) -> list[PriceResponse]:
    """Return the most recent price bar for every active stock at the given interval."""
    active_tickers = [s.ticker for s in db.query(Stock).filter(Stock.active == True).all()]
    results = []
    for ticker in active_tickers:
        row = (
            db.query(StockPrice)
            .filter(StockPrice.ticker == ticker, StockPrice.interval == interval.upper())
            .order_by(StockPrice.timestamp.desc())
            .first()
        )
        if row:
            results.append(PriceResponse.model_validate(row))
    return results


def price_exists(db: Session, ticker: str, interval: str, timestamp: datetime) -> bool:
    return (
        db.query(StockPrice)
        .filter(
            StockPrice.ticker == ticker,
            StockPrice.interval == interval,
            StockPrice.timestamp == timestamp,
        )
        .first()
        is not None
    )
