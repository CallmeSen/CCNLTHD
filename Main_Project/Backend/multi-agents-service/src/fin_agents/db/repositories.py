
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional, Dict, Any
from datetime import date, datetime

from src.fin_agents.db.models import (
    Client, MutualFund, Portfolio, Holding, NAVHistory,
    AdvisoryRequest, RiskAssessment, Decision, AuditLog, GeneratedReport
)


class ClientRepository:
    """Client data access layer"""
    
    @staticmethod
    def get_by_id(db: Session, client_id: str) -> Optional[Client]:
        """Get client by ID"""
        return db.query(Client).filter(Client.client_id == client_id).first()
    
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[Client]:
        """Get all clients with pagination"""
        return db.query(Client).offset(skip).limit(limit).all()
    
    @staticmethod
    def create(db: Session, client_data: Dict[str, Any]) -> Client:
        """Create new client"""
        client = Client(**client_data)
        db.add(client)
        db.commit()
        db.refresh(client)
        return client
    
    @staticmethod
    def bulk_create(db: Session, clients_data: List[Dict[str, Any]]) -> int:
        """Bulk create clients"""
        clients = [Client(**data) for data in clients_data]
        db.bulk_save_objects(clients)
        db.commit()
        return len(clients)
    
    @staticmethod
    def get_by_risk_tolerance(db: Session, risk_tolerance: str) -> List[Client]:
        """Get clients by risk tolerance"""
        return db.query(Client).filter(
            Client.risk_tolerance == risk_tolerance
        ).all()


class MutualFundRepository:
    """Mutual fund data access layer"""
    
    @staticmethod
    def get_by_id(db: Session, fund_id: str) -> Optional[MutualFund]:
        """Get fund by ID"""
        return db.query(MutualFund).filter(MutualFund.fund_id == fund_id).first()
    
    @staticmethod
    def get_by_isin(db: Session, isin: str) -> Optional[MutualFund]:
        """Get fund by ISIN"""
        return db.query(MutualFund).filter(MutualFund.isin == isin).first()
    
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[MutualFund]:
        """Get all funds with pagination"""
        return db.query(MutualFund).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_by_category(db: Session, category: str) -> List[MutualFund]:
        """Get funds by category"""
        return db.query(MutualFund).filter(
            MutualFund.category == category
        ).all()
    
    @staticmethod
    def bulk_create(db: Session, funds_data: List[Dict[str, Any]]) -> int:
        """Bulk create funds"""
        funds = [MutualFund(**data) for data in funds_data]
        db.bulk_save_objects(funds)
        db.commit()
        return len(funds)


class PortfolioRepository:
    """Portfolio data access layer"""
    
    @staticmethod
    def get_by_id(db: Session, portfolio_id: str) -> Optional[Portfolio]:
        """Get portfolio by ID with holdings"""
        return db.query(Portfolio).filter(
            Portfolio.portfolio_id == portfolio_id
        ).first()
    
    @staticmethod
    def get_by_client(db: Session, client_id: str) -> List[Portfolio]:
        """Get all portfolios for a client"""
        return db.query(Portfolio).filter(
            Portfolio.client_id == client_id
        ).order_by(desc(Portfolio.snapshot_date)).all()
    
    @staticmethod
    def get_latest_for_client(db: Session, client_id: str) -> Optional[Portfolio]:
        """Get most recent portfolio for client"""
        return db.query(Portfolio).filter(
            Portfolio.client_id == client_id
        ).order_by(desc(Portfolio.snapshot_date)).first()
    
    @staticmethod
    def create(db: Session, portfolio_data: Dict[str, Any]) -> Portfolio:
        """Create new portfolio"""
        portfolio = Portfolio(**portfolio_data)
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)
        return portfolio
    
    @staticmethod
    def bulk_create(db: Session, portfolios_data: List[Dict[str, Any]]) -> int:
        """Bulk create portfolios"""
        portfolios = [Portfolio(**data) for data in portfolios_data]
        db.bulk_save_objects(portfolios)
        db.commit()
        return len(portfolios)


class HoldingRepository:
    """Holdings data access layer"""
    
    @staticmethod
    def get_by_portfolio(db: Session, portfolio_id: str) -> List[Holding]:
        """Get all holdings for a portfolio"""
        return db.query(Holding).filter(
            Holding.portfolio_id == portfolio_id
        ).all()
    
    @staticmethod
    def get_portfolio_composition(db: Session, portfolio_id: str) -> Dict[str, float]:
        """Get portfolio composition by category (returns dict of category: weight)"""
        holdings = HoldingRepository.get_by_portfolio(db, portfolio_id)
        composition = {}
        for holding in holdings:
            category = holding.category or "Unknown"
            composition[category] = composition.get(category, 0) + float(holding.weight_percent)
        return composition
    
    @staticmethod
    def bulk_create(db: Session, holdings_data: List[Dict[str, Any]]) -> int:
        """Bulk create holdings"""
        holdings = [Holding(**data) for data in holdings_data]
        db.bulk_save_objects(holdings)
        db.commit()
        return len(holdings)


