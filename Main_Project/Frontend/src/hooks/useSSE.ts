import { useCallback, useEffect, useRef } from 'react';
import { useAgentStore } from '../store/useAgentStore';
import { getSessionEventUrl, sessionApi } from '../services/sessionApi';
import { saveReportHistory } from '../services/reportHistory';
import { isMockApiEnabled } from '../config/runtimeEnv';
import type { ParsedSSEMessage, ToolCallEntry } from '../types/agent';

interface UseSSEOptions {
  sessionId?: string | null;
  enabled?: boolean;
  onEvent?: (event: ParsedSSEMessage) => void;
}

type EventHandlers = Partial<{
  text_delta: (data: Record<string, unknown>) => void;
  thinking_done: (data: Record<string, unknown>) => void;
  tool_call: (data: Record<string, unknown>) => void;
  tool_result: (data: Record<string, unknown>) => void;
  compact: (data: Record<string, unknown>) => void;
  'attempt.completed': (data: Record<string, unknown>) => void;
  'attempt.failed': (data: Record<string, unknown>) => void;
  heartbeat: (data: Record<string, unknown>) => void;
  reconnect: (data: Record<string, unknown>) => void;
}>;

function normalizeEvent(raw: ParsedSSEMessage) {
  const eventType = String(raw.type || raw.event || 'message');
  const data =
    raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : (raw as Record<string, unknown>);

  return { eventType, data };
}

function getEventText(data: Record<string, unknown>) {
  return String(data.text || data.delta || data.content || '');
}

function getRunId(data: Record<string, unknown>, raw: ParsedSSEMessage) {
  const id = data.run_id || data.runId || data.run_dir || data.id || raw.run_id || raw.runId;
  return id ? String(id) : '';
}

