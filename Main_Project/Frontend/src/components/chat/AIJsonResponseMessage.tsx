/**
 * AIJsonResponseMessage.tsx
 * 
 * Componente especializado para exibir respostas JSON do AI
 * Segundo especificação: AI_OUTPUT_SPECIFICATION.md
 * 
 * Features:
 * - Parse JSON response com try-catch
 * - Hiển thị summary mặc định
 * - Toggle "Xem chi tiết" để xem details
 * - Status badge (success/warning/error)
 * - Metadata footer (processingTime, agentsUsed, confidence)
 * - Markdown rendering cho details
 * - Tailwind CSS professional styling
 * - Full error handling
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ChevronDown,
  CheckCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react';

/**
 * Interface cho AI JSON Response theo spec
 */
interface AIJsonResponse {
  summary: string;
  details: string;
  status: 'success' | 'warning' | 'error';
  metadata: {
    processingTime: string;
    agentsUsed: string[];
    confidence: number;
  };
}

interface AIJsonResponseMessageProps {
  content: string; // Raw JSON hoặc parsed object
  timestamp?: Date;
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: 'success' | 'warning' | 'error' }) {
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      iconColor: 'text-green-600',
      label: 'Thành công',
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-700',
      iconColor: 'text-amber-600',
      label: 'Cảnh báo',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      iconColor: 'text-red-600',
      label: 'Lỗi',
    },
  };

  const c = config[status];
  const Icon = c.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${c.bgColor} border ${c.borderColor}`}>
      <Icon className={`w-4 h-4 ${c.iconColor}`} />
      <span className={`text-xs font-medium ${c.textColor}`}>{c.label}</span>
    </div>
  );
}

/**
 * Markdown Content Renderer
 */
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:my-2">
      <ReactMarkdown
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-gray-900 mt-3 mb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-gray-800 mt-3 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-gray-800 mt-2 mb-1">
              {children}
            </h3>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-sm text-gray-700 mb-2 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-sm text-gray-700 mb-2 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="ml-2">{children}</li>,

          // Code
          code: ({ inline, children }: any) => (
            <code
              className={`${
                inline
                  ? 'bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800'
                  : 'block bg-gray-100 p-3 rounded-lg overflow-x-auto text-xs font-mono text-gray-800 my-2'
              }`}
            >
              {children}
            </code>
          ),

          // Tables
          table: ({ children }) => (
            <table className="w-full text-sm border-collapse my-2 border border-gray-300 rounded overflow-hidden">
              {children}
            </table>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 border-b border-gray-300">
              {children}
            </thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-gray-300 last:border-b-0">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="text-left px-3 py-2 font-semibold text-gray-800 border-r border-gray-300 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-gray-700 border-r border-gray-300 last:border-r-0">
              {children}
            </td>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-2 py-2">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Main Component: AIJsonResponseMessage
 */
export const AIJsonResponseMessage: React.FC<AIJsonResponseMessageProps> = ({
  content,
  timestamp,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Parse JSON
  let response: AIJsonResponse | null = null;
  let parseError: string | null = null;

  try {
    const trimmed = (typeof content === 'string' ? content : JSON.stringify(content)).trim();

    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      throw new Error('Response không phải JSON format');
    }

    const parsed = JSON.parse(trimmed);

    // Validate required fields
    const required = ['summary', 'details', 'status', 'metadata'];
    for (const field of required) {
      if (!(field in parsed)) {
        throw new Error(`Thiếu trường: ${field}`);
      }
    }

    // Validate status
    if (!['success', 'warning', 'error'].includes(parsed.status)) {
      throw new Error(`Status không hợp lệ: ${parsed.status}`);
    }

    response = parsed as AIJsonResponse;
  } catch (error) {
    parseError =
      error instanceof Error ? error.message : 'Lỗi không xác định';
  }

  // Error state
  if (parseError || !response) {
    return (
      <div className="flex justify-start mb-4 w-full max-w-2xl">
        <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-700 text-sm mb-1">
                Lỗi Xử Lý Response
              </h3>
              <p className="text-sm text-red-600 mb-2">{parseError}</p>
              {typeof content === 'string' && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-red-600 hover:text-red-700">
                    Xem raw response
                  </summary>
                  <pre className="mt-2 bg-white p-2 rounded border border-red-200 text-xs overflow-auto max-h-48 text-gray-800">
                    {content}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { summary, details, status, metadata } = response;
  const confidencePercent = Math.round((metadata.confidence || 0) * 100);

  return (
    <div className="flex justify-start mb-4 w-full max-w-2xl">
      <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
        {/* Header - Summary Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between gap-3 mb-2">
            <StatusBadge status={status} />
            {metadata.confidence !== null && (
              <span className="text-xs text-gray-500">
                Độ tin cậy: <span className="font-semibold text-gray-700">{confidencePercent}%</span>
              </span>
            )}
          </div>

          {/* Summary text */}
          <p className="text-sm text-gray-800 leading-relaxed">{summary}</p>
        </div>

        {/* Toggle Details Button & Content */}
        <div>
          {/* Toggle Button */}
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors duration-150 text-left group border-t border-gray-200"
          >
            <span className="text-sm font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">
              {isDetailsOpen ? 'Ẩn Chi Tiết' : 'Xem Chi Tiết'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                isDetailsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Collapsible Details Section */}
          {isDetailsOpen && (
            <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-h-96 overflow-y-auto pr-2">
                <MarkdownContent content={details} />
              </div>
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        {metadata && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            {/* Processing Time */}
            {metadata.processingTime && (
              <div className="flex items-center gap-1">
                <span className="font-medium">⏱️</span>
                <span>{metadata.processingTime}</span>
              </div>
            )}

            {/* Agents Used */}
            {metadata.agentsUsed && metadata.agentsUsed.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-medium">🤖</span>
                {metadata.agentsUsed.map((agent, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs border border-blue-200"
                  >
                    {agent}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 text-right">
            {new Date(timestamp).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIJsonResponseMessage;
