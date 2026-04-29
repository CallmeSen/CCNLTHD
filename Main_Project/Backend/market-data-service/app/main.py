import logging
import socket

import py_eureka_client.eureka_client as eureka_client
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app import scheduler, vn_index_service
from app.config import settings
from app.database import init_db, SessionLocal
from app.router import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Market Data Service", version="2.0.0")

app.include_router(router)


@app.get("/actuator/health")
def health():
    return {"status": "UP"}


@app.on_event("startup")
async def startup():
    # Inject vnstock API key if configured (raises rate limit from 20 → 60+ req/min)
    if settings.vnstock_api_key:
        try:
            import vnai
            vnai.setup_api_key(settings.vnstock_api_key)
            logger.info("vnstock API key configured")
        except Exception as exc:
            logger.warning("vnstock API key setup failed (non-fatal): %s", exc)
    else:
        logger.warning(
            "VNSTOCK_API_KEY not set — running as Guest (20 req/min). "
            "Get a free key at https://vnstocks.com/login"
        )

    # Create tables
    init_db()

    # Seed VNINDEX / VN30 master records
    db = SessionLocal()
    try:
        vn_index_service.seed_indices(db)
    finally:
        db.close()

    # Register with Eureka
    try:
        await eureka_client.init_async(
            eureka_server=settings.eureka_server,
            app_name="market-data-service",
            instance_port=settings.app_port,
            instance_host=socket.gethostname(),
            health_check_url=f"http://{socket.gethostname()}:{settings.app_port}/actuator/health",
        )
        logger.info("Registered with Eureka at %s", settings.eureka_server)
    except Exception as exc:
        logger.warning("Eureka registration failed (non-fatal): %s", exc)

    # Start cron scheduler
    scheduler.start_scheduler()


@app.on_event("shutdown")
async def shutdown():
    scheduler.stop_scheduler()
    try:
        await eureka_client.stop_async()
    except Exception:
        pass
