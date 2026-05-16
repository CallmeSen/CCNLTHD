import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import StockDetailScreen from '../features/market/components/StockDetailScreen'
import { fetchStockByTicker } from '../services/stockApi'

export default function StockDetailPage() {
  const { ticker } = useParams()
  const normalizedTicker = ticker?.toUpperCase()
  const { data: stock, isLoading } = useQuery({
    queryKey: ['stock-detail', normalizedTicker],
    queryFn: () => fetchStockByTicker(normalizedTicker),
    enabled: Boolean(normalizedTicker),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Đang tải dữ liệu...
      </div>
    )
  }

  if (!stock) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold text-foreground">Không tìm thấy mã cổ phiếu</h2>
        <p className="text-muted-foreground mt-1">Mã {ticker} không có trong hệ thống.</p>
      </div>
    )
  }

  return <StockDetailScreen {...stock} />
}
