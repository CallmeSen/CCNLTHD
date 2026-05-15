import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { sessionApi } from "../../services/sessionApi";
import { useAgentStore } from "../../store/useAgentStore";

export function SessionRestore({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const clearMessages = useAgentStore((s) => s.clearMessages);
  const clearStreaming = useAgentStore((s) => s.clearStreaming);
  const setSessionId = useAgentStore((s) => s.setSessionId);
  const setStatus = useAgentStore((s) => s.setStatus);
  const setError = useAgentStore((s) => s.setError);

  if (!open) return null;

  const handleRestore = async () => {
    try {
      setLoading(true);
      const session = await sessionApi.create('New chat session');
      clearMessages();
      clearStreaming();
      setError(null);
      setStatus('idle');
      setSessionId(session.session_id);
      setSearchParams({ session: session.session_id }, { replace: true });
      onClose();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to start a new session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md p-4 bg-card border border-border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Restore session</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start a fresh chat session immediately. This will clear the current conversation and reload the chatbot with a new session.
        </p>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 rounded-lg border" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="px-3 py-1 rounded-lg btn-primary" onClick={handleRestore} disabled={loading}>
            {loading ? 'Loading...' : 'Start new chat'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionRestore;
