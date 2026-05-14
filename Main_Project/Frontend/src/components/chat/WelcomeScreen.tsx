/**
 * WelcomeScreen Component
 * Hiển thị giao diện chào mừng khi chưa có hội thoại
 */

import { MessageCircle, Zap, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WelcomeScreenProps {
  onPromptSelect: (prompt: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPromptSelect }) => {
  const navigate = useNavigate();

  const suggestedPrompts = [
    'Phân tích portfolio hiện tại của tôi',
    'Tôi có $10,000 nên đầu tư vào đâu?',
    'Chiến lược đầu tư cho 5 năm tiếp theo',
    'So sánh cổ phiếu technology hiện nay',
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      {/* Logo/Icon */}
      <div className="mb-8 flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full shadow-lg">
        <MessageCircle className="w-10 h-10 text-white" />
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-gray-900 mb-3 text-center">
        AI Investment Advisor
      </h1>

      {/* Subtitle */}
      <p className="text-xl text-gray-600 mb-12 text-center max-w-2xl">
        Hỏi về chiến lược đầu tư, phân tích cổ phiếu, hoặc quản lý portfolio của bạn
      </p>

      {/* Suggested Prompts */}
      <div className="w-full max-w-2xl mb-12">
        <p className="text-sm font-semibold text-gray-500 mb-4 px-4">Gợi ý:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onPromptSelect(prompt)}
              className="p-4 text-left bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  {prompt}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex gap-4 flex-wrap justify-center">
        <button
          onClick={() => navigate('/analysis')}
          className="px-6 py-3 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium hover:shadow-md transition-all duration-200"
        >
          Phân Tích
        </button>
        <button
          onClick={() => navigate('/history')}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-200 flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          Lịch Sử
        </button>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>Chatbot hỗ trợ bởi AI multi-agent</p>
        <p>Tất cả dữ liệu được xử lý an toàn</p>
      </div>
    </div>
  );
};
