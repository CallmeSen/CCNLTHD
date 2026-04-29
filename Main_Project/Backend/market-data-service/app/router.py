from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import market_service, vn_index_service
from app.database import get_db
from app.schemas import PriceIngest, PriceResponse, StockCreate, StockResponse

router = APIRouter(prefix="/api/market")


# ── Stocks ──────────────────────────────────────────────────────────────────────

@router.post("/stocks", status_code=201, response_model=StockResponse)
def create_stock(payload: StockCreate, db: Session = Depends(get_db)):
    try:
        return market_service.create_stock(db, payload)
    except LookupError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("/stocks", response_model=list[StockResponse])
def list_stocks(db: Session = Depends(get_db)):
    return market_service.get_all_active_stocks(db)


@router.get("/prices/latest", response_model=list[PriceResponse])
def all_latest_prices(
    interval: str = Query(default="1D"),
    db: Session = Depends(get_db),
):
    """Latest price bar for every active stock at the given interval."""
    return market_service.get_all_latest_prices(db, interval)


@router.get("/stocks/{ticker}", response_model=StockResponse)
def get_stock(ticker: str, db: Session = Depends(get_db)):
    try:
        return market_service.get_stock_by_ticker(db, ticker)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ── Prices ──────────────────────────────────────────────────────────────────────

@router.post("/ingest", response_model=PriceResponse)
def ingest_price(payload: PriceIngest, db: Session = Depends(get_db)):
    try:
        return market_service.ingest_price(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/stocks/{ticker}/price/latest", response_model=PriceResponse)
def latest_price(
    ticker: str,
    interval: str = Query(default="1D"),
    db: Session = Depends(get_db),
):
    try:
        return market_service.get_latest_price(db, ticker, interval)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/stocks/{ticker}/price/history", response_model=list[PriceResponse])
def price_history(
    ticker: str,
    interval: str = Query(default="1D"),
    from_dt: datetime = Query(alias="from"),
    to_dt: datetime = Query(alias="to"),
    db: Session = Depends(get_db),
):
    return market_service.get_price_history(db, ticker, interval, from_dt, to_dt)


@router.get("/stocks/{ticker}/price/daily", response_model=list[PriceResponse])
def daily_history(
    ticker: str,
    limit: int = Query(default=30),
    db: Session = Depends(get_db),
):
    return market_service.get_daily_history(db, ticker, limit)


# ── Index endpoints ─────────────────────────────────────────────────────────────

@router.get("/indices", response_model=list[str])
def supported_indices():
    return vn_index_service.SUPPORTED_INDICES


@router.get("/indices/{index_id}/price/latest", response_model=PriceResponse)
def index_latest_price(
    index_id: str,
    interval: str = Query(default="1D"),
    db: Session = Depends(get_db),
):
    try:
        return market_service.get_latest_price(db, index_id, interval)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/indices/{index_id}/price/history", response_model=list[PriceResponse])
def index_price_history(
    index_id: str,
    interval: str = Query(default="1D"),
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    db: Session = Depends(get_db),
):
    from_dt = datetime(from_date.year, from_date.month, from_date.day)
    to_dt = datetime(to_date.year, to_date.month, to_date.day) + timedelta(days=1)
    return market_service.get_price_history(db, index_id, interval, from_dt, to_dt)


@router.post("/stocks/{ticker}/fetch")
def fetch_stock_data(
    ticker: str,
    interval: str = Query(default="1D"),
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    db: Session = Depends(get_db),
):
    """Fetch OHLCV history for an individual stock from vnstock (VCI) and persist it."""
    try:
        count = vn_index_service.fetch_stock(ticker, interval, from_date, to_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "ticker": ticker.upper(),
        "interval": interval.upper(),
        "from": from_date.isoformat(),
        "to": to_date.isoformat(),
        "ingested": count,
    }


@router.post("/indices/fetch")
def fetch_index_data(
    index_id: str = Query(alias="indexId"),
    interval: str = Query(default="1D"),
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
):
    try:
        count = vn_index_service.fetch_and_ingest(index_id, interval, from_date, to_date)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "indexId": index_id.upper(),
        "interval": interval.upper(),
        "from": from_date.isoformat(),
        "to": to_date.isoformat(),
        "ingested": count,
    }
