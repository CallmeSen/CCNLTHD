import { Download, Settings, RefreshCcw } from "lucide-react";
import { useAgentStore } from "../../store/useAgentStore";
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Zap, History } from 'lucide-react';

export function ChatHeader({
  onExport,
  onRestoreSession,
  onOpenSettings,
  onOpenHistory,
  restoreLoading,
}: {
  onExport: () => void;
  onRestoreSession: () => void;
  onOpenSettings: () => void;
  onOpenHistory?: () => void;
  restoreLoading?: boolean;
}) {
  const status = useAgentStore((s) => s.status);
  const navigate = useNavigate();
  return (
    <div className="shrink-0 px-1 pb-2 flex items-end justify-center">
      <div className="flex items-end justify-center gap-2 text-right">
        {status === "streaming" && (
          <div className="flex items-center gap-1.5 text-xs text-primary animate-slide-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Live
          </div>
        )}

        <button
          onClick={onRestoreSession}
          disabled={restoreLoading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          title="Restore session"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onExport}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          title="Export chat"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          title="Chat history"
        >
          <History className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => navigate('/history')}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <History className="w-4 h-4" />
          Lịch Sử
        </button>
        
      </div>
    </div>
  );
}

export default ChatHeader;
