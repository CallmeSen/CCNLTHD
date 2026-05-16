

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os

from src.fin_agents.db.database import get_db, test_connection, init_db, ensure_postgres_db
from src.fin_agents.db.repositories import (
    ClientRepository, PortfolioRepository, MutualFundRepository,
)
from src.fin_agents.api.schemas import (
    ClientResponse, PortfolioResponse, MutualFundResponse,
    HealthCheck,
)
from src.fin_agents.api.routes import router as portfolio_router
from src.fin_agents.api.sessions import router as sessions_router
from src.fin_agents.graphs.registry import list_workflows as _list_workflows

# Create FastAPI app
app = FastAPI(
    title="Financial Advisor API",
    description="LangGraph-powered financial advisory system",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Include portfolio generation router
app.include_router(portfolio_router)
app.include_router(sessions_router)

# Backward-compatible chat routes for dev/proxy/gateway variants.
# Canonical internal path is /sessions; frontend/gateway paths may arrive as
# /ai/sessions or /api/ai/sessions depending on which process was restarted.
app.include_router(sessions_router, prefix="/ai", include_in_schema=False)
app.include_router(sessions_router, prefix="/api/ai", include_in_schema=False)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve visualization HTML files statically
STORAGE_BASE = os.getenv("STORAGE_BASE", "./storage")
STORAGE_VISUALIZATIONS = os.path.join(STORAGE_BASE, "visualizations")
os.makedirs(STORAGE_VISUALIZATIONS, exist_ok=True)
app.mount("/storage/visualizations", StaticFiles(directory=STORAGE_VISUALIZATIONS), name="visualizations")


# ============================================================================
# Health Check Endpoints
# ============================================================================

@app.get("/", response_model=HealthCheck)
async def root():
    """Root endpoint - API status"""
    return {
        "status": "healthy",
        "service": "Financial Advisor API",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint"""
    db_healthy = test_connection()
    
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "service": "Financial Advisor API",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected" if db_healthy else "disconnected"
    }


# ============================================================================
# Client Endpoints
# ============================================================================

@app.get("/clients", response_model=List[ClientResponse])
async def get_clients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all clients with pagination"""
    clients = ClientRepository.get_all(db, skip=skip, limit=limit)
    return clients


@app.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, db: Session = Depends(get_db)):
    """Get client by ID"""
    client = ClientRepository.get_by_id(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@app.get("/clients/{client_id}/portfolios", response_model=List[PortfolioResponse])
async def get_client_portfolios(client_id: str, db: Session = Depends(get_db)):
    """Get all portfolios for a client"""
    # Verify client exists
    client = ClientRepository.get_by_id(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    portfolios = PortfolioRepository.get_by_client(db, client_id)
    return portfolios


# ============================================================================
# Portfolio Endpoints
# ============================================================================

@app.get("/portfolios/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(portfolio_id: str, db: Session = Depends(get_db)):
    """Get portfolio by ID"""
    portfolio = PortfolioRepository.get_by_id(db, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


# ============================================================================
# Mutual Fund Endpoints
# ============================================================================

@app.get("/funds", response_model=List[MutualFundResponse])
async def get_funds(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all mutual funds with optional category filter"""
    if category:
        funds = MutualFundRepository.get_by_category(db, category)
    else:
        funds = MutualFundRepository.get_all(db, skip=skip, limit=limit)
    return funds


@app.get("/funds/{fund_id}", response_model=MutualFundResponse)
async def get_fund(fund_id: str, db: Session = Depends(get_db)):
    """Get mutual fund by ID"""
    fund = MutualFundRepository.get_by_id(db, fund_id)
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    return fund


# ============================================================================
# Workflow Registry Endpoints
# ============================================================================

@app.get("/workflows", response_model=list)
async def list_workflows():
    """List all available LangGraph workflows."""
    return _list_workflows()


# ============================================================================
# Startup/Shutdown Events
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    print("\n" + "="*60)
    print("Financial Advisor API Starting...")
    print("="*60)
    
    # Ensure the database exists (PostgreSQL only)
    ensure_postgres_db()
    # Test database connection
    if test_connection():
        print("[+] Database connection established")
        # Create tables if they don't exist
        try:
            init_db()
        except Exception as e:
            print(f"[!] WARNING: Could not initialize database tables: {e}")
    else:
        print("[!] WARNING: Database connection failed")
    
    print(f"[+] API running at http://localhost:8000")
    print(f"[+] Docs available at http://localhost:8000/docs")
    print("="*60 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    print("\n" + "="*60)
    print("Financial Advisor API Shutting Down...")
    print("="*60 + "\n")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.api.main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", 8000)),
        reload=bool(os.getenv("API_RELOAD", True))
    )
