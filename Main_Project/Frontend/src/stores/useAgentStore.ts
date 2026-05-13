import { create } from "zustand";
import type { AgentMessage, ToolCallEntry } from "@/types/index";

interface AgentState {
  messages: AgentMessage[];
  sessionId: string | null;
  status: "idle" | "streaming" | "error";
  sessionLoading: boolean;
  streamingText: string;
  toolCalls: ToolCallEntry[];
  sseStatus: "disconnected" | "connecting" | "connected" | "reconnecting";

  // Session management
  setSessionId: (id: string | null) => void;
  setSessionLoading: (v: boolean) => void;
  cacheSession: (id: string, msgs: AgentMessage[]) => void;
  getCachedSession: (id: string) => AgentMessage[] | undefined;
  switchSession: (id: string, cached: AgentMessage[] | undefined) => void;
  reset: () => void;

  // Message management
  addMessage: (msg: Partial<AgentMessage> & { type: AgentMessage["type"]; content: string }) => void;
  loadHistory: (msgs: AgentMessage[]) => void;
  appendDelta: (delta: string) => void;
  clearStreaming: () => void;
  setStatus: (status: AgentState["status"]) => void;
  setSseStatus: (status: AgentState["sseStatus"]) => void;

  // Called by useSSE when attempt.completed fires — converts accumulated
  // tool calls into tool_call / tool_result messages, clears streaming.
  finishStreaming: (finalContent: string, runId?: string) => void;
  addToolCall: (tool: Omit<ToolCallEntry, "id">) => void;
  updateToolCall: (id: string, updates: Partial<ToolCallEntry>) => void;
  clearToolCalls: () => void;
  clearMessages: () => void;
}

const _sessionCache = new Map<string, AgentMessage[]>();

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: [],
  sessionId: null,
  status: "idle",
  sessionLoading: false,
  streamingText: "",
  toolCalls: [],
  sseStatus: "disconnected",

  setSessionId: (id) => set({ sessionId: id }),
  setSessionLoading: (v) => set({ sessionLoading: v }),

  cacheSession: (id, msgs) => _sessionCache.set(id, msgs),
  getCachedSession: (id) => _sessionCache.get(id),
  switchSession: (id, cached) =>
    set({
      sessionId: id,
      messages: cached ?? [],
      streamingText: "",
      toolCalls: [],
      status: "idle",
    }),

  reset: () =>
    set({
      messages: [],
      sessionId: null,
      streamingText: "",
      toolCalls: [],
      status: "idle",
      sseStatus: "disconnected",
    }),

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...msg,
          id: msg.id || crypto.randomUUID(),
          timestamp: msg.timestamp || Date.now(),
        },
      ],
    })),

  loadHistory: (msgs) => set({ messages: msgs }),

  appendDelta: (delta) =>
    set((state) => ({ streamingText: state.streamingText + delta })),

  clearStreaming: () => set({ streamingText: "" }),

  setStatus: (status) => set({ status }),

  setSseStatus: (sseStatus) => set({ sseStatus }),

  finishStreaming: (finalContent: string, runId?: string) => {
    const { toolCalls } = get();
    const completedTools = toolCalls;

    const newMessages: AgentMessage[] = [];

    for (const tc of completedTools) {
      newMessages.push({
        id: crypto.randomUUID(),
        type: "tool_call",
        content: "",
        tool: tc.tool,
        args: tc.arguments,
        status: tc.status,
        timestamp: tc.timestamp ?? Date.now(),
      });
      if (tc.elapsed_ms != null) {
        newMessages.push({
          id: crypto.randomUUID(),
          type: "tool_result",
          content: tc.preview || "",
          tool: tc.tool,
          status: tc.status,
          elapsed_ms: tc.elapsed_ms,
          timestamp: (tc.timestamp ?? Date.now()) + 1,
        });
      }
    }

    if (finalContent) {
      newMessages.push({
        id: crypto.randomUUID(),
        type: "answer",
        content: finalContent,
        runId,
        timestamp: Date.now(),
      });
    }

    set((state) => ({
      messages: [...state.messages, ...newMessages],
      streamingText: "",
      status: "idle",
      toolCalls: [],
    }));
  },

  addToolCall: (tool) =>
    set((state) => ({
      toolCalls: [
        ...state.toolCalls,
        { ...tool, id: crypto.randomUUID() },
      ],
    })),

  updateToolCall: (id, updates) =>
    set((state) => ({
      toolCalls: state.toolCalls.map((t) =>
        t.id === id || t.tool === id ? { ...t, ...updates } : t
      ),
    })),

  clearToolCalls: () => set({ toolCalls: [] }),

  clearMessages: () =>
    set({
      messages: [],
      streamingText: "",
      status: "idle",
      toolCalls: [],
    }),
}));
