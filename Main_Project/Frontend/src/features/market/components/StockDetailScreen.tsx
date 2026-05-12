import { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, TrendingUp, Activity, Sparkles } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useWatchlistStore } from '../../../store/useWatchlistStore'
import { apiClient } from '../../../services/apiClient'

interface ChartDataPoint {
  date: string
  price: number
  volume: number
}

interface PriceStats {
  high30d: number
  low30d: number
  avgVolume10d: number
  change30dPct: number
  sentiment: 'positive' | 'negative' | 'neutral'
}

interface StockDetailScreenProps {
  ticker?: string
  companyName?: string
  currentPrice?: number
  changePercent?: number
}

// Mock data: 30 điểm dữ liệu, trend lên
const generateChartData = (): ChartDataPoint[] => {
  const data: ChartDataPoint[] = []
  let basePrice = 128000

  for (let i = 0; i < 30; i++) {
    const fluctuation = Math.random() * 4000 - 1000 // Dao động ±1000 đến ±3000
    basePrice += fluctuation
    data.push({
      date: `Ngày ${i + 1}`,
      price: Math.max(basePrice, 125000), // Đảm bảo giá không quá thấp
    })
  }

  return data
}

// Fetch real price history from backend, fallback to seeded mock data
function usePriceHistory(ticker: string): { chartData: ChartDataPoint[]; stats: PriceStats | null } {
  const [chartData, setChartData] = useState<ChartDataPoint[]>(() => generateChartData())
  const [stats, setStats] = useState<PriceStats | null>(null)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get<{ timestamp: string; open?: string | number | null; close: string | number; volume?: string | number | null }[]>(
        `/market/stocks/${ticker}/price/daily?limit=30`,
      )
      .then((res) => {
        if (cancelled) return
        const rows = res.data
        if (!Array.isArray(rows) || rows.length === 0) return
        const mapped: ChartDataPoint[] = rows
          .slice()
          .reverse()
          .map((r) => ({
            date: r.timestamp.split('T')[0],
            price: Number(r.close) * 1000,
            volume: Number(r.volume ?? 0),
          }))
        setChartData(mapped)

        // Compute stats from price history
        const prices = mapped.map((d) => d.price)
        const volumes = mapped.map((d) => d.volume)
        const high30d = Math.max(...prices)
        const low30d = Math.min(...prices)
        const last10vol = volumes.slice(-10).filter((v) => v > 0)
        const avgVolume10d = last10vol.length > 0 ? last10vol.reduce((a, b) => a + b, 0) / last10vol.length : 0
        const first = prices[0] ?? 0
        const last = prices[prices.length - 1] ?? 0
        const change30dPct = first > 0 ? ((last - first) / first) * 100 : 0
        // Sentiment: based on last 5 trading days momentum
        const last5 = prices.slice(-5)
        const momentum = last5.length >= 2 ? last5[last5.length - 1] - last5[0] : 0
        const sentimentThreshold = first * 0.01 // 1% threshold
        const sentiment: PriceStats['sentiment'] =
          momentum > sentimentThreshold ? 'positive' : momentum < -sentimentThreshold ? 'negative' : 'neutral'

        setStats({ high30d, low30d, avgVolume10d, change30dPct, sentiment })
      })
      .catch(() => { /* keep mock data on error */ })
    return () => { cancelled = true }
  }, [ticker])

  return { chartData, stats }
}

// Custom Tooltip cho Recharts
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const raw: string = payload[0].payload.date
    const label = raw.match(/^\d{4}-\d{2}-\d{2}$/)
      ? Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
          new Date(`${raw}T00:00:00Z`),
        )
      : raw
    return (
      <div className="rounded-lg bg-white p-3 shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-sm font-semibold text-blue-600">
          {payload[0].value.toLocaleString('vi-VN')} đ
        </p>
      </div>
    )
  }
  return null
}

