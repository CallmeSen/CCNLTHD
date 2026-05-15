/**
 * ChatResponseDisplay.tsx
 * 
 * Component hiển thị output của AI theo định dạng JSON chuẩn
 * 
 * Features:
 * - Parse JSON từ AI response với try-catch
 * - Hiển thị summary mặc định bằng ReactMarkdown
 * - Toggle button để xem/ẩn details
 * - Fade-in animation cho details
 * - Status badge (success/warning/error)
 * - Metadata footer
 * - Professional Tailwind styling cho Fintech
 */

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, CheckCircle, AlertCircle, XCircle, Loader } from "lucide-react";

/**
 * Interface định nghĩa cấu trúc JSON output từ AI
 * Theo quy chuẩn từ AI_OUTPUT_SPECIFICATION.md
 */
interface AIResponse {
  summary: string;
  details: string;
  status: "success" | "warning" | "error";
  metadata: {
    processingTime: string;
    agentsUsed: string[];
    confidence: number;
  };
}

/**
 * Props của component
 */
interface ChatResponseDisplayProps {
  /** Raw JSON response từ AI (string hoặc object) */
  response: string | AIResponse;
  /** Callback khi có error trong parsing */
  onError?: (error: Error) => void;
  /** Show/hide metadata footer */
  showMetadata?: boolean;
}

/**
 * Status Badge Component - Hiển thị status nhỏ gọn
 */
