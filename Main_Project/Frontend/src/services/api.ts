import axios from "axios";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  HistoryItem,
  ReportResponse,
  HealthStatus,
} from "@/types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000,
  headers: { "Content-Type": "application/json" },
});

export function getBaseUrl(): string {
  return BASE_URL;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      "An unexpected error occurred";
    return Promise.reject(new Error(msg));
  },
);

export const healthApi = {
  check: () => api.get<HealthStatus>("/health").then((r) => r.data),
};

export const analysisApi = {
  submit: (payload: AnalyzeRequest) =>
    api.post<AnalyzeResponse>("/portfolio/analyze", payload).then((r) => r.data),
};

export const historyApi = {
  list: () => api.get<HistoryItem[]>("/portfolio/history").then((r) => r.data),
};

export const reportApi = {
  get: (runId: string) =>
    api.get<ReportResponse>(`/portfolio/report/${runId}`).then((r) => r.data),
};

/* ---------- Session / SSE helpers ---------- */

export const sseUrl = (sessionId: string) =>
  `${BASE_URL}/sessions/${sessionId}/events`;

export const sessionApi = {
  create: (prompt: string) =>
    api
      .post<{ session_id: string }>("/sessions", { prompt })
      .then((r) => r.data),

  send: (sessionId: string, message: string) =>
    api
      .post<{ session_id: string; status: string }>(
        `/sessions/${sessionId}/messages`,
        { message }
      )
      .then((r) => r.data),

  messages: (sessionId: string) =>
    api
      .get<Array<{
        message_id: string;
        role: string;
        content: string;
        created_at: string;
        metadata?: Record<string, unknown>;
      }>>(`/sessions/${sessionId}/messages`)
      .then((r) => r.data),

  cancel: (sessionId: string) =>
    api.delete(`/sessions/${sessionId}`).then((r) => r.data),
};

export default api;