// Header section
const StockHeader = ({
  ticker = 'FPT',
  companyName = 'FPT Corporation',
  currentPrice = 135000,
  changePercent = 2.5,
  isInWatchlist,
  onToggleWatchlist,
}: {
  ticker: string
  companyName: string
  currentPrice: number
  changePercent: number
  isInWatchlist: boolean
  onToggleWatchlist: () => void
}) => {
  const isPositive = changePercent > 0

  return (
    <div className="flex justify-between items-start gap-6">
      <div>
        <h1 className="text-4xl font-extrabold !text-black">{ticker}</h1>
        <p className="text-sm text-black font-medium mt-1">{companyName}</p>
      </div>

      <div className="text-right">
        <div className="flex items-end gap-3 mb-3 justify-end">
          <p className="text-3xl font-bold text-gray-900">
            {currentPrice.toLocaleString('vi-VN')} đ
          </p>
          <div
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-semibold text-sm ${
              isPositive
                ? 'bg-emerald-50 text-emerald-500'
                : 'bg-red-50 text-red-500'
            }`}
          >
            {isPositive ? '+' : ''}
            {changePercent.toFixed(2)}%
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleWatchlist}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
        >
          <Star
            className={`h-4 w-4 ${
              isInWatchlist ? 'fill-amber-400 text-amber-400' : 'text-gray-400'
            }`}
          />
          {isInWatchlist ? 'Đã lưu' : 'Thêm vào Watchlist'}
        </button>
      </div>
    </div>
  )
}

// Chart section styled like VN-Index but per-stock
const ChartSection = ({
  chartData,
  currentPrice,
  changePercent,
}: {
  chartData: ChartDataPoint[]
  currentPrice: number
  changePercent: number
}) => {
  // determine trend color from first->last
  const first = chartData[0]?.price ?? currentPrice
  const last = chartData[chartData.length - 1]?.price ?? currentPrice
  const isUp = last >= first
  const strokeColor = isUp ? '#10b981' : '#ef4444'
  const gradientId = isUp ? 'colorPriceUp' : 'colorPriceDown'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="p-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gray-100 grid place-items-center text-gray-700">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 19V5" strokeLinecap="round" />
              <path d="M4 19h16" strokeLinecap="round" />
              <path d="M7 15l3-4 3 2 4-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-extrabold text-black">Biểu đồ giá</div>
            <div className="text-xs text-gray-700 font-medium">Theo dõi diễn biến giá</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-4xl font-extrabold text-black">{currentPrice.toLocaleString('vi-VN')} đ</div>
          <div className={`mt-1 inline-flex items-center gap-2 px-2.5 py-1 rounded-full ${isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {isUp ? '+' : ''}{changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="h-[400px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.28} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              interval={Math.floor(chartData.length / 6)}
              tickFormatter={(v: string) =>
                v.match(/^\d{4}-\d{2}-\d{2}$/)
                  ? Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(
                      new Date(`${v}T00:00:00Z`),
                    )
                  : v
              }
            />
            <YAxis domain={[(min: number) => Math.round(min * 0.98), (max: number) => Math.round(max * 1.02)]} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} width={70} tickFormatter={(v: number) => v.toLocaleString('vi-VN')} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="price" stroke={strokeColor} strokeWidth={2.5} fillOpacity={1} fill={`url(#${gradientId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Sentiment card — driven by real 5-day price momentum
const SentimentCard = ({ stats }: { stats: PriceStats | null }) => {
  const sentiment = stats?.sentiment ?? 'neutral'
  const config = {
    positive: { label: 'Tích cực', icon: TrendingUp, cls: 'bg-emerald-100 text-emerald-700' },
    negative: { label: 'Tiêu cực', icon: Activity, cls: 'bg-red-100 text-red-700' },
    neutral: { label: 'Trung tính', icon: Activity, cls: 'bg-gray-100 text-gray-700' },
  }[sentiment]
  const Icon = config.icon

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <p className="text-sm font-extrabold text-black mb-3">Tâm lý AI đánh giá:</p>
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${config.cls}`}>
        <Icon className="h-5 w-5" />
        <span className="font-bold">{config.label}</span>
      </div>
      {stats && (
        <p className="mt-2 text-xs text-gray-500">
          Dựa trên động lượng giá 5 phiên gần nhất
        </p>
      )}
    </div>
  )
}

// Financial metrics card — computed from real 30-day price history
const FinancialMetricsCard = ({ stats }: { stats: PriceStats | null }) => {
  const fmt = (n: number) => n.toLocaleString('vi-VN')
  const fmtVol = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return n.toFixed(0)
  }

  const metrics = stats
    ? [
        { label: 'Giá cao 30 ngày', value: `${fmt(stats.high30d)} đ` },
        { label: 'Giá thấp 30 ngày', value: `${fmt(stats.low30d)} đ` },
        { label: 'KL TB 10 ngày', value: fmtVol(stats.avgVolume10d) },
        {
          label: '% Thay đổi 30 ngày',
          value: `${stats.change30dPct >= 0 ? '+' : ''}${stats.change30dPct.toFixed(2)}%`,
        },
      ]
    : [
        { label: 'Giá cao 30 ngày', value: '—' },
        { label: 'Giá thấp 30 ngày', value: '—' },
        { label: 'KL TB 10 ngày', value: '—' },
        { label: '% Thay đổi 30 ngày', value: '—' },
      ]

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-extrabold text-black mb-4">Chỉ số tài chính</h3>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex flex-col">
            <p className="text-xs text-gray-500 mb-1">{metric.label}</p>
            <p className="font-bold text-gray-900">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Stats section (Sentiment + Financial)
const StatsSection = ({ ticker, stats }: { ticker: string; stats: PriceStats | null }) => {
  const navigate = useNavigate()

  const handleAnalyzeWithAI = () => {
    navigate(`/chatai?ticker=${ticker}&action=auto_analyze`)
  }

  return (
    <div className="flex flex-col gap-4">
      <SentimentCard stats={stats} />
      <FinancialMetricsCard stats={stats} />

      {/* CTA Button */}
      <button
        type="button"
        onClick={handleAnalyzeWithAI}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg hover:scale-105 transition-transform duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
      >
        <Sparkles className="h-5 w-5" />
        Phân tích toàn diện mã này với AI
      </button>
    </div>
  )
}

// Main component
export default function StockDetailScreen(props: StockDetailScreenProps) {
  const {
    ticker = 'FPT',
    companyName = 'FPT Corporation',
    currentPrice = 135000,
    changePercent = 2.5,
  } = props

  const { watchlistTickers, toggleWatchlist } = useWatchlistStore()
  const isInWatchlist = watchlistTickers.includes(ticker)
  const { chartData, stats } = usePriceHistory(ticker)

  const handleToggleWatchlist = () => {
    toggleWatchlist(ticker)
  }

  return (
    <section className="space-y-6">
      <StockHeader
        ticker={ticker}
        companyName={companyName}
        currentPrice={currentPrice}
        changePercent={changePercent}
        isInWatchlist={isInWatchlist}
        onToggleWatchlist={handleToggleWatchlist}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        {/* Left column - Chart */}
        <div className="lg:col-span-8">
          <ChartSection chartData={chartData} currentPrice={currentPrice} changePercent={changePercent} />
        </div>

        {/* Right column - Stats */}
        <div className="lg:col-span-4">
          <StatsSection ticker={ticker} stats={stats} />
        </div>
      </div>
    </section>
  )
}
