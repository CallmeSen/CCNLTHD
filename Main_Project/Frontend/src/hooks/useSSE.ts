/**
 * useSSE Hook
 * Quản lý kết nối EventSource để nhận streaming events từ backend
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAgentStore } from '../store/useAgentStore';
import { TOKEN_KEY } from '../services/apiClient';
import type { ParsedSSEMessage, ToolCallEntry, AgentMessage } from '../types/agent';

interface UseSSEOptions {
  sessionId: string | null;
  enabled?: boolean;
  onEvent?: (event: ParsedSSEMessage) => void;
}

export const useSSE = ({ sessionId, enabled = true, onEvent }: UseSSEOptions) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const {
    setSseStatus,
    appendStreamingText,
    setToolCalls,
    updateToolCall,
    addMessage,
    setStatus,
    setError,
    clearStreaming,
  } = useAgentStore();

  const handleSSEError = useCallback(() => {
    setSseStatus('disconnected');
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      setSseStatus('reconnecting');
      reconnectAttemptsRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        if (sessionId) {
          connectSSE();
        }
      }, reconnectDelay);
    } else {
      setError('Connection lost. Please try again.');
      setStatus('error');
    }
  }, [sessionId, setSseStatus, setError, setStatus]);

  const handleSSEMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as ParsedSSEMessage;

        // Gọi callback nếu có
        if (onEvent) {
          onEvent(data);
        }

        // Xử lý từng loại event
        switch (data.type) {
          case 'text_delta':
            // Nối thêm văn bản streaming
            appendStreamingText(data.data?.text || '');
            break;

          case 'tool_call':
            // Thêm tool call mới
            if (data.data) {
              const toolCall: ToolCallEntry = {
                id: data.data.id || `tool-${Date.now()}`,
                tool: data.data.tool || 'Unknown',
                arguments: data.data.arguments || {},
                status: 'running',
                timestamp: data.timestamp || Date.now(),
              };
              setToolCalls((prev) => [...(prev || []), toolCall]);
            }
            break;

          case 'tool_result':
            // Cập nhật tool call với kết quả
            if (data.data?.id) {
              updateToolCall(data.data.id, {
                status: data.data.error ? 'error' : 'done',
                result: data.data.result,
                error: data.data.error,
                preview: data.data.preview,
                elapsed_ms: data.data.elapsed_ms,
              });
            }
            break;

          case 'thinking_done':
            // Sự kiện thinking hoàn thành
            if (data.data?.content) {
              const thinkingMsg: AgentMessage = {
                id: `thinking-${Date.now()}`,
                type: 'thinking',
                content: data.data.content,
                timestamp: Date.now(),
              };
              addMessage(thinkingMsg);
            }
            break;

          case 'compact':
            // Context compacting
            if (data.data?.status) {
              const compactMsg: AgentMessage = {
                id: `compact-${Date.now()}`,
                type: 'compact',
                content: `Compacting context... (${data.data.status})`,
                timestamp: Date.now(),
              };
              addMessage(compactMsg);
            }
            break;

          case 'attempt.completed':
            // Workflow completed
            if (data.data?.summary) {
              const answerMsg: AgentMessage = {
                id: `answer-${Date.now()}`,
                type: 'answer',
                content: data.data.summary,
                timestamp: Date.now(),
                runId: data.data.run_id,
                metrics: data.data.metrics,
              };
              addMessage(answerMsg);
              clearStreaming();
              setStatus('idle');
            }
            break;

          case 'attempt.failed':
            // Workflow failed
            clearStreaming();
            setStatus('error');
            const errorMsg: AgentMessage = {
              id: `error-${Date.now()}`,
              type: 'error',
              content: data.data?.error || 'An error occurred during processing',
              timestamp: Date.now(),
            };
            addMessage(errorMsg);
            break;

          case 'heartbeat':
            // Keep-alive heartbeat, không cần xử lý đặc biệt
            break;

          case 'reconnect':
            // Server yêu cầu reconnect
            handleSSEError();
            break;

          default:
            console.warn('Unknown SSE event type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    },
    [appendStreamingText, setToolCalls, updateToolCall, addMessage, setStatus, setError, clearStreaming, onEvent]
  );

  const connectSSE = useCallback(async () => {
    if (!sessionId || !enabled) {
      return;
    }

    try {
      setSseStatus('connecting');

      // Tạo EventSource
      const useMock = import.meta.env.VITE_MOCK_API === 'true' || localStorage.getItem('mockBackend') === '1' || (sessionId && sessionId.startsWith('mock-'));
      if (useMock) {
        // use mock event source
        const { createMockEventSource } = await import('../services/mockEventBus');
        // @ts-ignore assignable to EventSource-like
        eventSourceRef.current = createMockEventSource(sessionId) as unknown as EventSource;
        // adapt handlers
        const mockSrc: any = eventSourceRef.current;
        mockSrc.onopen = () => {
          setSseStatus('connected');
          reconnectAttemptsRef.current = 0;
        };
        mockSrc.onmessage = (e: MessageEvent) => handleSSEMessage(e);
        mockSrc.onerror = () => {
          handleSSEError();
        };
      } else {
        const token = localStorage.getItem(TOKEN_KEY);
        const eventSourceUrl = token
          ? `/api/ai/sessions/${sessionId}/events?token=${encodeURIComponent(token)}`
          : `/api/ai/sessions/${sessionId}/events`;

        eventSourceRef.current = new EventSource(eventSourceUrl);
      }

      // Attach event listeners
      eventSourceRef.current.onopen = () => {
        setSseStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      eventSourceRef.current.onmessage = handleSSEMessage;

      eventSourceRef.current.onerror = () => {
        handleSSEError();
      };
    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
      setSseStatus('disconnected');
      setError('Failed to connect to chat server');
    }
  }, [sessionId, enabled, setSseStatus, handleSSEMessage, handleSSEError, setError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    reconnectAttemptsRef.current = 0;
    setSseStatus('disconnected');
  }, [setSseStatus]);

  // Tự động kết nối/ngắt kết nối khi sessionId hoặc enabled thay đổi
  useEffect(() => {
    if (sessionId && enabled) {
      connectSSE();
    } else {
      disconnect();
    }

    return () => {
      // Cleanup khi component unmount
      disconnect();
    };
  }, [sessionId, enabled, connectSSE, disconnect]);

  return {
    isConnected: useRef(false).current, // Có thể được cập nhật từ setSseStatus
    connect: connectSSE,
    disconnect,
    eventSource: eventSourceRef.current,
  };
};
