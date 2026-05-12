import { apiClient } from './apiClient'

export type RiskProfile = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'

export interface HoldingDto {
  ticker: string
  quantity: number
  avgPrice: number
}

export interface PortfolioDto {
  id: string
  userId: string
  name: string
  description?: string
  riskProfile: RiskProfile
  active: boolean
  createdAt: string
  tickers: string[]
  holdings: HoldingDto[]
}

export interface CreatePortfolioInput {
  name: string
  description?: string
  riskProfile: RiskProfile
}

export interface AddStockInput {
  ticker: string
  quantity: number
  avgPrice: number
}

// ─── Portfolio analytics types ────────────────────────────────────────────────

export interface TickerMetrics {
  ticker: string
  quantity: number
  avgPrice: number
  currentPrice: number
  marketValue: number
  weight: number
  pnlPct: number
  expectedReturnAnnualPct: number
  volatilityAnnualPct: number
}

export interface RebalanceAction {
  ticker: string
  currentWeightPct: number
  targetWeightPct: number
  deltaWeightPct: number
  action: 'BUY' | 'SELL'
  quantityDelta: number
  currentPrice: number
  estimatedTransactionVnd: number
}

export interface PortfolioAnalytics {
  totalValueVnd: number
  totalPnlVnd: number
  expectedReturnAnnualPct: number
  volatilityAnnualPct: number
  sharpeRatio: number
  beta: number
  riskFreeRatePct: number
  metricsPerTicker: TickerMetrics[]
  rebalanceActions: RebalanceAction[]
}

// ─── API functions ────────────────────────────────────────────────────────────

export const getMyPortfolios = (): Promise<PortfolioDto[]> =>
  apiClient.get<PortfolioDto[]>('/portfolios').then((r) => r.data)

export const createPortfolio = (input: CreatePortfolioInput): Promise<PortfolioDto> =>
  apiClient.post<PortfolioDto>('/portfolios', input).then((r) => r.data)

export const addStockToPortfolio = (portfolioId: string, stock: AddStockInput): Promise<PortfolioDto> =>
  apiClient
    .post<PortfolioDto>(`/portfolios/${portfolioId}/stocks`, {
      ticker: stock.ticker,
      quantity: stock.quantity,
      avgPrice: stock.avgPrice,
    })
    .then((r) => r.data)

export const removeStockFromPortfolio = (
  portfolioId: string,
  ticker: string,
): Promise<PortfolioDto> =>
  apiClient
    .delete<PortfolioDto>(`/portfolios/${portfolioId}/stocks/${ticker}`)
    .then((r) => r.data)

export const updateRiskProfile = (
  portfolioId: string,
  riskProfile: RiskProfile,
): Promise<PortfolioDto> =>
  apiClient
    .patch<PortfolioDto>(`/portfolios/${portfolioId}/risk-profile`, null, {
      params: { riskProfile },
    })
    .then((r) => r.data)

export const deletePortfolio = (portfolioId: string): Promise<void> =>
  apiClient.delete(`/portfolios/${portfolioId}`).then(() => undefined)

export const getPortfolioAnalytics = (portfolioId: string): Promise<PortfolioAnalytics> =>
  apiClient
    .get<PortfolioAnalytics>(`/portfolios/${portfolioId}/analytics`)
    .then((r) => r.data)

/**
 * Ensure at least 1 year of daily price history is ingested for a ticker.
 * Safe to call repeatedly — the backend deduplicates existing bars.
 */
export const ensureTickerHistory = (ticker: string): Promise<void> => {
  const to = new Date().toISOString().split('T')[0]
  const fromDate = new Date()
  fromDate.setFullYear(fromDate.getFullYear() - 1)
  const from = fromDate.toISOString().split('T')[0]
  return apiClient
    .post(`/market/stocks/${ticker}/fetch`, null, { params: { interval: '1D', from, to } })
    .then(() => undefined)
    .catch(() => undefined) // non-critical, ignore errors
}
