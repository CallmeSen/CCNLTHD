import json
import logging
from datetime import datetime, timezone
from decimal import Decimal

try:
    from kafka import KafkaProducer
    from kafka.errors import KafkaError
    _KAFKA_AVAILABLE = True
except Exception:
    _KAFKA_AVAILABLE = False
    KafkaProducer = None  # type: ignore
    KafkaError = Exception  # type: ignore

from app.config import settings

logger = logging.getLogger(__name__)

_producer = None

TOPIC = "market-data-events"


def _get_producer():
    global _producer
    if not _KAFKA_AVAILABLE:
        return None
    if _producer is None:
        _producer = KafkaProducer(
            bootstrap_servers=settings.kafka_brokers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8") if k else None,
            retries=3,
        )
    return _producer


def publish_price_event(ticker: str, price: Decimal, volume: int | None, interval: str) -> None:
    if not _KAFKA_AVAILABLE:
        logger.debug("Kafka not available, skipping event for %s", ticker)
        return
    try:
        producer = _get_producer()
        if producer is None:
            return
        event = {
            "eventType": "PRICE_UPDATED",
            "ticker": ticker,
            "price": float(price),
            "volume": volume,
            "interval": interval,
            "occurredAt": datetime.now(timezone.utc).isoformat(),
        }
        producer.send(TOPIC, key=ticker, value=event)
    except KafkaError as exc:
        logger.error("Failed to publish Kafka event for %s: %s", ticker, exc)
