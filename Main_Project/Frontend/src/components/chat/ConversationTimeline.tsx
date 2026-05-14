/**
 * ConversationTimeline Component
 * Hiển thị các dấu mốc của hội thoại (user messages)
 * Cho phép nhảy nhanh giữa các đoạn hội thoại
 */

import { MessageCircle } from 'lucide-react';
import type { AgentMessage } from '../../types/agent';

interface ConversationTimelineProps {
  messages: AgentMessage[];
  onJump: (messageId: string) => void;
}

export const ConversationTimeline: React.FC<ConversationTimelineProps> = ({
  messages,
  onJump,
}) => {
  // Lọc chỉ user messages
  const userMessages = messages.filter((m) => m.type === 'user');

  if (userMessages.length <= 1) {
    return null;
  }

  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex gap-2 pb-2">
        {userMessages.map((msg, idx) => (
          <button
            key={msg.id}
            onClick={() => onJump(msg.id)}
            className="flex-shrink-0 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-xs md:text-sm text-gray-700 font-medium whitespace-nowrap"
          >
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>Câu {idx + 1}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
