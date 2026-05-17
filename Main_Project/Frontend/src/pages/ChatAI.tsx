import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  Download,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Square,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAgentStore } from '../store/useAgentStore';
import { useSSE } from '../hooks/useSSE';
import { sessionApi } from '../services/sessionApi';
import { WelcomeScreen } from '../components/chat/WelcomeScreen';
import { MessageBubble } from '../components/chat/MessageBubble';
import { ThinkingTimeline } from '../components/chat/ThinkingTimeline';
import { ConversationTimeline } from '../components/chat/ConversationTimeline';
import type { AgentMessage, ChatSessionListItem } from '../types/agent';

function exportMarkdown(messages: AgentMessage[]) {
  const lines = [
    '# Xuất hội thoại',
    '',
    `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`,
    '',
  ];

  for (const message of messages) {
    const time = new Date(message.timestamp).toLocaleString('vi-VN');
    if (message.type === 'user') {
      lines.push(`## Người dùng (${time})`, '', message.content, '');
    } else if (message.type === 'answer' || message.type === 'run_complete') {
      lines.push(`## Trợ lý (${time})`, '', message.content, '');
      if (message.runId) lines.push(`Run ID: ${message.runId}`, '');
    } else if (message.type === 'error') {
      lines.push(`## Lỗi (${time})`, '', message.content, '');
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `chat_${new Date().toISOString().slice(0, 10)}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ChatAI() {
  const [input, setInput] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rafRef = useRef(0);
  const ignoredUrlSessionRef = useRef<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const messages = useAgentStore((state) => state.messages);
  const streamingText = useAgentStore((state) => state.streamingText);
  const isStreaming = useAgentStore((state) => state.isStreaming);
  const status = useAgentStore((state) => state.status);
  const sessionId = useAgentStore((state) => state.sessionId);
  const toolCalls = useAgentStore((state) => state.toolCalls);
  const sessionLoading = useAgentStore((state) => state.sessionLoading);
  const error = useAgentStore((state) => state.error);
  const sseStatus = useAgentStore((state) => state.sseStatus);

  const { sendMessage, abort, disconnect } = useSSE();

  const urlSessionId = searchParams.get('session');
  const lastUserIndex = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].type === 'user') return index;
    }
    return -1;
  }, [messages]);

  const isNearBottom = useCallback(() => {
    const element = listRef.current;
    if (!element) return true;
    return element.scrollHeight - element.scrollTop - element.clientHeight < 100;
  }, []);

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

  useEffect(() => {
    const element = listRef.current;
    if (!element) return;
    const handleScroll = () => {
      if (isNearBottom()) setShowScrollBtn(false);
    };
    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [isNearBottom]);

  useEffect(() => {
    if (!urlSessionId) {
      ignoredUrlSessionRef.current = null;
      return;
    }
    if (ignoredUrlSessionRef.current === urlSessionId) return;
    if (urlSessionId === sessionId && (status === 'streaming' || toolCalls.length > 0)) return;
    useAgentStore.getState().loadSession(urlSessionId);
  }, [sessionId, status, urlSessionId, toolCalls.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, toolCalls.length, scrollToBottom]);

  const loadChatSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const data = await sessionApi.getSessions();
      setSessions(
        [...data].sort(
          (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime(),
        ),
      );
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
      setSessionsError('Không thể tải danh sách phiên chat');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const openSessions = () => {
    setSessionsOpen(true);
    loadChatSessions();
  };

  const selectSession = async (id: string) => {
    ignoredUrlSessionRef.current = null;
    disconnect();
    setSessionsOpen(false);
    setSearchParams({ session: id }, { replace: true });
    await useAgentStore.getState().loadSession(id);
  };

  const startNewChat = () => {
    ignoredUrlSessionRef.current = urlSessionId;
    disconnect();
    useAgentStore.getState().reset();
    setInput('');
    setSessionsOpen(false);
    setSearchParams({}, { replace: true });
    inputRef.current?.focus();
  };

  const runPrompt = useCallback(
    async (prompt: string) => {
      const text = prompt.trim();
      if (!text || status === 'streaming') return;

      const store = useAgentStore.getState();
      store.clearToolCalls();
      store.setStatus('streaming');
      store.setError(null);
      store.addMessage({ type: 'user', content: text, timestamp: Date.now() });
      setInput('');
      forceScrollToBottom();

      try {
        let activeSessionId = store.sessionId;
        if (!activeSessionId) {
          const response = await sessionApi.create(text.slice(0, 80));
          activeSessionId = response.session_id;
          store.setSessionId(activeSessionId);
          setSearchParams({ session: activeSessionId }, { replace: true });
        }

        await sendMessage(activeSessionId, text);
      } catch (err) {
        console.error('Failed to send message:', err);
        store.setStatus('error');
        store.setError('Không thể gửi tin nhắn');
        store.addMessage({
          type: 'error',
          content: 'Không thể gửi tin nhắn. Vui lòng thử lại.',
          timestamp: Date.now(),
        });
        toast.error('Không thể gửi tin nhắn');
      }
    },
    [forceScrollToBottom, sendMessage, setSearchParams, status],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    runPrompt(input);
  };

  const handleCancel = async () => {
    const store = useAgentStore.getState();
    try {
      if (sessionId) await sessionApi.cancel(sessionId);
      abort();
      store.clearStreaming();
      store.clearToolCalls();
      store.setStatus('idle');
      toast.info('Đã gửi yêu cầu dừng');
    } catch (err) {
      console.error('Failed to cancel session:', err);
      toast.error('Không thể dừng phiên xử lý');
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto px-4 py-5">
      <div className="shrink-0 pb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Chat AI</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Trợ lý phân tích danh mục và thị trường theo thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(status === 'streaming' || sseStatus === 'connected') && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Live
            </div>
          )}

          <button type="button" onClick={startNewChat} className="btn-ghost text-xs" title="Tạo phiên mới">
            <Plus className="w-4 h-4" />
          </button>
          <button type="button" onClick={openSessions} className="btn-ghost text-xs" title="Lịch sử phiên chat">
            <History className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exportMarkdown(messages)}
            disabled={messages.length === 0}
            className="btn-ghost text-xs disabled:opacity-40"
            title="Xuất chat"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto space-y-4 px-1">
        {sessionLoading && (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((index) => (
              <div key={index} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-muted shrink-0" />
                <div className="h-16 flex-1 rounded-2xl bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!sessionLoading && messages.length === 0 && <WelcomeScreen onPromptSelect={handlePromptSelect} />}

        {messages.length > 0 && <ConversationTimeline messages={messages} containerRef={listRef} />}

        {messages.map((message, index) => (
          <div key={message.id} data-msg-idx={index} id={`msg-${message.id}`}>
            <MessageBubble message={message} />
            {index === lastUserIndex && toolCalls.length > 0 && <ThinkingTimeline toolCalls={toolCalls} />}
          </div>
        ))}

        {streamingText && (
          <div className="animate-slide-up">
            <MessageBubble
              message={{
                id: 'streaming',
                type: 'answer',
                content: streamingText,
                timestamp: Date.now(),
              }}
              isStreaming
            />
          </div>
        )}

        {status === 'streaming' && toolCalls.length === 0 && !streamingText && (
          <div className="animate-slide-up mt-3 ml-11">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span>Agent đang xử lý...</span>
            </div>
          </div>
        )}
      </div>

      {showScrollBtn && (
        <button
          type="button"
          onClick={forceScrollToBottom}
          className="fixed bottom-24 right-8 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
          title="Cuộn xuống cuối"
        >
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      <div className="shrink-0 pt-4">
        {error && (
          <div className="mb-3 rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            className="input pr-20 resize-none min-h-[52px] max-h-[200px] text-sm"
            placeholder="Mô tả mục tiêu đầu tư, mã cổ phiếu hoặc danh mục bạn muốn phân tích..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onInput={(event) => {
              const element = event.currentTarget;
              element.style.height = 'auto';
              element.style.height = `${element.scrollHeight}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                runPrompt(input);
              }
            }}
            disabled={status === 'streaming'}
            rows={1}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
            {status === 'streaming' || isStreaming ? (
              <button
                type="button"
                onClick={handleCancel}
                className="w-9 h-9 rounded-xl bg-danger/10 text-danger flex items-center justify-center hover:bg-danger/20 transition-colors"
                title="Dừng"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} className="btn-primary w-9 h-9 !p-0" title="Gửi">
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
        <p className="text-[10px] text-muted-foreground/70 text-center mt-2">
          Enter để gửi, Shift+Enter để xuống dòng
        </p>
      </div>

      {sessionsOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSessionsOpen(false)} />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col">
            <div className="h-16 px-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Phiên chat</h2>
                <p className="text-xs text-muted-foreground">Chọn một phiên để khôi phục hội thoại</p>
              </div>
              <button type="button" className="btn-ghost !p-2" onClick={() => setSessionsOpen(false)} title="Đóng">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-border flex items-center justify-between">
              <button type="button" onClick={loadChatSessions} className="btn-secondary text-xs" disabled={sessionsLoading}>
                <RefreshCw className={`w-3.5 h-3.5 ${sessionsLoading ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
              <button type="button" onClick={startNewChat} className="btn-primary text-xs">
                <Plus className="w-3.5 h-3.5" />
                Phiên mới
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sessionsLoading && (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tải...
                </div>
              )}

              {!sessionsLoading && sessionsError && (
                <div className="p-4 text-sm text-danger">{sessionsError}</div>
              )}

              {!sessionsLoading && !sessionsError && sessions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                  <History className="w-8 h-8 opacity-50" />
                  Chưa có phiên chat nào
                </div>
              )}

              {!sessionsLoading && !sessionsError && sessions.length > 0 && (
                <ul className="divide-y divide-border">
                  {sessions.map((item) => (
                    <li key={item.session_id}>
                      <button
                        type="button"
                        onClick={() => selectSession(item.session_id)}
                        className="w-full text-left px-4 py-3 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="text-xs font-mono text-foreground truncate">{item.session_id}</span>
                          <span className="badge badge-neutral shrink-0">{item.message_count ?? 0} tin</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{item.is_active === 1 ? 'Đang hoạt động' : 'Đã đóng'}</span>
                          <span>
                            {new Date(item.updated_at || item.created_at).toLocaleString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