class NAVHistoryRepository:
    """NAV history data access layer"""
    
    @staticmethod
    def get_fund_history(
        db: Session, 
        fund_id: str, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[NAVHistory]:
        """Get NAV history for a fund within date range"""
        query = db.query(NAVHistory).filter(NAVHistory.fund_id == fund_id)
        
        if start_date:
            query = query.filter(NAVHistory.date >= start_date)
        if end_date:
            query = query.filter(NAVHistory.date <= end_date)
        
        return query.order_by(NAVHistory.date).all()
    
    @staticmethod
    def get_latest_nav(db: Session, fund_id: str) -> Optional[NAVHistory]:
        """Get most recent NAV for a fund"""
        return db.query(NAVHistory).filter(
            NAVHistory.fund_id == fund_id
        ).order_by(desc(NAVHistory.date)).first()
    
    @staticmethod
    def bulk_create(db: Session, nav_data: List[Dict[str, Any]]) -> int:
        """Bulk create NAV records"""
        nav_records = [NAVHistory(**data) for data in nav_data]
        db.bulk_save_objects(nav_records)
        db.commit()
        return len(nav_records)


class AdvisoryRequestRepository:
    """Advisory request data access layer"""
    
    @staticmethod
    def get_by_id(db: Session, request_id: str) -> Optional[AdvisoryRequest]:
        """Get request by ID"""
        return db.query(AdvisoryRequest).filter(
            AdvisoryRequest.request_id == request_id
        ).first()
    
    @staticmethod
    def create(db: Session, request_data: Dict[str, Any]) -> AdvisoryRequest:
        """Create new advisory request"""
        request = AdvisoryRequest(**request_data)
        db.add(request)
        db.commit()
        db.refresh(request)
        return request
    
    @staticmethod
    def update_status(db: Session, request_id: str, status: str) -> Optional[AdvisoryRequest]:
        """Update request status"""
        request = AdvisoryRequestRepository.get_by_id(db, request_id)
        if request:
            request.status = status
            request.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(request)
        return request
    
    @staticmethod
    def get_by_status(db: Session, status: str) -> List[AdvisoryRequest]:
        """Get all requests with specific status"""
        return db.query(AdvisoryRequest).filter(
            AdvisoryRequest.status == status
        ).order_by(desc(AdvisoryRequest.created_at)).all()
    
    @staticmethod
    def get_by_client(db: Session, client_id: str) -> List[AdvisoryRequest]:
        """Get all advisory requests for a client."""
        return db.query(AdvisoryRequest).filter(
            AdvisoryRequest.client_id == client_id
        ).order_by(desc(AdvisoryRequest.created_at)).all()

    @staticmethod
    def get_pending_reviews(db: Session) -> List[AdvisoryRequest]:
        """Get all requests needing human review"""
        return db.query(AdvisoryRequest).filter(
            AdvisoryRequest.status.in_(['HOLD', 'BLOCKED'])
        ).order_by(AdvisoryRequest.created_at).all()


class RiskAssessmentRepository:
    """Risk assessment data access layer"""
    
    @staticmethod
    def create(db: Session, assessment_data: Dict[str, Any]) -> RiskAssessment:
        """Create risk assessment"""
        assessment = RiskAssessment(**assessment_data)
        db.add(assessment)
        db.commit()
        db.refresh(assessment)
        return assessment
    
    @staticmethod
    def get_by_request(db: Session, request_id: str) -> Optional[RiskAssessment]:
        """Get risk assessment for a request"""
        return db.query(RiskAssessment).filter(
            RiskAssessment.request_id == request_id
        ).first()


class DecisionRepository:
    """Decision data access layer"""
    
    @staticmethod
    def create(db: Session, decision_data: Dict[str, Any]) -> Decision:
        """Create decision record"""
        decision = Decision(**decision_data)
        db.add(decision)
        db.commit()
        db.refresh(decision)
        return decision
    
    @staticmethod
    def get_by_request(db: Session, request_id: str) -> List[Decision]:
        """Get all decisions for a request"""
        return db.query(Decision).filter(
            Decision.request_id == request_id
        ).order_by(Decision.created_at).all()


class AuditLogRepository:
    """Audit log data access layer"""
    
    @staticmethod
    def log(
        db: Session, 
        request_id: str, 
        agent_name: str, 
        action: str,
        payload: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Create audit log entry"""
        log_entry = AuditLog(
            request_id=request_id,
            agent_name=agent_name,
            action=action,
            payload_json=payload
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    
    @staticmethod
    def get_by_request(db: Session, request_id: str) -> List[AuditLog]:
        """Get all audit logs for a request"""
        return db.query(AuditLog).filter(
            AuditLog.request_id == request_id
        ).order_by(AuditLog.created_at).all()


class GeneratedReportRepository:
    """Generated report data access layer"""
    
    @staticmethod
    def create(db: Session, report_data: Dict[str, Any]) -> GeneratedReport:
        """Create generated report"""
        report = GeneratedReport(**report_data)
        db.add(report)
        db.commit()
        db.refresh(report)
        return report
    
    @staticmethod
    def get_by_request(db: Session, request_id: str) -> Optional[GeneratedReport]:
        """Get report for a request"""
        return db.query(GeneratedReport).filter(
            GeneratedReport.request_id == request_id
        ).order_by(desc(GeneratedReport.created_at)).first()