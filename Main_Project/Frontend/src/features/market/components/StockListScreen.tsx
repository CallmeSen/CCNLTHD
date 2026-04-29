import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Star } from 'lucide-react'
import { useStocks } from '../../../hooks/useStocks'
import { useWatchlistStore } from '../../../store/useWatchlistStore'
import type { Stock } from '../../../services/stockApi'

interface StockTableProps {
  stocks: Stock[]
  watchlistTickers: string[]
  onToggleWatchlist: (ticker: string) => void
  isPageTransitioning: boolean
  onRowClick?: (ticker: string) => void
}

interface PaginationBarProps {
  currentPage: number
  totalPages: number
  onPrevPage: () => void
  onNextPage: () => void
}

const SkeletonRows = () => {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={`skeleton-${index}`} className="border-b border-gray-100">
          <td className="px-4 py-3">
            <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
          </td>
        </tr>
      ))}
    </tbody>
  )
}

const StockTable = ({
  stocks,
  watchlistTickers,
  onToggleWatchlist,
  isPageTransitioning,
  onRowClick,
}: StockTableProps) => {
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white overflow-hidden">
      {isPageTransitioning && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs text-gray-600 shadow-sm border border-gray-100">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Đang tải</span>
        </div>
      )}

      <div className={isPageTransitioning ? 'opacity-50 pointer-events-none transition' : 'transition'}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Ticker</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Tên công ty</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Giá hiện tại</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Khối lượng</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">% Thay đổi</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const isPositive = stock.changePercent > 0
              const isInWatchlist = watchlistTickers.includes(stock.ticker)

              return (
                <tr
                  key={stock.id}
                  className="border-b border-gray-100 hover:bg-blue-50 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md"
                  onClick={() => onRowClick?.(stock.ticker)}
                >
                  <td className="px-4 py-3 font-semibold text-gray-900 hover:text-blue-600">{stock.ticker}</td>
                  <td className="px-4 py-3 text-gray-700">{stock.companyName}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{stock.currentPrice.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{stock.volume.toLocaleString('vi-VN')}</td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      isPositive ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {stock.changePercent.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onToggleWatchlist(stock.ticker)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                      aria-label={`Toggle watchlist ${stock.ticker}`}
                    >
                      <Star
                        className={`h-4.5 w-4.5 ${
                          isInWatchlist ? 'fill-amber-400 text-amber-400' : 'text-gray-400'
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const PaginationBar = ({ currentPage, totalPages, onPrevPage, onNextPage }: PaginationBarProps) => {
  const isPrevDisabled = currentPage === 1
  const isNextDisabled = currentPage === totalPages

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onPrevPage}
        disabled={isPrevDisabled}
        className={`rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition-colors ${
          isPrevDisabled
            ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        Trang trước
      </button>

      <p className="text-sm font-medium text-gray-700">Trang {currentPage} / {totalPages}</p>

      <button
        type="button"
        onClick={onNextPage}
        disabled={isNextDisabled}
        className={`rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition-colors ${
          isNextDisabled
            ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        Trang sau
      </button>
    </div>
  )
}

export default function StockListScreen() {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)

  const { data, isLoading, isFetching, isPlaceholderData } = useStocks(currentPage)
  const { watchlistTickers, toggleWatchlist } = useWatchlistStore()

  const stocks = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const isPageTransitioning = !isLoading && (isFetching || isPlaceholderData)

  const canGoNext = useMemo(() => currentPage < totalPages, [currentPage, totalPages])

  const handlePrevPage = () => {
    setCurrentPage((prevPage) => Math.max(1, prevPage - 1))
  }

  const handleNextPage = () => {
    if (!canGoNext) return
    setCurrentPage((prevPage) => prevPage + 1)
  }

  const handleRowClick = (ticker: string) => {
    navigate(`/stock/${ticker}`)
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-extrabold !text-black">Danh sách cổ phiếu</h2>
        
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Ticker</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Tên công ty</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Giá hiện tại</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Khối lượng</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">% Thay đổi</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Hành động</th>
              </tr>
            </thead>
            <SkeletonRows />
          </table>
        </div>
      ) : (
        <>
          <StockTable
            stocks={stocks}
            watchlistTickers={watchlistTickers}
            onToggleWatchlist={toggleWatchlist}
            isPageTransitioning={isPageTransitioning}
            onRowClick={handleRowClick}
          />
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
          />
        </>
      )}
    </section>
  )
}
