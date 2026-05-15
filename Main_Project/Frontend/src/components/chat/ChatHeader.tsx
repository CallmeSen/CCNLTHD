import { Download, Settings, RefreshCcw } from "lucide-react";
import { useAgentStore } from "../../store/useAgentStore";

export function ChatHeader({
  onExport,
  onRestoreSession,
  onOpenSettings,
  restoreLoading,
}: {
  onExport: () => void;
  onRestoreSession: () => void;
  onOpenSettings: () => void;
  restoreLoading?: boolean;
}) {
  const status = useAgentStore((s) => s.status);

  return (
    <div className="shrink-0 px-1 pb-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight animate-slide-up">Agent Chat</h1>
        <p className="text-muted-foreground text-sm mt-0.5 animate-slide-up">Multi-agent portfolio advisory system</p>
      </div>

      <div className="flex items-center gap-2">
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
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          title="Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
