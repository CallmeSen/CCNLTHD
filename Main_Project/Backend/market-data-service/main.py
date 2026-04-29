from app.main import app  # noqa: F401 — entry point for uvicorn

if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.app_port, reload=False)
