-- Migration: Normalize schema to 3NF - allow NULL for optional foreign keys
-- The stock_advisory workflow generates requests without client/portfolio context,
-- so these FK columns must be nullable.
--
-- Applied on 2026-04-29

-- advisory_requests: client_id and portfolio_id are optional for system-generated requests
ALTER TABLE advisory_requests
    ALTER COLUMN client_id DROP NOT NULL,
    ALTER COLUMN portfolio_id DROP NOT NULL;

-- risk_assessments: request_id and portfolio_id are optional
ALTER TABLE risk_assessments
    ALTER COLUMN request_id DROP NOT NULL,
    ALTER COLUMN portfolio_id DROP NOT NULL;

-- audit_logs: request_id is optional (system events may not have a request)
ALTER TABLE audit_logs ALTER COLUMN request_id TYPE VARCHAR(50);
ALTER TABLE audit_logs ALTER COLUMN request_id DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN request_id DROP DEFAULT;
