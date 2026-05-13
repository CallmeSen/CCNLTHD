export interface AnalyzeRequest {
  request: string;
  lang?: "en" | "vi";
}

export interface AnalyzeResponse {
  run_id: string;
  status: string;
  final_report?: string;
  report: string;
  user_profile?: Record<string, unknown>;
  proposed_portfolio?: Record<string, number>;
  metrics?: Record<string, unknown>;
  validation_result?: ValidationResult;
  llm_commentary?: string | null;
  market_news?: string | null;
  visualization_url?: string | null;
  lang?: string | null;
  error?: string;
}

export interface ValidationResult {
  status: string;
  errors?: string[];
  warnings?: string[];
}

export interface HistoryItem {
  run_id: string;
  timestamp: string;
  request: string;
  status: string;
  portfolio?: Record<string, number> | null;
}

export interface ReportResponse {
  run_id: string;
  status: string;
  report: string;
  created_at?: string;
  user_profile?: Record<string, unknown>;
  proposed_portfolio?: Record<string, number>;
  metrics?: Record<string, unknown>;
  validation_result?: ValidationResult;
  llm_commentary?: string | null;
  market_news?: string | null;
  visualization_url?: string | null;
  lang?: string | null;
}

export interface HealthStatus {
  status: string;
  database?: string;
  timestamp?: string;
  service?: string;
  version?: string;
}

// ---------------------------------------------------------------------------
// Agent / SSE types
// ---------------------------------------------------------------------------

export type ToolStatus = "pending" | "running" | "done" | "error";

export interface ToolCallEntry {
  id: string;
  tool: string;
  arguments?: Record<string, unknown>;
  status: ToolStatus;
  preview?: string;
  elapsed_ms?: number;
  timestamp?: number;
}

export type AgentMessageType =
  | "user"
  | "answer"
  | "error"
  | "tool_call"
  | "tool_result"
  | "run_complete"
  | "thinking"
  | "compact";

export interface AgentMessage {
  id: string;
  type: AgentMessageType;
  content: string;
  tool?: string;
  args?: Record<string, unknown>;
  status?: ToolStatus;
  elapsed_ms?: number;
  runId?: string;
  metrics?: Record<string, unknown>;
  equityCurve?: Array<{ time: string | number; equity: number }>;
  shadowId?: string;
  runId?: string;
  timestamp: number;
}

export interface SSEEventHandlers {
  text_delta: (delta: string) => void;
  thinking_done: () => void;
  tool_call: (data: { tool: string; arguments: Record<string, unknown> }) => void;
  tool_result: (data: { tool: string; status: string; preview: string; elapsed_ms: number }) => void;
  compact: () => void;
  "attempt.completed": (data: { run_dir: string; summary: string }) => void;
  "attempt.failed": (data: { error: string }) => void;
  heartbeat: () => void;
  reconnect: (attempt: number) => void;
}
