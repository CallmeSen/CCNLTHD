import { useState, useRef, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Terminal,
} from "lucide-react";
import type { ToolCallEntry } from "@/types/index";

function cn(...classes: ClassValue[]) {
  return twMerge(clsx(...classes));
}

interface ThinkingTimelineProps {
  toolCalls: ToolCallEntry[];
}

export function ThinkingTimeline({ toolCalls }: ThinkingTimelineProps) {
  const [open, setOpen] = useState(false);
  const hasOpenedRef = useRef(false);

  // #region debug_log
  fetch('http://127.0.0.1:7544/ingest/e57f9371-2316-4e57-b9d7-dbcb55b1482a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ba358'},body:JSON.stringify({sessionId:'3ba358',location:'ThinkingTimeline:render',message:'ThinkingTimeline rendered',data:{toolCallCount:toolCalls.length,open,hasOpened:hasOpenedRef.current},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  if (toolCalls.length === 0) return null;

  const running = toolCalls.find((tc) => tc.status === "running");

  useEffect(() => {
    // #region debug_log
    fetch('http://127.0.0.1:7544/ingest/e57f9371-2316-4e57-b9d7-dbcb55b1482a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ba358'},body:JSON.stringify({sessionId:'3ba358',location:'ThinkingTimeline:useEffect',message:'useEffect triggered',data:{toolCallCount:toolCalls.length,wasOpened:hasOpenedRef.current},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    if (toolCalls.length > 0 && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      setOpen(true);
    }
  }, [toolCalls.length]);

  return (
    <div className="mt-2 ml-11">
      <button
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span>Thinking</span>
        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">
          {toolCalls.length} step{toolCalls.length !== 1 ? "s" : ""}
        </span>
        {running && (
          <Loader2 className="w-3 h-3 animate-spin text-primary ml-1" />
        )}
      </button>

      {open && (
        <div className="space-y-1.5 mt-2">
          {toolCalls.map((tc) => (
            <ToolStep key={tc.id} tool={tc} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolStep({ tool }: { tool: ToolCallEntry }) {
  const [expanded, setExpanded] = useState(false);

  const isPending = tool.status === "pending";
  const isRunning = tool.status === "running";
  const isDone = tool.status === "done";
  const isError = tool.status === "error";

  const hasOutput = !!tool.preview && tool.preview.length > 0;
  const canExpand = hasOutput || !!tool.arguments;

  return (
    <div className="flex items-start gap-2">
      <div
        className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300",
          isPending && "bg-muted text-muted-foreground",
          isRunning && "bg-primary/10 text-primary ring-2 ring-primary/30",
          isDone && "bg-success/10 text-success",
          isError && "bg-danger/10 text-danger"
        )}
      >
        {isPending && <Clock className="w-3 h-3" />}
        {isRunning && <Loader2 className="w-3 h-3 animate-spin" />}
        {isDone && <CheckCircle2 className="w-3 h-3" />}
        {isError && <AlertCircle className="w-3 h-3" />}
      </div>

      <div
        className={cn(
          "flex-1 rounded-xl border px-3 py-2 transition-all duration-200",
          isPending && "bg-muted/30 border-border/50 opacity-50",
          isRunning && "bg-primary/5 border-primary/20",
          isDone && "bg-success/5 border-success/20",
          isError && "bg-danger/5 border-danger/20"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            canExpand && "cursor-pointer"
          )}
          onClick={() => canExpand && setExpanded(!expanded)}
        >
          <span className="text-xs font-mono font-semibold text-foreground flex items-center gap-1">
            <Terminal className="w-3 h-3 text-muted-foreground" />
            {tool.tool}
          </span>

          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
              isPending && "bg-muted text-muted-foreground",
              isRunning && "bg-primary/10 text-primary",
              isDone && "bg-success/10 text-success",
              isError && "bg-danger/10 text-danger"
            )}
          >
            {isPending && "pending"}
            {isRunning && "running"}
            {isDone && tool.elapsed_ms ? `${(tool.elapsed_ms / 1000).toFixed(1)}s` : "done"}
            {isError && "error"}
          </span>

          {canExpand && (
            <span className="ml-auto text-muted-foreground/40">
              {expanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </span>
          )}
        </div>

        {expanded && (
          <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
            {tool.arguments && Object.keys(tool.arguments).length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">
                  Arguments
                </p>
                <pre className="text-[11px] font-mono bg-muted/50 rounded-lg px-2 py-1.5 overflow-x-auto text-muted-foreground">
                  {JSON.stringify(tool.arguments, null, 2)}
                </pre>
              </div>
            )}

            {tool.preview && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">
                  Output
                </p>
                <pre className="text-[11px] font-mono bg-muted/50 rounded-lg px-2 py-1.5 overflow-x-auto text-muted-foreground max-h-32">
                  {tool.preview}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
