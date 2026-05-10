import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import StockDetailScreen from '../features/market/components/StockDetailScreen'
import { fetchStockByTicker } from '../services/stockApi'

export default function StockDetailPage() {
  const { ticker } = useParams()
  const [stock, setStock] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ticker) return
    setLoading(true)
    fetchStockByTicker(ticker.toUpperCase())
      .then(setStock)
      .finally(() => setLoading(false))
  }, [ticker])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        Đang tải dữ liệu...
      </div>
    )
  }

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
