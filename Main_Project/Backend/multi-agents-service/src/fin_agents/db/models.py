"""
Database Models - SQLAlchemy ORM
File: src/db/models.py
"""

from sqlalchemy import (
    Column, String, Integer, Numeric, Date, DateTime, Text, 
    ForeignKey, CheckConstraint, Index, TIMESTAMP, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()


class Client(Base):
    """Client profile information"""
    __tablename__ = "clients"
    
    client_id = Column(String(20), primary_key=True)
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=False)
    city = Column(String(100))
    risk_tolerance = Column(
        String(20), 
        nullable=False,
        # CheckConstraint will be added in table args
    )
    investment_horizon_years = Column(Integer, nullable=False)
    investment_goal = Column(String(100))
    annual_income_inr = Column(Numeric(15, 2))
    registration_date = Column(Date, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    portfolios = relationship("Portfolio", back_populates="client")
    advisory_requests = relationship("AdvisoryRequest", back_populates="client")
    
    __table_args__ = (
        CheckConstraint(
            "risk_tolerance IN ('Conservative', 'Moderate', 'Aggressive')",
            name="check_risk_tolerance"
        ),
    )
    
    def __repr__(self):
        return f"<Client(client_id={self.client_id}, name={self.name}, risk={self.risk_tolerance})>"


class MutualFund(Base):
    """Mutual fund master data"""
    __tablename__ = "mutual_funds"
    
    fund_id = Column(String(20), primary_key=True)
    isin = Column(String(20), unique=True, nullable=False)
    fund_name = Column(String(255), nullable=False)
    amc = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)
    plan_type = Column(String(20))
    option_type = Column(String(20))
    expense_ratio = Column(Numeric(5, 2))
    inception_date = Column(Date)
    benchmark = Column(String(100))
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    holdings = relationship("Holding", back_populates="fund")
    nav_history = relationship("NAVHistory", back_populates="fund")
    
    def __repr__(self):
        return f"<MutualFund(fund_id={self.fund_id}, name={self.fund_name[:30]}...)>"


class Portfolio(Base):
    """Portfolio snapshots"""
    __tablename__ = "portfolios"
    
    portfolio_id = Column(String(20), primary_key=True)
    client_id = Column(String(20), ForeignKey("clients.client_id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    total_value_inr = Column(Numeric(15, 2), nullable=False)
    num_holdings = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    client = relationship("Client", back_populates="portfolios")
    holdings = relationship("Holding", back_populates="portfolio")
    risk_assessments = relationship("RiskAssessment", back_populates="portfolio")
    advisory_requests = relationship("AdvisoryRequest", back_populates="portfolio")
    
    __table_args__ = (
        Index("idx_portfolios_client", "client_id"),
    )
    
    def __repr__(self):
        return f"<Portfolio(portfolio_id={self.portfolio_id}, value=₹{self.total_value_inr})>"


class Holding(Base):
    """Individual fund holdings within portfolios"""
    __tablename__ = "holdings"
    
    holding_id = Column(Integer, primary_key=True, autoincrement=True)
    portfolio_id = Column(String(20), ForeignKey("portfolios.portfolio_id"), nullable=False)
    fund_id = Column(String(20), ForeignKey("mutual_funds.fund_id"), nullable=False)
    category = Column(String(100))
    units = Column(Numeric(15, 4), nullable=False)
    nav = Column(Numeric(12, 4), nullable=False)
    value_inr = Column(Numeric(15, 2), nullable=False)
    weight_percent = Column(Numeric(5, 2), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="holdings")
    fund = relationship("MutualFund", back_populates="holdings")
    
    __table_args__ = (
        Index("idx_holdings_portfolio", "portfolio_id"),
        Index("idx_holdings_fund", "fund_id"),
    )
    
    def __repr__(self):
        return f"<Holding(portfolio={self.portfolio_id}, fund={self.fund_id}, weight={self.weight_percent}%)>"


class NAVHistory(Base):
    """NAV history for mutual funds"""
    __tablename__ = "nav_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    fund_id = Column(String(20), ForeignKey("mutual_funds.fund_id"), nullable=False)
    date = Column(Date, nullable=False)
    nav = Column(Numeric(12, 4), nullable=False)
    monthly_return = Column(Numeric(8, 2))
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    fund = relationship("MutualFund", back_populates="nav_history")
    
    __table_args__ = (
        Index("idx_nav_history_fund_date", "fund_id", "date", unique=True),
    )
    
    def __repr__(self):
        return f"<NAVHistory(fund={self.fund_id}, date={self.date}, nav={self.nav})>"


class AdvisoryRequest(Base):
    """Advisory request tracking"""
    __tablename__ = "advisory_requests"
    
    request_id = Column(String(50), primary_key=True)
    client_id = Column(String(20), ForeignKey("clients.client_id"), nullable=True)
    portfolio_id = Column(String(20), ForeignKey("portfolios.portfolio_id"), nullable=True)
    question = Column(Text)
    status = Column(String(20), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    client = relationship("Client", back_populates="advisory_requests")
    portfolio = relationship("Portfolio", back_populates="advisory_requests")
    risk_assessments = relationship("RiskAssessment", back_populates="request")
    decisions = relationship("Decision", back_populates="request")
    reports = relationship("GeneratedReport", back_populates="request")
    
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'HOLD', 'BLOCKED')",
            name="check_status"
        ),
        Index("idx_advisory_requests_client", "client_id"),
        Index("idx_advisory_requests_status", "status"),
    )
    
    def __repr__(self):
        return f"<AdvisoryRequest(request_id={self.request_id}, status={self.status})>"


