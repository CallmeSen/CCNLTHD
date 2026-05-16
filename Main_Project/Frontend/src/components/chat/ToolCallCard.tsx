import { AlertCircle, CheckCircle2, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ToolCallEntry } from '../../types/agent';

interface ToolCallCardProps {
  toolCall: ToolCallEntry;
  onClick?: () => void;
}

export function ToolCallCard({ toolCall, onClick }: ToolCallCardProps) {
  const isPending = toolCall.status === 'pending';
  const isRunning = toolCall.status === 'running';
  const isDone = toolCall.status === 'done';
  const isError = toolCall.status === 'error';

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        isPending && 'bg-muted/30 border-border',
        isRunning && 'bg-primary/5 border-primary/20',
        isDone && 'bg-success/5 border-success/20',
        isError && 'bg-danger/5 border-danger/20',
        onClick && 'hover:shadow-sm cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
            isPending && 'bg-muted text-muted-foreground',
            isRunning && 'bg-primary/10 text-primary',
            isDone && 'bg-success/10 text-success',
            isError && 'bg-danger/10 text-danger',
          )}
        >
          {isPending && <Clock className="w-3.5 h-3.5" />}
          {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
          {isError && <AlertCircle className="w-3.5 h-3.5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-foreground">{toolCall.tool}</span>
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
              {isDone && 'xong'}
              {isError && 'lỗi'}
            </span>
          </div>

          {toolCall.preview && isDone && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{toolCall.preview}</p>
          )}

          {toolCall.elapsed_ms !== undefined && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{toolCall.elapsed_ms}ms</p>
          )}
        </div>

        {onClick && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />}
      </div>
    </div>
  );
}

export default ToolCallCard;
