export type AgentMessageType =
  | 'user'
  | 'answer'
  | 'error'
  | 'tool_call'
  | 'tool_result'
  | 'run_complete'
  | 'thinking'
  | 'compact';

export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error';
export type SSEStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
export type AgentStatus = 'idle' | 'streaming' | 'error' | 'sessionLoading';

export interface ToolCallEntry {
  id: string;
  tool: string;
  arguments?: Record<string, unknown>;
  status: ToolCallStatus;
  preview?: string;
  elapsed_ms?: number;
  timestamp?: number;
  result?: unknown;
  error?: string;
}

export interface AgentMessage {
  id: string;
  type: AgentMessageType;
  content: string;
  timestamp: number;
  tool?: string;
  args?: Record<string, unknown>;
  status?: ToolCallStatus | string;
  elapsed_ms?: number;
  runId?: string;
  metrics?: Record<string, unknown>;
  equityCurve?: Array<{ time?: string | number; date?: string; equity: number; drawdown?: number }>;
  shadowId?: string;
  error?: string;
  preview?: string;
  toolCalls?: ToolCallEntry[];
  summary?: string;
}

export interface AnalyzeRequest {
  request: string;
  lang?: 'en' | 'vi';
}

export interface ValidationResult {
  status?: string;
  is_valid?: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface AnalyzeResponse {
  run_id: string;
  status: string;
  final_report?: string;
  report?: string;
  user_profile?: Record<string, unknown>;
  proposed_portfolio?: Record<string, number>;
  metrics?: Record<string, unknown>;
  validation_result?: ValidationResult | Record<string, unknown>;
  llm_commentary?: string | null;
  market_news?: string | null;
  visualization_url?: string | null;
  equity_curve?: Array<{ date: string; equity: number; drawdown?: number }>;
  correlation_matrix?: { symbols: string[]; matrix: number[][] };
  lang?: 'en' | 'vi' | string | null;
  error?: string;
}

export interface ChatSession {
  session_id: string;
  user_id?: string;
  created_at?: string | number;
  updated_at?: string | number;
  is_active?: number;
  messages: AgentMessage[];
  status?: string;
}

export interface ChatMessageItem {
  message_id: number | string;
  session_id: string;
  role: 'user' | 'assistant' | string;
  content: string;
  lang?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface ChatSessionListItem {
  session_id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  is_active: number;
  message_count: number;
}

export interface HistoryItem {
  run_id: string;
  timestamp: string | number;
  request?: string;
  status: string;
  portfolio?: Record<string, number> | null;
  summary?: string;
}

export interface SessionResponse {
  session_id: string;
  status?: string;
  error?: string;
}

export interface SendMessageRequest {
  message: string;
  lang?: 'en' | 'vi';
}

export interface SendMessageResponse {
  session_id: string;
  status: string;
  error?: string;
}

export interface ParsedSSEMessage {
  type?: string;
  event?: string;
  data?: unknown;
  [key: string]: unknown;
}

export interface AgentStoreState {
  sessionId: string | null;
  messages: AgentMessage[];
  isStreaming: boolean;
  sessionLoading: boolean;
  streamingText: string;
  toolCalls: ToolCallEntry[];
  status: AgentStatus;
  error: string | null;
  sseStatus: SSEStatus;
  showScrollBtn: boolean;
  setSessionId: (id: string | null) => void;
  setSessionLoading: (value: boolean) => void;
  cacheSession: (id: string, messages: AgentMessage[]) => void;
  getCachedSession: (id: string) => AgentMessage[] | undefined;
  switchSession: (id: string, cached?: AgentMessage[]) => void;
  reset: () => void;
  addMessage: (message: Partial<AgentMessage> & { type: AgentMessageType; content: string }) => void;
  loadHistory: (messages: AgentMessage[]) => void;
  updateStreamingText: (text: string) => void;
  appendStreamingText: (text: string) => void;
  appendDelta: (delta: string) => void;
  setToolCalls: (calls: ToolCallEntry[]) => void;
  addToolCall: (tool: Omit<ToolCallEntry, 'id'> & { id?: string }) => void;
  updateToolCall: (toolId: string, updates: Partial<ToolCallEntry>) => void;
  clearToolCalls: () => void;
  setStatus: (status: AgentStatus) => void;
  setError: (error: string | null) => void;
  setSseStatus: (status: SSEStatus) => void;
  clearMessages: () => void;
  clearStreaming: () => void;
  finishStreaming: (finalContent: string, runId?: string, metrics?: Record<string, unknown>) => void;
  loadSession: (sessionId: string) => Promise<void>;
}

export interface UserProfile {
  risk_tolerance?: string;
  investment_horizon?: string;
  goals?: string[];
}

export interface PortfolioMetrics {
  total_return?: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  volatility?: number;
  win_rate?: number;
}
