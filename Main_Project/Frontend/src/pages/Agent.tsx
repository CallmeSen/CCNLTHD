import { useEffect, useRef, useState, useMemo, useCallback, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, ArrowDown, Square, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAgentStore } from "@/stores/useAgentStore";
import { useSSE } from "@/hooks/useSSE";
import { useI18n } from "@/hooks/useI18n";
import { sessionApi, sseUrl } from "@/services/api";
import type { AgentMessage } from "@/types/index";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ThinkingTimeline } from "@/components/chat/ThinkingTimeline";
import { ConversationTimeline } from "@/components/chat/ConversationTimeline";

/* ---------- Message grouping ---------- */
type MsgGroup =
  | { kind: "single"; msg: AgentMessage }
  | { kind: "timeline"; msgs: AgentMessage[] };

function groupMessages(msgs: AgentMessage[]): MsgGroup[] {
  const out: MsgGroup[] = [];
  let buf: AgentMessage[] = [];
  const flush = () => {
    if (buf.length) {
      out.push({ kind: "timeline", msgs: [...buf] });
      buf = [];
    }
  };
  for (const m of msgs) {
    if (["thinking", "tool_call", "tool_result", "compact"].includes(m.type)) {
      buf.push(m);
    } else {
      flush();
      out.push({ kind: "single", msg: m });
    }
  }
  flush();
  return out;
}

const act = () => useAgentStore.getState();

