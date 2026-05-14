/**
 * ThinkingTimeline Component
 * Hiển thị tiến trình xử lý của agent (tool calls theo thứ tự)
 */

import { Check, AlertCircle, Loader } from 'lucide-react';
import type { ToolCallEntry } from '../../types/agent';

interface ThinkingTimelineProps {
  toolCalls: ToolCallEntry[];
  isStreaming: boolean;
}

export const ThinkingTimeline: React.FC<ThinkingTimelineProps> = ({
  toolCalls,
  isStreaming,
}) => {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  const formatTime = (ms: number | undefined) => {
    if (!ms) return '';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="my-6 px-4 md:px-0">
      <p className="text-sm font-semibold text-gray-600 mb-4">Quá trình xử lý:</p>
      <div className="space-y-4">
        {toolCalls.map((tool, idx) => (
          <div key={tool.id} className="flex gap-4">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  tool.status === 'done'
                    ? 'bg-green-100'
                    : tool.status === 'error'
                      ? 'bg-red-100'
                      : tool.status === 'running'
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                }`}
              >
                {tool.status === 'done' && (
                  <Check className="w-6 h-6 text-green-600" />
                )}
                {tool.status === 'error' && (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
                {tool.status === 'running' && (
                  <Loader className="w-6 h-6 text-blue-600 animate-spin" />
                )}
                {tool.status === 'pending' && (
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                )}
              </div>
              {/* Vertical line */}
              {idx < toolCalls.length - 1 && (
                <div className="w-1 h-8 bg-gray-200 my-2"></div>
              )}
            </div>

            {/* Tool info */}
            <div className="flex-1 py-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm md:text-base">
                    {tool.tool}
                  </p>
                  {tool.preview && (
                    <p className="text-xs md:text-sm text-gray-600 mt-1 break-words">
                      {tool.preview}
                    </p>
                  )}
                </div>
                {tool.elapsed_ms && (
                  <span className="text-xs md:text-sm text-gray-500 flex-shrink-0 ml-2">
                    {formatTime(tool.elapsed_ms)}
                  </span>
                )}
              </div>

              {/* Arguments */}
              {tool.arguments && Object.keys(tool.arguments).length > 0 && (
                <details className="mt-2 group">
                  <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-700 font-medium">
                    Tham số ({Object.keys(tool.arguments).length})
                  </summary>
                  <div className="mt-2 pl-3 border-l-2 border-gray-200 space-y-1">
                    {Object.entries(tool.arguments).map(([key, value]) => (
                      <div key={key} className="text-xs text-gray-600">
                        <span className="font-mono text-gray-700">{key}</span>
                        <span className="text-gray-400">: </span>
                        <span className="font-mono text-gray-600">
                          {typeof value === 'string' && value.length > 50
                            ? `${value.substring(0, 50)}...`
                            : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Error message */}
              {tool.error && (
                <p className="text-xs md:text-sm text-red-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {tool.error}
                </p>
              )}

              {/* Result */}
              {tool.result && (
                <details className="mt-2 group">
                  <summary className="cursor-pointer text-xs text-green-600 hover:text-green-700 font-medium">
                    Kết quả
                  </summary>
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 font-mono break-words max-h-32 overflow-y-auto">
                    {typeof tool.result === 'string'
                      ? tool.result
                      : JSON.stringify(tool.result, null, 2)}
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}

        {/* Current streaming indicator */}
        {isStreaming && (
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="flex-1 py-2">
              <p className="text-sm text-gray-600">Đang xử lý...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
