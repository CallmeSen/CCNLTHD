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

const STOCK_TICKERS = [
  'FPT',
  'VCB',
  'HPG',
  'VNM',
  'MSN',
  'MWG',
  'PNJ',
  'SSI',
  'VIC',
  'VHM',
  'GAS',
  'BID',
  'CTG',
  'TCB',
  'MBB',
  'ACB',
  'VPB',
  'HDB',
  'SHB',
  'STB',
  'VRE',
  'SAB',
  'BVH',
  'PLX',
  'PVD',
  'PVS',
  'DGC',
  'DGW',
  'REE',
  'KDH',
  'NLG',
  'DXG',
  'NVL',
  'KBC',
  'BCM',
  'SZC',
  'GMD',
  'VTP',
  'HAH',
  'SCS',
  'FRT',
  'CMG',
  'CTR',
  'IDC',
  'VGC',
  'POW',
  'NT2',
  'PC1',
  'BWE',
  'DPM',
  'DCM',
  'ANV',
  'VHC',
  'PAN',
  'KSB',
  'HSG',
  'NKG',
  'CSV',
  'LAS',
  'QNS',
]

const randomInRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min
}

const MOCK_STOCKS: Stock[] = STOCK_TICKERS.map((ticker, index) => {
  const sign = index % 2 === 0 ? 1 : -1
  const changeMagnitude = randomInRange(0.1, 7.5)

  return {
    id: index + 1,
    ticker,
    companyName: `${ticker} Corporation`,
    currentPrice: Number(randomInRange(12, 180).toFixed(2)),
    volume: Math.floor(randomInRange(90_000, 7_500_000)),
    changePercent: Number((sign * changeMagnitude).toFixed(2)),
  }
})

export const fetchStocks = (page = 1, limit = 20): Promise<FetchStocksResponse> => {
  const safePage = Math.max(1, page)
  const safeLimit = Math.max(1, limit)
  const start = (safePage - 1) * safeLimit
  const end = start + safeLimit
  const totalPages = Math.ceil(MOCK_STOCKS.length / safeLimit)

  return new Promise((resolve) => {
    const delay = Math.floor(randomInRange(500, 801))

    setTimeout(() => {
      resolve({
        data: MOCK_STOCKS.slice(start, end),
        totalPages,
      })
    }, delay)
  })
}
