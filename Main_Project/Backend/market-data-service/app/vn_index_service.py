"""
VN-Index / VN30 ingestion service using vnstock.

Uses the VCI data source which supports index symbols (VNINDEX, VN30).
"""
import logging
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app import market_service
from app.database import SessionLocal
from app.models import Stock
from app.schemas import PriceIngest

logger = logging.getLogger(__name__)

SUPPORTED_INDICES = ["VNINDEX", "VN30"]

# Maps our internal interval codes to vnstock interval strings
INTERVAL_MAP = {
    "1MIN":  "1m",
    "5MIN":  "5m",
    "15MIN": "15m",
    "1H":    "1H",
    "1D":    "1D",
}


def seed_indices(db: Session) -> None:
    """Ensure VNINDEX and VN30 exist as Stock master records."""
    seeds = [
        ("VNINDEX", "VN-Index (HOSE)"),
        ("VN30",    "VN30 Index (HOSE)"),
    ]
    for ticker, name in seeds:
        if not db.query(Stock).filter(Stock.ticker == ticker).first():
            db.add(Stock(
                ticker=ticker,
                company_name=name,
                exchange="HOSE",
                sector="INDEX",
                industry="Market Index",
                active=True,
            ))
            logger.info("Seeded index ticker: %s", ticker)
    db.commit()


def fetch_stock(ticker: str, interval: str, from_date: date, to_date: date) -> int:
    """
    Fetch OHLCV data for any individual HOSE/HNX stock from vnstock (VCI) and persist it.
    The stock master row must already exist in the `stocks` table.
    Returns the number of newly inserted rows.
    """
    upper_ticker = ticker.upper()
    upper_interval = interval.upper()
    vnstock_interval = INTERVAL_MAP.get(upper_interval, "1D")

    logger.info("Fetching stock %s %s from %s to %s", upper_ticker, upper_interval, from_date, to_date)

    db = SessionLocal()
    try:
        stock_row = db.query(Stock).filter(Stock.ticker == upper_ticker).first()
        if not stock_row:
            raise ValueError(f"Stock '{upper_ticker}' not found. Seed it first via POST /api/market/stocks.")
    finally:
        db.close()

    try:
        from vnstock import Vnstock  # noqa: PLC0415
        stock = Vnstock().stock(symbol=upper_ticker, source="TCBS")
        df = stock.quote.history(
            start=from_date.isoformat(),
            end=to_date.isoformat(),
            interval=vnstock_interval,
        )
    except Exception as exc:
        logger.error("vnstock fetch failed for %s: %s", upper_ticker, exc)
        raise RuntimeError(f"vnstock fetch failed: {exc}") from exc

    if df is None or df.empty:
        logger.warning("No data returned for %s [%s -> %s]", upper_ticker, from_date, to_date)
        return 0

    count = 0
    db = SessionLocal()
    try:
        for _, row in df.iterrows():
            ts = row["time"]
            if hasattr(ts, "to_pydatetime"):
                ts = ts.to_pydatetime()
            payload = PriceIngest(
                ticker=upper_ticker,
                timestamp=ts,
                open=float(row.get("open", 0) or 0),
                high=float(row.get("high", 0) or 0),
                low=float(row.get("low", 0) or 0),
                close=float(row.get("close", 0) or 0),
                volume=int(row.get("volume", 0) or 0),
                interval=upper_interval,
            )
            result = market_service.ingest_price(db, payload)
            if result:
                count += 1
    finally:
        db.close()

    logger.info("Persisted %d records for %s (%s)", count, upper_ticker, upper_interval)
    return count


def fetch_and_ingest(index_id: str, interval: str, from_date: date, to_date: date) -> int:
    """
    Fetch OHLCV data for a VN index from vnstock and persist to the database.

    Returns the number of newly inserted rows.
    """
    upper_id = index_id.upper()
    upper_interval = interval.upper()

    if upper_id not in SUPPORTED_INDICES:
        raise ValueError(f"Unsupported index: {index_id}. Must be one of {SUPPORTED_INDICES}")

    vnstock_interval = INTERVAL_MAP.get(upper_interval, "1D")

    logger.info("Fetching %s %s from %s to %s", upper_id, upper_interval, from_date, to_date)

    try:
        from vnstock import Vnstock  # noqa: PLC0415 — deferred to avoid import-time crash
        stock = Vnstock().stock(symbol=upper_id, source="VCI")
        df = stock.quote.history(
            start=from_date.isoformat(),
            end=to_date.isoformat(),
            interval=vnstock_interval,
        )
    except Exception as exc:
        logger.error("vnstock fetch failed for %s: %s", upper_id, exc)
        raise RuntimeError(f"vnstock fetch failed: {exc}") from exc

    if df is None or df.empty:
        logger.warning("No data returned for %s [%s → %s]", upper_id, from_date, to_date)
        return 0

    # Normalise column names — vnstock may return 'time' or 'date'
    df = df.rename(columns={"time": "date"} if "time" in df.columns else {})

    ingested = 0
    db = SessionLocal()
    try:
        for _, row in df.iterrows():
            raw_ts = row.get("date") or row.get("time")
            if raw_ts is None:
                continue

            # Convert pandas Timestamp / string to datetime
            if hasattr(raw_ts, "to_pydatetime"):
                ts: datetime = raw_ts.to_pydatetime()
            else:
                ts = datetime.fromisoformat(str(raw_ts))

            close_val = row.get("close")
            if close_val is None or float(close_val) <= 0:
                continue

            if market_service.price_exists(db, upper_id, upper_interval, ts):
                continue

            payload = PriceIngest(
                ticker=upper_id,
                timestamp=ts,
                open=Decimal(str(row["open"])) if row.get("open") is not None else None,
                high=Decimal(str(row["high"])) if row.get("high") is not None else None,
                low=Decimal(str(row["low"])) if row.get("low") is not None else None,
                close=Decimal(str(close_val)),
                volume=int(row["volume"]) if row.get("volume") is not None else None,
                interval=upper_interval,
            )
            try:
                market_service.ingest_price(db, payload)
                ingested += 1
            except Exception as exc:
                logger.warning("Failed to ingest %s @ %s: %s", upper_id, ts, exc)
                db.rollback()

    finally:
        db.close()

    logger.info("Persisted %d records for %s (%s)", ingested, upper_id, upper_interval)
    return ingested
