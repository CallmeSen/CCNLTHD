import StockListScreen from '../features/market/components/StockListScreen'

export default function Market() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground">Khám phá thị trường</h1>
        <p className="text-sm text-muted-foreground mt-2 font-medium">
          Theo dõi và phân tích các mã cổ phiếu tiềm năng
        </p>
      </div>

      <StockListScreen />
    </div>
  )
}
