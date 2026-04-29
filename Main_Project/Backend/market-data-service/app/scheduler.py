import logging
from datetime import date, timezone, datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app import vn_index_service

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None
VN_TZ = "Asia/Ho_Chi_Minh"


def _fetch_daily():
    today = date.today()
    for idx in vn_index_service.SUPPORTED_INDICES:
        try:
            vn_index_service.fetch_and_ingest(idx, "1D", today, today)
        except Exception as exc:
            logger.error("Daily fetch failed for %s: %s", idx, exc)


def _fetch_hourly():
    today = date.today()
    for idx in vn_index_service.SUPPORTED_INDICES:
        try:
            vn_index_service.fetch_and_ingest(idx, "1H", today, today)
        except Exception as exc:
            logger.error("Hourly fetch failed for %s: %s", idx, exc)


def start_scheduler() -> None:
    global _scheduler
    _scheduler = BackgroundScheduler(timezone=VN_TZ)

    # Daily candle — 17:30 ICT weekdays
    _scheduler.add_job(_fetch_daily, CronTrigger(
        day_of_week="mon-fri", hour=17, minute=30, timezone=VN_TZ))

    # Hourly candles — 09:15, 11:30, 15:15 ICT weekdays
    for hour, minute in [(9, 15), (11, 30), (15, 15)]:
        _scheduler.add_job(_fetch_hourly, CronTrigger(
            day_of_week="mon-fri", hour=hour, minute=minute, timezone=VN_TZ))

    _scheduler.start()
    logger.info("Market data scheduler started")


def stop_scheduler() -> None:
    if _scheduler:
        _scheduler.shutdown(wait=False)
