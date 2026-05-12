"""
scrape_stock_history.py
=======================
Scrape OHLCV price history for all registered tickers via the
market-data-service REST API.

The script calls:
    POST /api/market/stocks/{ticker}/fetch?interval=1D&from=YYYY-MM-DD&to=YYYY-MM-DD

which internally uses vnstock (VCI source) to pull data and persist it
into the PostgreSQL market_data_db.

Usage
-----
    # 1-year history (default)
    python scrape_stock_history.py

    # 5-year history
    python scrape_stock_history.py --years 5

    # Custom date range
    python scrape_stock_history.py --from 2020-01-01 --to 2026-05-11

    # Target a different host
    python scrape_stock_history.py --host http://localhost:8082 --years 1

    # Save raw responses to JSON files
    python scrape_stock_history.py --years 1 --save-json

Requirements
------------
    pip install requests

"""

import argparse
import json
import logging
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import requests

# ---------------------------------------------------------------------------
# Configuration defaults
# ---------------------------------------------------------------------------
DEFAULT_HOST = "http://localhost:8082"
DEFAULT_YEARS = 1
RETRY_LIMIT = 3
RETRY_DELAY_SEC = 5  # seconds between retries
REQUEST_TIMEOUT = 60  # seconds per request

# Tickers to scrape. Extend this list to add more stocks.
# The script also auto-discovers tickers already registered in the service.
SEED_TICKERS = [
    "VNINDEX", "VN30",
    "VCB", "FPT", "VNM", "VHM", "HPG", "MWG", "TCB",
    "VPB", "SSI", "MSN", "GMD", "VIC", "PLX", "REE",
    # Add more HOSE/HNX tickers below:
    # "ACB", "BID", "CTG", "HDB", "MBB", "STB", "VIB",
    # "DGC", "DCM", "DPM", "GEX", "HAH", "HHV", "KDH",
    # "MSB", "NLG", "NVL", "PDR", "PNJ", "SAB", "SHB",
    # "TPB", "VCG", "VHC", "VJC", "VRE",
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def discover_tickers(host: str) -> list[str]:
    """Return tickers already registered in the service, merged with SEED_TICKERS."""
    try:
        resp = requests.get(f"{host}/api/market/stocks", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        # The endpoint returns {"value": [...], "Count": N}
        items = data if isinstance(data, list) else data.get("value", [])
        remote = [item["ticker"] for item in items if item.get("ticker")]
        merged = list(dict.fromkeys(remote + SEED_TICKERS))  # deduplicate, keep order
        log.info("Discovered %d tickers from service + seed list.", len(merged))
        return merged
    except Exception as exc:
        log.warning("Could not discover tickers from service (%s). Using seed list.", exc)
        return SEED_TICKERS


def fetch_ticker(host: str, ticker: str, from_date: str, to_date: str) -> dict:
    """
    POST to the fetch endpoint and return the parsed JSON response.
    Raises requests.HTTPError on non-2xx responses after retries.
    """
    url = (
        f"{host}/api/market/stocks/{ticker}/fetch"
        f"?interval=1D&from={from_date}&to={to_date}"
    )
    for attempt in range(1, RETRY_LIMIT + 1):
        try:
            resp = requests.post(url, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except requests.HTTPError as exc:
            log.warning(
                "HTTP %s for %s (attempt %d/%d): %s",
                exc.response.status_code, ticker, attempt, RETRY_LIMIT, exc,
            )
            if exc.response.status_code == 404:
                log.error("  → Ticker %s not found in vnstock. Skipping.", ticker)
                return {}
        except requests.RequestException as exc:
            log.warning("Request error for %s (attempt %d/%d): %s", ticker, attempt, RETRY_LIMIT, exc)

        if attempt < RETRY_LIMIT:
            log.info("  Retrying in %ds…", RETRY_DELAY_SEC)
            time.sleep(RETRY_DELAY_SEC)

    raise RuntimeError(f"Failed to fetch {ticker} after {RETRY_LIMIT} attempts.")


def check_rows(host: str, ticker: str, limit: int = 5) -> int:
    """Return the count of stored daily bars for a ticker."""
    try:
        resp = requests.get(
            f"{host}/api/market/stocks/{ticker}/price/daily?limit={limit}",
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            return len(data)
        # Some endpoints wrap in {"value": [...], "Count": N}
        return data.get("Count", len(data.get("value", [])))
    except Exception:
        return -1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape OHLCV history for all VN stock tickers.",
    )
    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help=f"Base URL of market-data-service (default: {DEFAULT_HOST})",
    )
    parser.add_argument(
        "--years",
        type=int,
        default=DEFAULT_YEARS,
        help="Number of years of history to fetch (default: 1, max practical: 5)",
    )
    parser.add_argument(
        "--from",
        dest="from_date",
        default=None,
        help="Override start date (YYYY-MM-DD). Overrides --years.",
    )
    parser.add_argument(
        "--to",
        dest="to_date",
        default=None,
        help="Override end date (YYYY-MM-DD). Default: today.",
    )
    parser.add_argument(
        "--save-json",
        action="store_true",
        help="Save each ticker's API response as JSON in ./output/",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Seconds to wait between tickers to avoid rate-limiting (default: 1.0)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    to_date: date = date.fromisoformat(args.to_date) if args.to_date else date.today()
    from_date: date = (
        date.fromisoformat(args.from_date)
        if args.from_date
        else to_date - timedelta(days=365 * args.years)
    )

    from_str = from_date.isoformat()
    to_str = to_date.isoformat()

    log.info("=" * 60)
    log.info("  Host     : %s", args.host)
    log.info("  From     : %s", from_str)
    log.info("  To       : %s", to_str)
    log.info("  Duration : ~%d year(s)", args.years)
    log.info("=" * 60)

    tickers = discover_tickers(args.host)

    output_dir = Path(__file__).parent / "output"
    if args.save_json:
        output_dir.mkdir(exist_ok=True)
        log.info("JSON responses will be saved to: %s", output_dir)

    results = {"ok": [], "failed": [], "skipped": []}

    for idx, ticker in enumerate(tickers, start=1):
        log.info("[%d/%d] Fetching %s …", idx, len(tickers), ticker)
        try:
            data = fetch_ticker(args.host, ticker, from_str, to_str)
            if not data:
                results["skipped"].append(ticker)
                continue

            rows_inserted = data.get("inserted", data.get("rows", "?"))
            log.info("  ✓ %s — inserted/updated: %s row(s)", ticker, rows_inserted)

            if args.save_json:
                out_file = output_dir / f"{ticker}_{from_str}_{to_str}.json"
                out_file.write_text(json.dumps(data, indent=2, ensure_ascii=False))

            results["ok"].append(ticker)

        except RuntimeError as exc:
            log.error("  ✗ %s — %s", ticker, exc)
            results["failed"].append(ticker)

        # Polite delay between requests
        if idx < len(tickers):
            time.sleep(args.delay)

    # ---------------------------------------------------------------------------
    # Summary
    # ---------------------------------------------------------------------------
    log.info("")
    log.info("=" * 60)
    log.info("  SUMMARY")
    log.info("  OK      : %d  %s", len(results["ok"]), results["ok"])
    log.info("  Skipped : %d  %s", len(results["skipped"]), results["skipped"])
    log.info("  Failed  : %d  %s", len(results["failed"]), results["failed"])
    log.info("=" * 60)

    # Spot-check row counts for first 3 successful tickers
    if results["ok"]:
        log.info("")
        log.info("Spot-checking row counts (limit 5 bars each):")
        for ticker in results["ok"][:3]:
            n = check_rows(args.host, ticker)
            log.info("  %s → %s bar(s) in DB", ticker, n if n >= 0 else "error")

    if results["failed"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
