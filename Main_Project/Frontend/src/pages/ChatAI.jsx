import { useSearchParams } from 'react-router-dom'

export default function ChatAI() {
  const [searchParams] = useSearchParams()
  const ticker = searchParams.get('ticker')
  const action = searchParams.get('action')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-black">Chat với AI</h1>
        <p className="text-gray-600 mt-1">Hỏi đáp về cổ phiếu và phân tích thị trường</p>
      </div>

      {ticker && action === 'auto_analyze' && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm font-medium text-blue-900">
            🔍 Bối cảnh phân tích: Mã cổ phiếu <strong>{ticker}</strong>
          </p>
          <p className="text-sm text-blue-800 mt-1">
            Hãy hỏi AI để nhận được phân tích toàn diện về mã này, bao gồm: xu hướng giá, chỉ số tài chính, tâm lý thị trường, và khuyến nghị giao dịch.
          </p>
        </div>
      )}

      {/* Placeholder for Chat UI */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Chat interface sẽ được hiển thị tại đây</p>
          {ticker && <p className="text-xs text-gray-400 mt-2">Ticker: {ticker}</p>}
        </div>
      </div>
    </div>
  )
}
