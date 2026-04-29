import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, TrendingUp, Activity, Sparkles } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useWatchlistStore } from '../../../store/useWatchlistStore'

interface ChartDataPoint {
  date: string
  price: number
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

// Mock financial data
const FINANCIAL_METRICS = {
  pe: '18.5',
  eps: '7,320 đ',
  marketCap: '1.2 tỷ USD',
  volume24h: '85.3M',
}

// Custom Tooltip cho Recharts
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-white p-3 shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-900">
          {payload[0].payload.date}
        </p>
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
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} interval={Math.floor(chartData.length / 6)} />
            <YAxis domain={["dataMin - 1000", "dataMax + 1000"]} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} width={70} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="price" stroke={strokeColor} strokeWidth={2.5} fillOpacity={1} fill={`url(#${gradientId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Sentiment card
const SentimentCard = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <p className="text-sm font-extrabold text-black mb-3">Tâm lý AI đánh giá:</p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100">
        <TrendingUp className="h-5 w-5 text-emerald-600" />
        <span className="font-bold text-emerald-700">Tích cực</span>
      </div>
    </div>
  )
}

// Financial metrics card
const FinancialMetricsCard = () => {
  const metrics = [
    { label: 'P/E', value: FINANCIAL_METRICS.pe },
    { label: 'EPS', value: FINANCIAL_METRICS.eps },
    { label: 'Vốn hóa', value: FINANCIAL_METRICS.marketCap },
    { label: 'Khối lượng 24h', value: FINANCIAL_METRICS.volume24h },
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
const StatsSection = ({ ticker }: { ticker: string }) => {
  const navigate = useNavigate()

  const handleAnalyzeWithAI = () => {
    navigate(`/chatai?ticker=${ticker}&action=auto_analyze`)
  }

  return (
    <div className="flex flex-col gap-4">
      <SentimentCard />
      <FinancialMetricsCard />

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
  const chartData = useMemo(() => generateChartData(), [])

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
          <StatsSection ticker={ticker} />
        </div>
      </div>
    </section>
  )
}
