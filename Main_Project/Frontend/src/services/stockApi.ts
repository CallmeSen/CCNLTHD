import { apiClient } from './apiClient'

export interface Stock {
  id: number
  ticker: string
  companyName: string
  currentPrice: number
  volume: number
  changePercent: number
}

export interface FetchStocksResponse {
  data: Stock[]
  totalPages: number
}

interface ApiStockResponse {
  id: number
  ticker: string
  companyName: string
  exchange: string
  sector?: string
  active: boolean
}

interface ApiPriceResponse {
  id: number
  ticker: string
  timestamp: string
  open?: number | null
  close: number
  volume?: number | null
  interval: string
}

let stockCache: Stock[] | null = null
let cacheTimer: ReturnType<typeof setTimeout> | null = null

async function loadAllStocks(): Promise<Stock[]> {
  if (stockCache) return stockCache

  const [stocksRes, pricesRes] = await Promise.all([
    apiClient.get<ApiStockResponse[]>('/market/stocks'),
    apiClient.get<ApiPriceResponse[]>('/market/prices/latest'),
  ])

  const priceMap = new Map<string, ApiPriceResponse>(
    pricesRes.data.map((p) => [p.ticker, p]),
  )

  const stocks: Stock[] = stocksRes.data.map((s) => {
    const price = priceMap.get(s.ticker)
    const close = price ? Number(price.close) : 0
    const open = price?.open != null ? Number(price.open) : close
    const changePercent = open > 0 ? ((close - open) / open) * 100 : 0

    return {
      id: s.id,
      ticker: s.ticker,
      companyName: s.companyName,
      currentPrice: close,
      volume: price?.volume ?? 0,
      changePercent: Number(changePercent.toFixed(2)),
    }
  })

  stockCache = stocks

  if (cacheTimer) clearTimeout(cacheTimer)
  cacheTimer = setTimeout(() => {
    stockCache = null
  }, 5 * 60 * 1000)

  return stocks
}

export const fetchStocks = async (page = 1, limit = 20): Promise<FetchStocksResponse> => {
  const allStocks = await loadAllStocks()
  const safePage = Math.max(1, page)
  const safeLimit = Math.max(1, limit)
  const start = (safePage - 1) * safeLimit
  const end = start + safeLimit
  const totalPages = Math.ceil(allStocks.length / safeLimit)

  return {
    data: allStocks.slice(start, end),
    totalPages,
  }
}

export const fetchStockByTicker = async (ticker: string): Promise<Stock | null> => {
  try {
    const [stockRes, priceRes] = await Promise.all([
      apiClient.get<ApiStockResponse>(`/market/stocks/${ticker}`),
      apiClient.get<ApiPriceResponse>(`/market/stocks/${ticker}/price/latest`),
    ])

    const s = stockRes.data
    const price = priceRes.data
    const close = Number(price.close)
    const open = price.open != null ? Number(price.open) : close
    const changePercent = open > 0 ? ((close - open) / open) * 100 : 0

    return {
      id: s.id,
      ticker: s.ticker,
      companyName: s.companyName,
      currentPrice: close,
      volume: price.volume ?? 0,
      changePercent: Number(changePercent.toFixed(2)),
    }
  } catch {
    return null
  }
}

export const fetchTopStocks = async (
  limit = 10,
): Promise<Array<{ ticker: string; price: number; changePct: number; spark: number[] }>> => {
  const pricesRes = await apiClient.get<ApiPriceResponse[]>('/market/prices/latest')
  const sorted = [...pricesRes.data]
    .filter((p) => p.volume != null && p.volume > 0)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, limit)

  return sorted.map((p) => {
    const close = Number(p.close)
    const open = p.open != null ? Number(p.open) : close
    const changePct = open > 0 ? ((close - open) / open) * 100 : 0
    return {
      ticker: p.ticker,
      price: close,
      changePct: Number(changePct.toFixed(2)),
      spark: [],
    }
  })
}

