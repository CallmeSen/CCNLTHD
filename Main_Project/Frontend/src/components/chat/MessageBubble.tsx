/**
 * MessageBubble Component
 * Hiển thị một message trong hội thoại
 */

import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { PortfolioReport } from './PortfolioReport';
import type { AgentMessage, ToolCallEntry } from '../../types/agent';

interface MessageBubbleProps {
  message: AgentMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const formatTime = (ms: number | undefined) => {
    if (!ms) return '';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // User message
  if (message.type === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 bg-blue-500 text-white rounded-lg rounded-br-none shadow">
          <p className="text-sm md:text-base break-words">{message.content}</p>
          <p className="text-xs text-blue-100 mt-1 opacity-70">
            {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    );
  }

  // Error message
  if (message.type === 'error') {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 bg-red-50 border border-red-200 rounded-lg shadow">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-700 text-sm md:text-base">Lỗi</p>
              <p className="text-red-600 text-sm mt-1 break-words">{message.content}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Thinking message
  if (message.type === 'thinking') {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 bg-gray-100 rounded-lg shadow">
          <div className="flex items-start gap-2">
            <div className="flex gap-1 mt-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <div className="flex-1">
              <p className="text-gray-600 text-sm italic">{message.content}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact message
  if (message.type === 'compact') {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-xs md:max-w-md lg:max-w-lg px-3 py-2 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs">
          {message.content}
        </div>
      </div>
    );
  }

  // Tool call message
  if (message.type === 'tool_call' && message.toolCalls) {
    return (
      <div className="flex justify-start mb-4 space-y-2">
        {message.toolCalls.map((tool) => (
          <div
            key={tool.id}
            className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg shadow"
          >
            <div className="flex items-start gap-2">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  tool.status === 'done'
                    ? 'bg-green-500'
                    : tool.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                }`}
              >
                {tool.status === 'done' && <CheckCircle className="w-4 h-4 text-white" />}
                {tool.status === 'error' && <AlertCircle className="w-4 h-4 text-white" />}
                {tool.status === 'running' && (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">{tool.tool}</p>
                {tool.preview && (
                  <p className="text-xs text-gray-600 mt-1 break-words">{tool.preview}</p>
                )}
                {tool.elapsed_ms && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(tool.elapsed_ms)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Tool result message
  if (message.type === 'tool_result') {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg shadow">
          <p className="font-semibold text-gray-800 text-sm mb-2">
            Kết quả: {message.tool}
          </p>
          {message.preview && (
            <p className="text-sm text-gray-700 mb-2 break-words">{message.preview}</p>
          )}
          {message.error && (
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {message.error}
            </p>
          )}
          {message.elapsed_ms && (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(message.elapsed_ms)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Answer/Assistant message
  if (message.type === 'answer' || message.type === 'run_complete') {
    // Check if content is a portfolio report
    const isPortfolioReport = 
      message.content && 
      (message.content.includes('Financial Portfolio Report') || 
       message.content.includes('Portfolio Performance Metrics') ||
       message.content.includes('Portfolio Allocation'));

    if (isPortfolioReport) {
      return (
        <div className="flex justify-start mb-4 w-full">
          <div className="w-full">
            <PortfolioReport content={message.content} />
            <p className="text-xs text-gray-400 mt-2 text-right">
              {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 bg-white border border-gray-200 rounded-lg shadow">
          <p className="text-sm md:text-base text-gray-800 break-words">{message.content}</p>
          {message.runId && (
            <p className="text-xs text-gray-500 mt-2">Run ID: {message.runId}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    );
  }

  return null;
};
