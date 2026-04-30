import axios from 'axios'
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  HistoryItem,
  ReportResponse,
  HealthStatus,
  Client,
  MutualFund,
  Portfolio,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(msg))
  },
)

export const healthApi = {
  check: () => api.get<HealthStatus>('/health').then((r) => r.data),
}

export const analysisApi = {
  submit: (payload: AnalyzeRequest) =>
    api.post<AnalyzeResponse>('/portfolio/analyze', payload).then((r) => r.data),
}

export const historyApi = {
  list: () => api.get<HistoryItem[]>('/portfolio/history').then((r) => r.data),
}

export const reportApi = {
  get: (runId: string) =>
    api.get<ReportResponse>(`/portfolio/report/${runId}`).then((r) => r.data),
}

export const clientsApi = {
  list: (skip = 0, limit = 20) =>
    api.get<Client[]>(`/clients?skip=${skip}&limit=${limit}`).then((r) => r.data),
  get: (clientId: string) =>
    api.get<Client>(`/clients/${clientId}`).then((r) => r.data),
  portfolios: (clientId: string) =>
    api.get<Portfolio[]>(`/clients/${clientId}/portfolios`).then((r) => r.data),
}

export const fundsApi = {
  list: (skip = 0, limit = 20, category?: string) => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) })
    if (category) params.append('category', category)
    return api.get<MutualFund[]>(`/funds?${params}`).then((r) => r.data)
  },
}

export default api