function StatusBadge({ status }: { status: "success" | "warning" | "error" }) {
  const statusConfig = {
    success: {
      icon: CheckCircle,
      bgColor: "bg-success/10",
      textColor: "text-success",
      label: "Thành công",
    },
    warning: {
      icon: AlertCircle,
      bgColor: "bg-warning/10",
      textColor: "text-warning",
      label: "Cảnh báo",
    },
    error: {
      icon: XCircle,
      bgColor: "bg-destructive/10",
      textColor: "text-destructive",
      label: "Lỗi",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bgColor}`}>
      <Icon className={`w-4 h-4 ${config.textColor}`} />
      <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
    </div>
  );
}

/**
 * Markdown Renderer - Custom styling cho markdown
 * Hỗ trợ heading, list, table, code block, v.v.
 */
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          // Heading styling
          h1: ({ ...props }) => <h1 className="text-xl font-bold text-foreground mt-4 mb-2" {...props} />,
          h2: ({ ...props }) => <h2 className="text-lg font-bold text-foreground mt-3 mb-2" {...props} />,
          h3: ({ ...props }) => <h3 className="text-base font-semibold text-foreground mt-2 mb-1" {...props} />,

          // Paragraph
          p: ({ ...props }) => <p className="text-sm text-muted-foreground leading-relaxed mb-2" {...props} />,

          // List styling
          ul: ({ ...props }) => (
            <ul className="list-disc list-inside text-sm text-muted-foreground mb-2 space-y-1" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal list-inside text-sm text-muted-foreground mb-2 space-y-1" {...props} />
          ),
          li: ({ ...props }) => <li className="ml-2" {...props} />,

          // Code block
          code: ({ inline, ...props }: any) => (
            <code
              className={`${
                inline
                  ? "bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground"
                  : "block bg-muted/50 p-3 rounded-lg overflow-x-auto text-xs font-mono text-foreground my-2 border border-border"
              }`}
              {...props}
            />
          ),

          // Table styling
          table: ({ ...props }) => (
            <table className="w-full text-sm border-collapse my-2 border border-border rounded-lg overflow-hidden" {...props} />
          ),
          thead: ({ ...props }) => (
            <thead className="bg-muted/50 border-b border-border" {...props} />
          ),
          th: ({ ...props }) => (
            <th className="text-left px-3 py-2 font-semibold text-foreground border-r border-border last:border-r-0" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="px-3 py-2 text-muted-foreground border-r border-border last:border-r-0 border-b border-border last:border-b-0" {...props} />
          ),

          // Blockquote
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-primary pl-4 italic text-muted-foreground my-2 py-2"
              {...props}
            />
          ),

          // Link
          a: ({ ...props }) => (
            <a className="text-primary hover:underline" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Main Component - ChatResponseDisplay
 * 
 * Hiển thị AI response theo format chuẩn với UI/UX professional
 */
export function ChatResponseDisplay({
  response,
  onError,
  showMetadata = true,
}: ChatResponseDisplayProps) {
  // State cho toggle details
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Parse JSON response
  let parsedResponse: AIResponse | null = null;
  let parseError: Error | null = null;

  try {
    // Nếu response là string, parse JSON
    if (typeof response === "string") {
      // Trim whitespace và kiểm tra valid JSON
      const trimmedResponse = response.trim();
      
      // Kiểm tra có phải JSON không
      if (!trimmedResponse.startsWith("{") || !trimmedResponse.endsWith("}")) {
        throw new Error(
          "Response không phải JSON format. Kiểm tra lại AI response."
        );
      }

      parsedResponse = JSON.parse(trimmedResponse) as AIResponse;
    } else {
      // Nếu đã là object, dùng trực tiếp
      parsedResponse = response;
    }

    // Validate required fields
    const requiredFields = ["summary", "details", "status", "metadata"];
    for (const field of requiredFields) {
      if (!(field in parsedResponse)) {
        throw new Error(`Thiếu trường bắt buộc: ${field}`);
      }
    }

    // Validate status enum
    if (!["success", "warning", "error"].includes(parsedResponse.status)) {
      throw new Error(
        `Status không hợp lệ: ${parsedResponse.status}. Phải là: success, warning, hoặc error`
      );
    }
  } catch (error) {
    parseError = error instanceof Error ? error : new Error(String(error));

    // Gọi callback error nếu có
    if (onError) {
      onError(parseError);
    }

    // Render error state
    return (
      <div className="w-full bg-destructive/5 border border-destructive/20 rounded-xl p-4">
        <div className="flex gap-3">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Lỗi Xử Lý Response</h3>
            <p className="text-sm text-muted-foreground">{parseError.message}</p>
            {typeof response === "string" && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Raw Response
                </summary>
                <pre className="mt-2 bg-muted/30 p-2 rounded text-xs overflow-auto max-h-40 text-foreground">
                  {response}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!parsedResponse) {
    return null;
  }

  const { summary, details, status, metadata } = parsedResponse;
  const confidencePercent = Math.round((metadata.confidence || 0) * 100);

  return (
    <div className="w-full space-y-0 animate-in fade-in duration-300">
      {/* Card Container */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
        {/* Header - Summary Section */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={status} />
                {confidence !== null && (
                  <div className="text-xs font-medium text-muted-foreground">
                    Độ tin cậy: <span className="text-foreground font-semibold">{confidencePercent}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Text */}
          <p className="text-sm text-foreground leading-relaxed">{summary}</p>
        </div>

        {/* Details Toggle Button & Section */}
        <div>
          {/* Toggle Button */}
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors duration-150 text-left group"
          >
            <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              {isDetailsOpen ? "Ẩn Chi Tiết" : "Xem Chi Tiết"}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                isDetailsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Collapsible Details Section */}
          {isDetailsOpen && (
            <div className="border-t border-border/50 px-4 py-4 bg-muted/20 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-h-[500px] overflow-y-auto pr-2">
                <MarkdownContent content={details} />
              </div>
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        {showMetadata && metadata && (
          <div className="px-4 py-3 bg-muted/10 border-t border-border/50 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {/* Processing Time */}
            {metadata.processingTime && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium">⏱️ Thời gian xử lý:</span>
                <span>{metadata.processingTime}</span>
              </div>
            )}

            {/* Agents Used */}
            {metadata.agentsUsed && metadata.agentsUsed.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium">🤖 Agents:</span>
                <div className="flex flex-wrap gap-1">
                  {metadata.agentsUsed.map((agent, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading Animation Skeleton (Optional - cho UX tốt hơn) */}
      {/* Có thể thêm skeleton loading khi response chưa ready */}
    </div>
  );
}

/**
 * Hook để sử dụng component dễ hơn - Xử lý fetch + display
 * 
 * Ví dụ usage:
 * ```
 * const { response, loading, error } = useAIResponse(query);
 * return <ChatResponseDisplay response={response} />;
 * ```
 */
export function useAIResponse(query: string) {
  const [response, setResponse] = useState<string | AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchResponse = async () => {
    try {
      setLoading(true);
      setError(null);

      // Gọi API backend để lấy AI response
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  return { response, loading, error, fetchResponse };
}

/**
 * Ví dụ sử dụng trong Chat component
 * 
 * ```tsx
 * function ChatContainer() {
 *   const [query, setQuery] = useState("");
 *   const { response, loading, error } = useAIResponse(query);
 * 
 *   return (
 *     <div className="chat-container">
 *       <input
 *         value={query}
 *         onChange={(e) => setQuery(e.target.value)}
 *         onKeyDown={(e) => {
 *           if (e.key === "Enter") {
 *             // Trigger fetch
 *           }
 *         }}
 *       />
 * 
 *       {loading && <Loader className="animate-spin" />}
 *       {response && <ChatResponseDisplay response={response} />}
 *       {error && <div>Error: {error.message}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