class RiskAssessment(Base):
    """Risk analysis outputs"""
    __tablename__ = "risk_assessments"
    
    assessment_id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), ForeignKey("advisory_requests.request_id"), nullable=True)
    portfolio_id = Column(String(20), ForeignKey("portfolios.portfolio_id"), nullable=True)
    metrics_json = Column(JSON, nullable=False)
    flags = Column(JSON)
    policy_version = Column(String(20))
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    request = relationship("AdvisoryRequest", back_populates="risk_assessments")
    portfolio = relationship("Portfolio", back_populates="risk_assessments")
    
    def __repr__(self):
        return f"<RiskAssessment(assessment_id={self.assessment_id}, request={self.request_id})>"


class Decision(Base):
    """Compliance decisions and human reviews"""
    __tablename__ = "decisions"
    
    decision_id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), ForeignKey("advisory_requests.request_id"), nullable=True)
    decision = Column(String(20), nullable=False)
    reason = Column(Text)
    reviewer_id = Column(String(50))
    reviewed_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    request = relationship("AdvisoryRequest", back_populates="decisions")
    
    __table_args__ = (
        CheckConstraint(
            "decision IN ('PASS', 'HOLD', 'BLOCK')",
            name="check_decision"
        ),
        Index("idx_decisions_request", "request_id"),
    )
    
    def __repr__(self):
        return f"<Decision(decision_id={self.decision_id}, decision={self.decision})>"


class AuditLog(Base):
    """Complete audit trail of all agent actions"""
    __tablename__ = "audit_logs"
    
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), nullable=True)
    agent_name = Column(String(50), nullable=False)
    action = Column(String(100))
    payload_json = Column(JSON)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    __table_args__ = (
        Index("idx_audit_logs_request", "request_id"),
    )
    
    def __repr__(self):
        return f"<AuditLog(log_id={self.log_id}, agent={self.agent_name}, action={self.action})>"


class GeneratedReport(Base):
    """Generated advisory reports"""
    __tablename__ = "generated_reports"
    
    report_id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), ForeignKey("advisory_requests.request_id"), nullable=True)
    report_text = Column(Text, nullable=False)
    report_json = Column(JSON)
    file_path = Column(String(500))
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    request = relationship("AdvisoryRequest", back_populates="reports")
    
    def __repr__(self):
        return f"<GeneratedReport(report_id={self.report_id}, request={self.request_id})>"