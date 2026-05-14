-- Financial Advisor System - Initial Schema

-- Clients table
CREATE TABLE clients (
    client_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL,
    city VARCHAR(100),
    risk_tolerance VARCHAR(20) NOT NULL CHECK (risk_tolerance IN ('Conservative', 'Moderate', 'Aggressive')),
    investment_horizon_years INTEGER NOT NULL,
    investment_goal VARCHAR(100),
    annual_income_inr NUMERIC(15, 2),
    registration_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mutual Funds table
CREATE TABLE mutual_funds (
    fund_id VARCHAR(20) PRIMARY KEY,
    isin VARCHAR(20) UNIQUE NOT NULL,
    fund_name VARCHAR(255) NOT NULL,
    amc VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    plan_type VARCHAR(20),
    option_type VARCHAR(20),
    expense_ratio NUMERIC(5, 2),
    inception_date DATE,
    benchmark VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolios table
CREATE TABLE portfolios (
    portfolio_id VARCHAR(20) PRIMARY KEY,
    client_id VARCHAR(20) NOT NULL REFERENCES clients(client_id),
    snapshot_date DATE NOT NULL,
    total_value_inr NUMERIC(15, 2) NOT NULL,
    num_holdings INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Holdings table
CREATE TABLE holdings (
    holding_id SERIAL PRIMARY KEY,
    portfolio_id VARCHAR(20) NOT NULL REFERENCES portfolios(portfolio_id),
    fund_id VARCHAR(20) NOT NULL REFERENCES mutual_funds(fund_id),
    category VARCHAR(100),
    units NUMERIC(15, 4) NOT NULL,
    nav NUMERIC(12, 4) NOT NULL,
    value_inr NUMERIC(15, 2) NOT NULL,
    weight_percent NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NAV History table
CREATE TABLE nav_history (
    id SERIAL PRIMARY KEY,
    fund_id VARCHAR(20) NOT NULL REFERENCES mutual_funds(fund_id),
    date DATE NOT NULL,
    nav NUMERIC(12, 4) NOT NULL,
    monthly_return NUMERIC(8, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fund_id, date)
);

-- Advisory Requests table
CREATE TABLE advisory_requests (
    request_id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(20) NOT NULL REFERENCES clients(client_id),
    portfolio_id VARCHAR(20) NOT NULL REFERENCES portfolios(portfolio_id),
    question TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'HOLD', 'BLOCKED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Risk Assessments table
CREATE TABLE risk_assessments (
    assessment_id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL REFERENCES advisory_requests(request_id),
    portfolio_id VARCHAR(20) NOT NULL REFERENCES portfolios(portfolio_id),
    metrics_json JSONB NOT NULL,
    flags JSONB,
    policy_version VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Decisions table
CREATE TABLE decisions (
    decision_id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL REFERENCES advisory_requests(request_id),
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('PASS', 'HOLD', 'BLOCK')),
    reason TEXT,
    reviewer_id VARCHAR(50),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table
CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    agent_name VARCHAR(50) NOT NULL,
    action VARCHAR(100),
    payload_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated Reports table
CREATE TABLE generated_reports (
    report_id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL REFERENCES advisory_requests(request_id),
    report_text TEXT NOT NULL,
    report_json JSONB,
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_portfolios_client ON portfolios(client_id);
CREATE INDEX idx_holdings_portfolio ON holdings(portfolio_id);
CREATE INDEX idx_holdings_fund ON holdings(fund_id);
CREATE INDEX idx_nav_history_fund_date ON nav_history(fund_id, date);
CREATE INDEX idx_advisory_requests_client ON advisory_requests(client_id);
CREATE INDEX idx_advisory_requests_status ON advisory_requests(status);
CREATE INDEX idx_audit_logs_request ON audit_logs(request_id);
CREATE INDEX idx_decisions_request ON decisions(request_id);

-- Comments
COMMENT ON TABLE clients IS 'Client profile information';
COMMENT ON TABLE portfolios IS 'Portfolio snapshots';
COMMENT ON TABLE holdings IS 'Individual fund holdings within portfolios';
COMMENT ON TABLE risk_assessments IS 'Risk analysis outputs';
COMMENT ON TABLE decisions IS 'Compliance decisions and human reviews';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all agent actions';
