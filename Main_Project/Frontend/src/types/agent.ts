/**
 * Agent/Chatbot Types
 * Định nghĩa các kiểu dữ liệu cho hệ thống chatbot multi-agent
 */

// Agent message types
export type AgentMessageType =
  | 'user'
  | 'answer'
  | 'error'
  | 'tool_call'
  | 'tool_result'
  | 'run_complete'
  | 'thinking'
  | 'compact';

// Tool call status
export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error';

// SSE status
export type SSEStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * Đại diện cho một tool call đang chạy
 */
export interface ToolCallEntry {
  id: string;
  tool: string;
  arguments: Record<string, any>;
  status: ToolCallStatus;
  preview?: string;
  elapsed_ms?: number;
  timestamp?: number;
  result?: any;
  error?: string;
}

/**
 * Đại diện cho một message trong hội thoại
 */
export interface AgentMessage {
  id: string;
  type: AgentMessageType;
  content?: string;
  timestamp: number;
  tool?: string;
  args?: Record<string, any>;
  status?: string;
  elapsed_ms?: number;
  runId?: string;
  metrics?: Record<string, any>;
  equityCurve?: any;
  shadowId?: string;
  error?: string;
  preview?: string;
  toolCalls?: ToolCallEntry[];
  summary?: string;
}

/**
 * Request gửi đến backend để phân tích
 */
export interface AnalyzeRequest {
  request: string;
  lang?: 'en' | 'vi';
}

/**
 * Response từ backend sau khi phân tích hoàn thành
 */
export interface AnalyzeResponse {
  run_id: string;
  status: string;
  final_report?: string;
  report?: any;
  user_profile?: any;
  proposed_portfolio?: any;
  metrics?: any;
  validation_result?: any;
  llm_commentary?: string;
  market_news?: any;
  visualization_url?: string;
  lang?: 'en' | 'vi';
  error?: string;
}

/**
 * Session hội thoại
 */
export interface ChatSession {
  session_id: string;
  created_at?: number;
  updated_at?: number;
  messages: AgentMessage[];
  status?: string;
}

/**
 * Session response từ backend
 */
export interface SessionResponse {
  session_id: string;
  status?: string;
  error?: string;
}

/**
 * Message request body gửi đến backend
 */
export interface SendMessageRequest {
  message: string;
}

/**
 * Message response từ backend
 */
export interface SendMessageResponse {
  session_id: string;
  status: string;
  error?: string;
}

/**
 * SSE Event types từ backend
 */
export interface SSEEvent {
  event: string; // 'text_delta', 'tool_call', 'tool_result', 'thinking_done', 'compact', 'attempt.completed', 'attempt.failed', 'heartbeat', 'reconnect'
  data?: any;
  timestamp?: number;
  id?: string;
}

/**
 * Parsed SSE message từ backend
 */
export interface ParsedSSEMessage {
  type: string;
  data?: any;
}

/**
 * State của streaming hiện tại
 */
export interface StreamingState {
  isStreaming: boolean;
  streamingText: string;
  toolCalls: ToolCallEntry[];
  currentRunId?: string;
  status: 'idle' | 'streaming' | 'error';
  error?: string;
}

/**
 * Store state cho chatbot
 */
export interface AgentStoreState {
  // Session
  sessionId: string | null;
  messages: AgentMessage[];
  
  // Streaming
  isStreaming: boolean;
  streamingText: string;
  toolCalls: ToolCallEntry[];
  status: 'idle' | 'streaming' | 'error' | 'sessionLoading';
  error: string | null;
  
  // SSE Connection
  sseStatus: SSEStatus;
  
  // UI State
  showScrollBtn: boolean;
  
  // Methods
  setSessionId: (id: string) => void;
  addMessage: (message: AgentMessage) => void;
  updateStreamingText: (text: string) => void;
  appendStreamingText: (text: string) => void;
  setToolCalls: (calls: ToolCallEntry[]) => void;
  updateToolCall: (toolId: string, updates: Partial<ToolCallEntry>) => void;
  setStatus: (status: 'idle' | 'streaming' | 'error' | 'sessionLoading') => void;
  setError: (error: string | null) => void;
  setSseStatus: (status: SSEStatus) => void;
  clearMessages: () => void;
  clearStreaming: () => void;
  loadSession: (sessionId: string) => void;
}

/**
 * Portfolio analysis related types
 */
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

export interface ValidationResult {
  is_valid: boolean;
  errors?: string[];
  warnings?: string[];
}
