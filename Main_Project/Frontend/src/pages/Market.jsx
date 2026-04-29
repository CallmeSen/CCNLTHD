import StockListScreen from '../features/market/components/StockListScreen'

export default function Market() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold !text-black">Khám phá thị trường</h1>
        <p className="text-sm text-gray-700 mt-2 font-medium">
          Theo dõi và phân tích các mã cổ phiếu tiềm năng
        </p>
      </div>

      <StockListScreen />
    </div>
  )
}
