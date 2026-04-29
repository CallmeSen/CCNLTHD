import { useParams } from 'react-router-dom'
import StockDetailScreen from '../features/market/components/StockDetailScreen'

// Mock stock data để demo (thực tế sẽ fetch từ API)
const MOCK_STOCKS = [
  {
    ticker: 'FPT',
    companyName: 'FPT Corporation',
    currentPrice: 135000,
    changePercent: 2.5,
  },
  {
    ticker: 'VCB',
    companyName: 'Vietcombank',
    currentPrice: 98500,
    changePercent: -1.2,
  },
  {
    ticker: 'HPG',
    companyName: 'Hòa Phát Group',
    currentPrice: 28400,
    changePercent: 3.8,
  },
]

export default function StockDetailPage() {
  const { ticker } = useParams()
  const stock = MOCK_STOCKS.find((s) => s.ticker === ticker?.toUpperCase())

  if (!stock) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Không tìm thấy mã cổ phiếu</h2>
        <p className="text-gray-600 mt-1">Mã {ticker} không có trong hệ thống.</p>
      </div>
    )
  }

  return <StockDetailScreen {...stock} />
}
