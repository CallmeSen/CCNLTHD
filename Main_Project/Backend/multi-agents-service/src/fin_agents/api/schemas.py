
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# ============================================================================
# Health Check
# ============================================================================

class HealthCheck(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    timestamp: str
    database: Optional[str] = None


# ============================================================================
# SSE Session Schemas
# ============================================================================

class MessageCreate(BaseModel):
    """Request body for sending a message to a chat session."""
    message: str = Field(..., description="User message content")
    lang: Optional[str] = Field("en", description="Response language code (en/vi)")


# ============================================================================
# Client Schemas
# ============================================================================

class ClientBase(BaseModel):
    """Base client schema"""
    client_id: str
    name: str
    age: int
    city: Optional[str] = None
    risk_tolerance: str
    investment_horizon_years: int
    investment_goal: Optional[str] = None
    annual_income_inr: Optional[Decimal] = None
    registration_date: date


class ClientResponse(ClientBase):
    """Client response schema"""
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Mutual Fund Schemas
# ============================================================================

class MutualFundBase(BaseModel):
    """Base mutual fund schema"""
    fund_id: str
    isin: str
    fund_name: str
    amc: str
    category: str
    plan_type: Optional[str] = None
    option_type: Optional[str] = None
    expense_ratio: Optional[Decimal] = None
    inception_date: Optional[date] = None
    benchmark: Optional[str] = None


class MutualFundResponse(MutualFundBase):
    """Mutual fund response schema"""
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Portfolio Schemas
# ============================================================================

class HoldingBase(BaseModel):
    """Base holding schema"""
    holding_id: int
    portfolio_id: str
    fund_id: str
    category: Optional[str] = None
    units: Decimal
    nav: Decimal
    value_inr: Decimal
    weight_percent: Decimal


class HoldingResponse(HoldingBase):
    """Holding response schema"""
    created_at: datetime

    class Config:
        from_attributes = True


class PortfolioBase(BaseModel):
    """Base portfolio schema"""
    portfolio_id: str
    client_id: str
    snapshot_date: date
    total_value_inr: Decimal
    num_holdings: int


class PortfolioResponse(PortfolioBase):
    """Portfolio response schema"""
    created_at: datetime
    updated_at: datetime
    holdings: List[HoldingResponse] = []

    class Config:
        from_attributes = True


# ============================================================================
# NAV History Schemas
# ============================================================================

class NAVHistoryBase(BaseModel):
    """Base NAV history schema"""
    fund_id: str
    date: date
    nav: Decimal
    monthly_return: Optional[Decimal] = None


class NAVHistoryResponse(NAVHistoryBase):
    """NAV history response schema"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Orchestrator Schemas
# ============================================================================

class HistoryItem(BaseModel):
    """Summary of a past portfolio analysis run."""
    run_id: str
    timestamp: str
    request: str
    status: str
    portfolio: Optional[dict] = None


class StockAnalyzeRequest(BaseModel):
    """Request body for the stock portfolio generation endpoint."""
    request: str = Field(..., description="Natural-language investment request")
    lang: Optional[str] = Field("en", description="Response language code (en/vi)")


class StockAnalyzeResponse(BaseModel):
    """Response from the stock portfolio generation workflow."""
    run_id: str
    status: str
    final_report: Optional[str] = None
    user_profile: Optional[dict] = None
    proposed_portfolio: Optional[dict] = None
    metrics: Optional[dict] = None
    validation_result: Optional[dict] = None
    llm_commentary: Optional[str] = None
    market_news: Optional[str] = None
    lang: Optional[str] = None
    error: Optional[str] = None