export function useSSE(options: UseSSEOptions = {}) {
  const { sessionId = null, enabled = false, onEvent } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingToolUpdatesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const disconnect = useCallback(() => {
    pendingToolUpdatesRef.current.forEach((timer) => clearTimeout(timer));
    pendingToolUpdatesRef.current.clear();

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    reconnectAttemptsRef.current = 0;
    useAgentStore.getState().setSseStatus('disconnected');
  }, []);

  const handleSSEError = useCallback(
    (url?: string, handlers?: EventHandlers) => {
      const store = useAgentStore.getState();
      store.setSseStatus('disconnected');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (url && reconnectAttemptsRef.current < maxReconnectAttempts) {
        store.setSseStatus('reconnecting');
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect(url, handlers);
        }, reconnectDelay);
        return;
      }

      if (url) {
        store.setError('Mất kết nối máy chủ chat. Vui lòng thử lại.');
        store.setStatus('error');
      }
    },
    [],
  );

  const handleSSEMessage = useCallback(
    (event: MessageEvent, handlers: EventHandlers = {}) => {
      try {
        const raw = JSON.parse(event.data) as ParsedSSEMessage;
        const { eventType, data } = normalizeEvent(raw);
        const store = useAgentStore.getState();

        onEvent?.(raw);

        switch (eventType) {
          case 'message':
          case 'text_delta': {
            const delta = getEventText(data);
            handlers.text_delta?.(data);
            if (delta) store.appendDelta(delta);
            break;
          }

          case 'tool_call': {
            handlers.tool_call?.(data);
            store.addToolCall({
              id: data.id ? String(data.id) : undefined,
              tool: String(data.tool || data.name || 'tool'),
              arguments: (data.arguments || data.args || {}) as Record<string, unknown>,
              status: 'running',
              timestamp: Number(data.timestamp || Date.now()),
            });
            break;
          }

          case 'tool_result': {
            handlers.tool_result?.(data);
            const toolId = String(data.id || data.tool || data.name || '');
            if (!toolId) break;

            if (pendingToolUpdatesRef.current.has(toolId)) {
              clearTimeout(pendingToolUpdatesRef.current.get(toolId)!);
            }

            pendingToolUpdatesRef.current.set(
              toolId,
              setTimeout(() => {
                store.updateToolCall(toolId, {
                  status: data.error || data.status === 'error' ? 'error' : 'done',
                  result: data.result,
                  error: data.error ? String(data.error) : undefined,
                  preview: data.preview ? String(data.preview) : undefined,
                  elapsed_ms: data.elapsed_ms ? Number(data.elapsed_ms) : undefined,
                });
                pendingToolUpdatesRef.current.delete(toolId);
              }, 250),
            );
            break;
          }

          case 'thinking_done':
            handlers.thinking_done?.(data);
            if (data.content) {
              store.addMessage({
                type: 'thinking',
                content: String(data.content),
                timestamp: Date.now(),
              });
            }
            break;

          case 'compact':
            handlers.compact?.(data);
            store.addMessage({
              type: 'compact',
              content: data.status ? `Đang nén ngữ cảnh... (${String(data.status)})` : 'Đang nén ngữ cảnh...',
              timestamp: Date.now(),
            });
            break;

          case 'done':
          case 'attempt.completed': {
            handlers['attempt.completed']?.(data);
            const reportContent = String(
              data.final_report ||
                data.report ||
                data.response ||
                data.content ||
                data.summary ||
                store.streamingText ||
                '',
            );
            const runIdentifier = getRunId(data, raw);
            const finalRunId = runIdentifier && runIdentifier !== 'undefined' ? runIdentifier : `local-${Date.now()}`;
            const metrics = (data.metrics as Record<string, unknown>) || undefined;

            if (reportContent) {
              try {
                saveReportHistory({
                  run_id: finalRunId,
                  timestamp: Date.now(),
                  status: String(data.status || 'completed'),
                  report: reportContent,
                  final_report: data.final_report ? String(data.final_report) : undefined,
                  summary: data.summary ? String(data.summary) : undefined,
                  metrics: metrics || null,
                  user_profile: (data.user_profile as Record<string, unknown>) || null,
                  proposed_portfolio: (data.proposed_portfolio as Record<string, number>) || null,
                  validation_result: (data.validation_result as Record<string, unknown>) || null,
                  llm_commentary: data.llm_commentary ? String(data.llm_commentary) : null,
                  market_news: data.market_news ? String(data.market_news) : null,
                  visualization_url: data.visualization_url ? String(data.visualization_url) : null,
                  source: 'chat',
                });
              } catch (err) {
                console.warn('[useSSE] Không thể lưu lịch sử báo cáo local', err);
              }
            }

            store.finishStreaming(reportContent, finalRunId, metrics);
            store.setSseStatus('connected');
            break;
          }

          case 'attempt.failed': {
            handlers['attempt.failed']?.(data);
            store.clearStreaming();
            store.setStatus('error');
            store.addMessage({
              type: 'error',
              content: String(data.error || 'Có lỗi xảy ra trong quá trình xử lý'),
              timestamp: Date.now(),
            });
            break;
          }

          case 'heartbeat':
            handlers.heartbeat?.(data);
            break;

          case 'reconnect':
            handlers.reconnect?.(data);
            store.setSseStatus('reconnecting');
            break;

          default:
            console.warn('Unknown SSE event type:', eventType);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    },
    [onEvent],
  );

  const connect = useCallback(
    async (urlOrSessionId: string, handlers: EventHandlers = {}) => {
      if (!urlOrSessionId) return;
      disconnect();
      const store = useAgentStore.getState();
      store.setSseStatus('connecting');

      const useMock =
        isMockApiEnabled() ||
        localStorage.getItem('mockBackend') === '1' ||
        urlOrSessionId.startsWith('mock-');

      const eventUrl =
        urlOrSessionId.startsWith('/api') || urlOrSessionId.startsWith('http')
          ? urlOrSessionId
          : getSessionEventUrl(urlOrSessionId);

      try {
        if (useMock) {
          const { createMockEventSource } = await import('../services/mockEventBus');
          eventSourceRef.current = createMockEventSource(urlOrSessionId) as unknown as EventSource;
        } else {
          eventSourceRef.current = new EventSource(eventUrl);
        }

        eventSourceRef.current.onopen = () => {
          store.setSseStatus('connected');
          reconnectAttemptsRef.current = 0;
        };

        eventSourceRef.current.onmessage = (message) => handleSSEMessage(message, handlers);
        eventSourceRef.current.onerror = () => handleSSEError(eventUrl, handlers);
      } catch (err) {
        console.error('Failed to establish SSE connection:', err);
        store.setSseStatus('disconnected');
        store.setStatus('error');
        store.setError('Không thể kết nối máy chủ chat');
      }
    },
    [disconnect, handleSSEError, handleSSEMessage],
  );

  const sendMessage = useCallback(
    async (targetSessionId: string, text: string, handlers: EventHandlers = {}) => {
      disconnect();
      const store = useAgentStore.getState();
      store.clearStreaming();
      abortControllerRef.current = new AbortController();

      try {
        await sessionApi.send(targetSessionId, text, undefined, abortControllerRef.current.signal);
        await connect(targetSessionId, handlers);
      } catch (err) {
        if ((err as Error).name === 'AbortError' || (err as any).code === 'ERR_CANCELED') return;
        store.clearStreaming();
        throw err;
      }
    },
    [connect, disconnect],
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    disconnect();
  }, [disconnect]);

  useEffect(() => {
    if (sessionId && enabled) {
      connect(sessionId);
    } else if (!enabled) {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId, enabled, connect, disconnect]);

  const status = useAgentStore((state) => state.sseStatus);
  const streamingText = useAgentStore((state) => state.streamingText);
  const toolCalls = useAgentStore((state) => state.toolCalls);

  return {
    status,
    streamingText,
    toolCalls,
    connect,
    disconnect,
    sendMessage,
    abort,
    eventSource: eventSourceRef.current,
  };
}