/* ---------- Component ---------- */
export default function Agent() {
  const [input, setInput] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sseSessionRef = useRef<string | null>(null);
  const prevSseStatusRef = useRef("disconnected");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const lastEventRef = useRef(0);

  const messages = useAgentStore((s) => s.messages);
  const streamingText = useAgentStore((s) => s.streamingText);
  const status = useAgentStore((s) => s.status);
  const sessionId = useAgentStore((s) => s.sessionId);
  const toolCalls = useAgentStore((s) => s.toolCalls);
  const sessionLoading = useAgentStore((s) => s.sessionLoading);

  const { connect, disconnect } = useSSE();
  const { t } = useI18n();

  const urlSessionId = searchParams.get("session");
  void urlSessionId; // placeholder for future URL-based session restore

  /* Smart scroll — only auto-scroll when near bottom */
  const isNearBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  const rafRef = useRef(0);
  const scrollToBottom = useCallback(() => {
    if (!isNearBottom()) {
      setShowScrollBtn(true);
      return;
    }
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, [isNearBottom]);

  const forceScrollToBottom = useCallback(() => {
    setShowScrollBtn(false);
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  /* Track scroll position to show/hide scroll button */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isNearBottom()) setShowScrollBtn(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isNearBottom]);

  /* SSE status subscription via useSyncExternalStore for Zustand v5 compatibility */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sseStatus = useAgentStore((s) => s.sseStatus);

  useEffect(() => {
    if (sseStatus === "reconnecting" && prevSseStatusRef.current === "connected") toast.warning(t.reconnecting);
    else if (sseStatus === "connected" && prevSseStatusRef.current === "reconnecting") toast.success(t.connected);
    prevSseStatusRef.current = sseStatus;
  }, [sseStatus, t]);

  const doDisconnect = useCallback(() => {
    disconnect();
    sseSessionRef.current = null;
  }, [disconnect]);

  const setupSSE = useCallback(
    (sid: string) => {
      if (sseSessionRef.current === sid) return;
      doDisconnect();
      sseSessionRef.current = sid;

      const touch = () => {
        lastEventRef.current = Date.now();
      };

      const sseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/sessions/${sid}/events`;

      connect(sseUrl, {
        text_delta: (d) => {
          touch();
          act().appendDelta(String(d.delta || ""));
          scrollToBottom();
        },

        tool_call: (d) => {
          touch();
          act().addToolCall({
            tool: String(d.tool || ""),
            arguments: d.arguments ?? {},
            status: "running",
            timestamp: Date.now(),
          });
          scrollToBottom();
        },

        tool_result: (d) => {
          touch();
          act().updateToolCall(String(d.tool || ""), {
            status: d.status === "ok" ? "done" : "error",
            preview: String(d.preview || ""),
            elapsed_ms: Number(d.elapsed_ms || 0),
          });
        },

        thinking_done: () => {
          touch();
        },

        compact: () => {
          touch();
        },

        "attempt.completed": (d) => {
          touch();
          act().finishStreaming(String(d.summary || ""), d.run_dir);
          scrollToBottom();
        },

        "attempt.failed": (d) => {
          touch();
          act().clearStreaming();
          act().addMessage({
            type: "error",
            content: String(d.error || "Execution failed"),
            timestamp: Date.now(),
          });
          act().setStatus("idle");
          scrollToBottom();
        },

        heartbeat: () => {},

        reconnect: () => {
          act().setSseStatus("reconnecting");
        },
      });
    },
    [connect, doDisconnect, scrollToBottom]
  );

  const runPrompt = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || status === "streaming") return;

      setInput("");
      act().addMessage({ type: "user", content: prompt, timestamp: Date.now() });
      act().setStatus("streaming");
      forceScrollToBottom();

      try {
        let sid = act().sessionId;
        if (!sid) {
          const session = await sessionApi.create(prompt.slice(0, 50));
          sid = session.session_id;
          act().setSessionId(sid);
          setSearchParams({ session: sid }, { replace: true });
        }
        setupSSE(sid);
        await sessionApi.send(sid, prompt);
      } catch {
        act().setStatus("error");
        toast.error(t.sendFailed);
        act().addMessage({
          type: "error",
          content: t.sendFailed,
          timestamp: Date.now(),
        });
      }
    },
    [status, setupSSE, forceScrollToBottom, t]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runPrompt(input.trim());
  };

  const handleCancel = async () => {
    if (!sessionId) {
      act().setStatus("idle");
      return;
    }
    try {
      await sessionApi.cancel(sessionId);
      act().setStatus("idle");
      act().clearStreaming();
      act().clearToolCalls();
      toast.info("Cancel request sent");
    } catch {
      toast.error("Cancel failed");
    }
  };

  const handleExport = () => {
    if (messages.length === 0) return;
    const lines: string[] = [
      `# Chat Export`,
      ``,
      `Export time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`,
      ``,
    ];
    for (const msg of messages) {
      const time = new Date(msg.timestamp).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      if (msg.type === "user") {
        lines.push(`## User (${time})`, ``, msg.content, ``);
      } else if (msg.type === "answer") {
        lines.push(`## Assistant (${time})`, ``, msg.content, ``);
      } else if (msg.type === "error") {
        lines.push(`## Error (${time})`, ``, msg.content, ``);
      } else if (msg.type === "tool_call") {
        lines.push(`> Tool call: ${msg.tool || "unknown"}`, ``);
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectPrompt = useCallback(
    (prompt: string) => {
      setInput(prompt);
      runPrompt(prompt);
    },
    [runPrompt]
  );

  const groups = useMemo(() => groupMessages(messages), [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex-shrink-0 px-1 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight animate-slide-up">
            Agent Chat
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5 animate-slide-up">
            Multi-agent portfolio advisory system
          </p>
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
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            title="Export chat"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-4 px-1">
        {sessionLoading && (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-muted shrink-0" />
                <div className="h-16 flex-1 rounded-2xl bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!sessionLoading && messages.length === 0 && (
          <WelcomeScreen onSelectPrompt={handleSelectPrompt} />
        )}

        {/* Conversation timeline dots (shows when 2+ user messages) */}
        {groups.length > 0 && (
          <ConversationTimeline messages={messages} containerRef={listRef} />
        )}

        {groups.map((g, i) => {
          if (g.kind === "timeline") {
            return (
              <div key={`tl-${i}`} data-msg-idx={i}>
                {g.msgs.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            );
          }
          const msgIdx = messages.indexOf(g.msg);
          return (
            <div key={g.msg.id} data-msg-idx={msgIdx}>
              <MessageBubble message={g.msg} />
            </div>
          );
        })}

        {/* Live streaming area: text + ThinkingTimeline tool steps */}
        {(streamingText || (status === "streaming" && toolCalls.length > 0)) && (
          <div className="animate-slide-up">
            {/* The ThinkingTimeline shows each agent step as it runs — rendered BEFORE streamingText so it appears immediately */}
            {status === "streaming" && toolCalls.length > 0 && (
              <div className="mt-3 ml-11">
                {/* #region debug_log */}
                {(() => { fetch('http://127.0.0.1:7544/ingest/e57f9371-2316-4e57-b9d7-dbcb55b1482a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ba358'},body:JSON.stringify({sessionId:'3ba358',location:'Agent.tsx:ThinkingTimeline_render',message:'ThinkingTimeline condition met, rendering',data:{status,toolCallCount:toolCalls.length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{}); return null; })()}
                {/* #endregion */}
                <ThinkingTimeline toolCalls={toolCalls} />
              </div>
            )}

            {streamingText && (
              <MessageBubble
                message={{
                  id: "streaming",
                  type: "answer",
                  content: streamingText,
                  timestamp: Date.now(),
                }}
                isStreaming
              />
            )}
          </div>
        )}

        {/* Immediate loading indicator: shown right when streaming starts, before first tool_call arrives */}
        {status === "streaming" && toolCalls.length === 0 && !streamingText && (
          <div className="animate-slide-up mt-3 ml-11">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span>Agent is processing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={forceScrollToBottom}
          className="fixed bottom-24 right-8 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors animate-slide-up"
        >
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {/* Input */}
      <div className="flex-shrink-0 pt-4">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            className="input pr-20 resize-none min-h-[52px] max-h-[200px] text-sm"
            placeholder={t.prompt || "Describe your investment goals..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                runPrompt(input.trim());
              }
            }}
            disabled={status === "streaming"}
            rows={1}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
            {status === "streaming" ? (
              <button
                type="button"
                onClick={handleCancel}
                className="w-9 h-9 rounded-xl bg-danger/10 text-danger flex items-center justify-center hover:bg-danger/20 transition-colors"
                title="Stop"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="btn-primary w-9 h-9 !p-0"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
