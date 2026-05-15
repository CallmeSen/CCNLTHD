/**
 * Agent Store (Zustand)
 * Quản lý trạng thái chatbot, session, messages, và streaming realtime
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sessionApi } from '../services/sessionApi';
import type {
  AgentStoreState,
  AgentMessage,
  ToolCallEntry,
  SSEStatus,
} from '../types/agent';

export const useAgentStore = create<AgentStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessionId: null,
      messages: [],
      isStreaming: false,
      streamingText: '',
      toolCalls: [],
      status: 'idle',
      error: null,
      sseStatus: 'disconnected',
      showScrollBtn: false,

      // Session methods
      setSessionId: (id: string) => {
        set({ sessionId: id });
      },

      // Message methods
      addMessage: (message: AgentMessage) => {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      },

      // Streaming text methods
      updateStreamingText: (text: string) => {
        set({
          streamingText: text,
          isStreaming: true,
        });
      },

      appendStreamingText: (text: string) => {
        set((state) => ({
          streamingText: state.streamingText + text,
          isStreaming: true,
        }));
      },

      // Tool calls methods
      setToolCalls: (calls: ToolCallEntry[]) => {
        set({
          toolCalls: calls,
        });
      },

      updateToolCall: (toolId: string, updates: Partial<ToolCallEntry>) => {
        set((state) => ({
          toolCalls: state.toolCalls.map((tool) =>
            tool.id === toolId ? { ...tool, ...updates } : tool
          ),
        }));
      },

      // Status methods
      setStatus: (status: 'idle' | 'streaming' | 'error' | 'sessionLoading') => {
        set({ status });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setSseStatus: (status: SSEStatus) => {
        set({ sseStatus: status });
      },

      // History methods
      clearMessages: () => {
        set({
          messages: [],
          streamingText: '',
          toolCalls: [],
          error: null,
        });
      },

      clearStreaming: () => {
        set({
          streamingText: '',
          toolCalls: [],
          isStreaming: false,
          status: 'idle',
        });
      },

      // Load session and populate messages from backend
      loadSession: async (sessionId: string) => {
        set({ status: 'sessionLoading' });
        try {
          const session = await sessionApi.getMessages(sessionId);
          set({
            sessionId: session.session_id,
            messages: session.messages || [],
            status: 'idle',
            error: null,
          });
        } catch (err) {
          console.error('Failed to load session messages:', err);
          set({ status: 'error', error: 'Không thể tải phiên chat' });
        }
      },
    }),
    {
      name: 'agent-store',
      // Chỉ persist một số fields, không persist streaming state
      partialize: (state) => ({
        messages: state.messages,
        sessionId: state.sessionId,
      }),
    }
  )
);
