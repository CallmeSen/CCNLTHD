import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sessionApi } from '../services/sessionApi';
import type { AgentMessage, AgentStoreState, ToolCallEntry } from '../types/agent';

const sessionCache = new Map<string, AgentMessage[]>();

function makeId(prefix = 'msg') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useAgentStore = create<AgentStoreState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      messages: [],
      isStreaming: false,
      sessionLoading: false,
      streamingText: '',
      toolCalls: [],
      status: 'idle',
      error: null,
      sseStatus: 'disconnected',
      showScrollBtn: false,

      setSessionId: (id) => set({ sessionId: id }),
      setSessionLoading: (value) => set({ sessionLoading: value }),

      cacheSession: (id, messages) => {
        sessionCache.set(id, messages);
      },

      getCachedSession: (id) => sessionCache.get(id),

      switchSession: (id, cached) =>
        set({
          sessionId: id,
          messages: cached ?? [],
          streamingText: '',
          toolCalls: [],
          isStreaming: false,
          status: 'idle',
          error: null,
        }),

      reset: () =>
        set({
          sessionId: null,
          messages: [],
          streamingText: '',
          toolCalls: [],
          isStreaming: false,
          sessionLoading: false,
          status: 'idle',
          error: null,
          sseStatus: 'disconnected',
        }),

      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: message.id || makeId('msg'),
              content: message.content ?? '',
              timestamp: message.timestamp || Date.now(),
            } as AgentMessage,
          ],
        })),

      loadHistory: (messages) => set({ messages }),

      updateStreamingText: (text) =>
        set({
          streamingText: text,
          isStreaming: Boolean(text),
        }),

      appendStreamingText: (text) =>
        set((state) => ({
          streamingText: state.streamingText + text,
          isStreaming: true,
        })),

      appendDelta: (delta) =>
        set((state) => ({
          streamingText: state.streamingText + delta,
          isStreaming: true,
        })),

      setToolCalls: (calls) => set({ toolCalls: calls }),

      addToolCall: (tool) =>
        set((state) => {
          const alreadyRunning = state.toolCalls.some(
            (entry) => entry.tool === tool.tool && entry.status === 'running',
          );
          if (alreadyRunning) return state;

          const nextTool: ToolCallEntry = {
            ...tool,
            id: tool.id || makeId('tool'),
            status: tool.status || 'running',
            timestamp: tool.timestamp || Date.now(),
          };

          return { toolCalls: [...state.toolCalls, nextTool] };
        }),

      updateToolCall: (toolId, updates) =>
        set((state) => ({
          toolCalls: state.toolCalls.map((tool) =>
            tool.id === toolId || tool.tool === toolId ? { ...tool, ...updates } : tool,
          ),
        })),

      clearToolCalls: () => set({ toolCalls: [] }),

      setStatus: (status) => set({ status, isStreaming: status === 'streaming' }),
      setError: (error) => set({ error }),
      setSseStatus: (sseStatus) => set({ sseStatus }),

      clearMessages: () =>
        set({
          messages: [],
          streamingText: '',
          toolCalls: [],
          isStreaming: false,
          status: 'idle',
          error: null,
        }),

      clearStreaming: () =>
        set({
          streamingText: '',
          isStreaming: false,
          status: 'idle',
        }),

      finishStreaming: (finalContent, runId, metrics, metadata) => {
        const content = finalContent || get().streamingText;
        if (!content) {
          set({ streamingText: '', isStreaming: false, status: 'idle' });
          return;
        }

        const showFullReport = Boolean(metadata?.showFullReport && runId);

        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: makeId('answer'),
              type: 'answer',
              content,
              runId: showFullReport ? runId : undefined,
              intent: metadata?.intent,
              showFullReport,
              proposed_portfolio: metadata?.proposed_portfolio,
              metrics,
              timestamp: Date.now(),
            },
          ],
          streamingText: '',
          isStreaming: false,
          status: 'idle',
          error: null,
        }));
      },

      loadSession: async (sessionId) => {
        const cached = get().getCachedSession(sessionId);
        if (cached) {
          get().switchSession(sessionId, cached);
          return;
        }

        set({ sessionLoading: true, status: 'sessionLoading', error: null });
        try {
          const session = await sessionApi.getMessages(sessionId);
          const messages = session.messages || [];
          sessionCache.set(sessionId, messages);

          const currentToolCalls = get().toolCalls;
          const currentSessionId = get().sessionId;
          if (currentSessionId === sessionId && get().status === 'streaming') {
            set({ sessionLoading: false });
            return;
          }
          const isSameSession = currentSessionId === sessionId && currentToolCalls.length > 0;

          let persistedToolCalls: ToolCallEntry[] = [];
          try {
            const raw = localStorage.getItem('agent-store');
            if (raw) {
              const parsed = JSON.parse(raw);
              persistedToolCalls = parsed.state?.toolCalls || [];
            }
          } catch {
            // ignore parse errors
          }

          set({
            sessionId: session.session_id || sessionId,
            messages,
            sessionLoading: false,
            status: 'idle',
            error: null,
            streamingText: '',
            toolCalls: isSameSession
              ? currentToolCalls
              : persistedToolCalls.length > 0
                ? persistedToolCalls
                : [],
            isStreaming: false,
          });
        } catch (err) {
          console.error('Failed to load session messages:', err);
          set({
            sessionLoading: false,
            status: 'error',
            error: 'Không thể tải phiên chat',
          });
        }
      },
    }),
    {
      name: 'agent-store',
      partialize: (state) => ({
        messages: state.messages,
        sessionId: state.sessionId,
        toolCalls: state.toolCalls,
      }),
    },
  ),
);
