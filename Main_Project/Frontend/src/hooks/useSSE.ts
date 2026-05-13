import { useEffect, useRef, useCallback } from "react";
import { useAgentStore } from "@/stores/useAgentStore";
import { getBaseUrl } from "@/services/api";

export function useSSE() {
  const {
    appendDelta,
    addToolCall,
    updateToolCall,
    setSseStatus,
    clearStreaming,
  } = useAgentStore.getState();

  const esRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const _doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disconnect = useCallback(() => {
    if (_doneTimerRef.current) {
      clearTimeout(_doneTimerRef.current);
      _doneTimerRef.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSseStatus("disconnected");
  }, [setSseStatus]);

  const connect = useCallback(
    (
      url: string,
      handlers: {
        text_delta?: (data: { delta: string }) => void;
        thinking_done?: () => void;
        tool_call?: (data: { tool: string; arguments: Record<string, unknown> }) => void;
        tool_result?: (data: { tool: string; status: string; preview: string; elapsed_ms: number }) => void;
        compact?: () => void;
        "attempt.completed"?: (data: { run_dir: string; summary: string }) => void;
        "attempt.failed"?: (data: { error: string }) => void;
        heartbeat?: () => void;
        reconnect?: (attempt: number) => void;
      }
    ) => {
      disconnect();
      setSseStatus("connecting");

      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (ev) => {
        try {
          // #region debug_log
          fetch('http://127.0.0.1:7544/ingest/e57f9371-2316-4e57-b9d7-dbcb55b1482a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ba358'},body:JSON.stringify({sessionId:'3ba358',location:'useSSE.ts:onmessage',message:'SSE onmessage',data:{evData:String(ev.data).slice(0,200)},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
          // #endregion
          // Backend sends event type embedded in data payload (event: "message").
          // Browser's EventSource only fires onmessage for "message" events;
          // custom event types (tool_call, tool_result, etc.) are silently dropped.
          const raw = JSON.parse(ev.data);
          const event: string = raw.event || "message";
          const data: Record<string, unknown> = raw;

          switch (event) {
            case "text_delta":
              handlers.text_delta?.(data as { delta: string });
              appendDelta(String(data.delta || ""));
              break;

            case "tool_call":
              // #region debug_log
              fetch('http://127.0.0.1:7544/ingest/e57f9371-2316-4e57-b9d7-dbcb55b1482a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ba358'},body:JSON.stringify({sessionId:'3ba358',location:'useSSE.ts:tool_call',message:'tool_call event received',data:{tool:data.tool,args:data.arguments},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
              // #endregion
              handlers.tool_call?.(data as { tool: string; arguments: Record<string, unknown> });
              addToolCall({
                tool: String(data.tool || ""),
                arguments: (data.arguments as Record<string, unknown>) ?? {},
                status: "running",
                timestamp: Date.now(),
              });
              break;

            case "tool_result":
              handlers.tool_result?.(data as { tool: string; status: string; preview: string; elapsed_ms: number });
              // H8: delay setting "done" so the running spinner is visible.
              // If the next tool_call arrives before the delay, cancel it so the
              // step transitions directly to the next step's "running" state.
              if (_doneTimerRef.current) {
                clearTimeout(_doneTimerRef.current);
                _doneTimerRef.current = null;
              }
              _doneTimerRef.current = setTimeout(() => {
                updateToolCall(String(data.tool || ""), {
                  status: data.status === "ok" ? "done" : "error",
                  preview: String(data.preview || ""),
                  elapsed_ms: Number(data.elapsed_ms || 0),
                });
                _doneTimerRef.current = null;
              }, 500);
              break;

            case "thinking_done":
              handlers.thinking_done?.();
              break;

            case "compact":
              handlers.compact?.();
              break;

            case "attempt.completed":
              handlers["attempt.completed"]?.(data as { run_dir: string; summary: string });
              break;

            case "attempt.failed":
              handlers["attempt.failed"]?.(data as { error: string });
              break;

            case "heartbeat":
              handlers.heartbeat?.();
              break;

            case "reconnect":
              handlers.reconnect?.(Number(data.attempt ?? 0));
              setSseStatus("reconnecting");
              break;

            case "done":
              break;
          }
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        setSseStatus("reconnecting");
      };

      es.onopen = () => {
        setSseStatus("connected");
      };
    },
    [disconnect, setSseStatus, appendDelta, addToolCall, updateToolCall]
  );

  const sendMessage = useCallback(
    async (
      sessionId: string,
      text: string,
      handlers: Parameters<typeof connect>[1]
    ): Promise<void> => {
      disconnect();
      clearStreaming();

      try {
        const base = getBaseUrl();
        abortControllerRef.current = new AbortController();

        const resp = await fetch(`${base}/sessions/${sessionId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
          signal: abortControllerRef.current.signal,
        });

        if (!resp.ok) {
          const err = await resp.text();
          clearStreaming();
          throw new Error(err);
        }

        const url = `${base}/sessions/${sessionId}/events`;
        connect(url, handlers ?? {});
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        clearStreaming();
        throw err;
      }
    },
    [disconnect, clearStreaming, connect]
  );

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const status = useAgentStore((s) => s.status);
  const streamingText = useAgentStore((s) => s.streamingText);
  const toolCalls = useAgentStore((s) => s.toolCalls);

  return {
    status,
    streamingText,
    toolCalls,
    connect,
    disconnect,
    sendMessage,
  };
}
