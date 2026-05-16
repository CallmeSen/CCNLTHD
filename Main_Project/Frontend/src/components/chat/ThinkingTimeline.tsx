import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Terminal,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ToolCallEntry } from '../../types/agent';

interface ThinkingTimelineProps {
  toolCalls: ToolCallEntry[];
  isStreaming?: boolean;
}

export function ThinkingTimeline({ toolCalls }: ThinkingTimelineProps) {
  const [open, setOpen] = useState(false);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (toolCalls.length > 0 && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      setOpen(true);
    }
  }, [toolCalls.length]);

  if (toolCalls.length === 0) return null;

  const running = toolCalls.find((tool) => tool.status === 'running');

  return (
    <div className="mt-2 ml-11">
      <button
        type="button"
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>Quá trình suy luận</span>
        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">
          {toolCalls.length} bước
        </span>
        {running && <Loader2 className="w-3 h-3 animate-spin text-primary ml-1" />}
      </button>

      {open && (
        <div className="space-y-1.5 mt-2">
          {toolCalls.map((tool) => (
            <ToolStep key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolStep({ tool }: { tool: ToolCallEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = tool.status === 'pending';
  const isRunning = tool.status === 'running';
  const isDone = tool.status === 'done';
  const isError = tool.status === 'error';
  const canExpand = Boolean(tool.preview || tool.arguments || tool.result || tool.error);

  return (
    <div className="flex items-start gap-2">
      <div
        className={cn(
          'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300',
          isPending && 'bg-muted text-muted-foreground',
          isRunning && 'bg-primary/10 text-primary ring-2 ring-primary/30',
          isDone && 'bg-success/10 text-success',
          isError && 'bg-danger/10 text-danger',
        )}
      >
        {isPending && <Clock className="w-3 h-3" />}
        {isRunning && <Loader2 className="w-3 h-3 animate-spin" />}
        {isDone && <CheckCircle2 className="w-3 h-3" />}
        {isError && <AlertCircle className="w-3 h-3" />}
      </div>

      <div
        className={cn(
          'flex-1 rounded-xl border px-3 py-2 transition-all duration-200',
          isPending && 'bg-muted/30 border-border/50 opacity-60',
          isRunning && 'bg-primary/5 border-primary/20',
          isDone && 'bg-success/5 border-success/20',
          isError && 'bg-danger/5 border-danger/20',
        )}
      >
        <div
          className={cn('flex items-center gap-2', canExpand && 'cursor-pointer')}
          onClick={() => canExpand && setExpanded((value) => !value)}
        >
          <span className="text-xs font-mono font-semibold text-foreground flex items-center gap-1">
            <Terminal className="w-3 h-3 text-muted-foreground" />
            {tool.tool}
          </span>

          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              isPending && 'bg-muted text-muted-foreground',
              isRunning && 'bg-primary/10 text-primary',
              isDone && 'bg-success/10 text-success',
              isError && 'bg-danger/10 text-danger',
            )}
          >
            {isPending && 'chờ'}
            {isRunning && 'đang chạy'}
            {isDone && (tool.elapsed_ms ? `${(tool.elapsed_ms / 1000).toFixed(1)}s` : 'xong')}
            {isError && 'lỗi'}
          </span>

          {canExpand && (
            <span className="ml-auto text-muted-foreground/50">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
          )}
        </div>

        {expanded && (
          <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
            {tool.arguments && Object.keys(tool.arguments).length > 0 && (
              <ToolPre title="Tham số" value={tool.arguments} />
            )}
            {tool.preview && <ToolPre title="Kết quả tóm tắt" value={tool.preview} />}
            {tool.result !== undefined && <ToolPre title="Kết quả" value={tool.result} />}
            {tool.error && <p className="text-xs text-danger">{tool.error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolPre({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground/70 uppercase mb-1">{title}</p>
      <pre className="text-[11px] font-mono bg-muted/50 rounded-lg px-2 py-1.5 overflow-x-auto text-muted-foreground max-h-36">
        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
