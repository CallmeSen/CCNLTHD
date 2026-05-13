import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  User,
  Bot,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import type { AgentMessage } from "@/types/index";

function cn(...classes: ClassValue[]) {
  return twMerge(clsx(...classes));
}

interface MessageBubbleProps {
  message: AgentMessage;
  isStreaming?: boolean;
  onRetry?: (msg: AgentMessage) => void;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.type === "user";

  if (message.type === "tool_call") {
    return (
      <div className="flex items-start gap-2 animate-slide-up">
        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
          <Terminal className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-foreground">
              {message.tool}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              running
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "tool_result") {
    return (
      <div className="flex items-start gap-2 ml-9 animate-slide-up">
        <div
          className={cn(
            "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5",
            message.status === "error"
              ? "bg-danger/10 text-danger"
              : "bg-success/10 text-success"
          )}
        >
          {message.status === "error" ? (
            <AlertCircle className="w-3 h-3" />
          ) : (
            <CheckCircle2 className="w-3 h-3" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-mono line-clamp-2">
            {message.content}
          </p>
          {message.elapsed_ms != null && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {message.elapsed_ms}ms
            </p>
          )}
        </div>
      </div>
    );
  }

  if (message.type === "error") {
    return (
      <div className="flex gap-3 animate-slide-up">
        <div className="w-8 h-8 rounded-xl bg-danger/10 text-danger flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="flex-1 max-w-[80%] rounded-2xl px-4 py-3 bg-danger/5 border border-danger/20 rounded-tl-sm">
          <p className="text-sm leading-relaxed text-danger">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.type === "compact") {
    return (
      <div className="flex items-center justify-center py-2 animate-slide-up">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Compacting context...</span>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex gap-3 flex-row-reverse animate-slide-up">
        <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4" />
        </div>
        <div className="flex-1 max-w-[80%] rounded-2xl px-4 py-3 bg-primary text-primary-foreground rounded-tr-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
          <p className="text-[10px] mt-1.5 text-primary-foreground/60">
            {new Date(message.timestamp).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </p>
        </div>
      </div>
    );
  }

  // answer / default assistant message
  return (
    <div className="flex gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-xl bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4" />
      </div>
      <div className="flex-1 max-w-[80%] rounded-2xl px-4 py-3 bg-card border border-border shadow-sm rounded-tl-sm">
        <div
          className={cn(
            "prose prose-sm max-w-none",
            "prose-p:text-foreground prose-p:leading-relaxed",
            "prose-strong:text-foreground prose-strong:font-semibold",
            "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
            "prose-blockquote:border-l-primary/30 prose-blockquote:text-muted-foreground",
            "prose-li:text-foreground",
            "prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs",
            "prose-pre:bg-muted prose-pre:rounded-xl",
            "prose-table:text-xs",
            "prose-th:bg-muted/50 prose-th:text-foreground prose-th:font-semibold",
            "prose-td:text-muted-foreground",
            "prose-hr:border-border"
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({ children }) => (
                <pre className="bg-muted rounded-xl p-3 overflow-x-auto my-2">
                  {children}
                </pre>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  );
                }
                return <code className={className}>{children}</code>;
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse rounded" />
          )}
        </div>
        <p className="text-[10px] mt-1.5 text-muted-foreground/60">
          {new Date(message.timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
          })}
        </p>
        {message.runId && (
          <Link
            to={`/report/${message.runId}`}
            className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
          >
            &gt;&gt; Full report <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
