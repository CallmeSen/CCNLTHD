export interface AnalyzeRequest {
  request: string
  lang?: 'en' | 'vi'
}

export interface AnalyzeResponse {
  run_id: string
  status: string
  report: string
  user_profile?: Record<string, unknown>
  proposed_portfolio?: Record<string, number>
  metrics?: Record<string, unknown>
  validation_result?: ValidationResult
}

export interface ValidationResult {
  status: string
  errors?: string[]
  warnings?: string[]
}

export interface HistoryItem {
  run_id: string
  request: string
  timestamp: string
  status: string
  lang: string
}

export interface ReportResponse {
  run_id: string
  status: string
  report: string
  created_at?: string
  user_profile?: Record<string, unknown>
  proposed_portfolio?: Record<string, number>
  metrics?: Record<string, unknown>
  validation_result?: ValidationResult
  llm_commentary?: string | null
  market_news?: string | null
  visualization_url?: string | null
  lang?: string | null
}

export interface HealthStatus {
  status: string
  database: string
  timestamp: string
}

export interface Client {
  client_id: string
  name: string
  age: number
  city: string
  risk_tolerance: string
  investment_horizon_years: number
  investment_goal: string
  annual_income_inr: number
  registration_date: string
}

export interface MutualFund {
  fund_id: string
  isin: string
  fund_name: string
  amc: string
  category: string
  plan_type: string
  option_type: string
  expense_ratio: number
  inception_date: string
  benchmark: string
}

export interface Portfolio {
  portfolio_id: string
  client_id: string
  snapshot_date: string
  total_value_inr: number
  num_holdings: number
}

export interface AgentStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'done' | 'error'
  description: string
  icon?: string
}
