import { apiClient, TOKEN_KEY } from './apiClient';
import { API_BASE_URL, isMockApiEnabled } from '../config/runtimeEnv';
import { saveReportHistory } from './reportHistory';
import { parseAppTimestamp } from '../lib/dateTime';
import { getProposedPortfolio, normalizeIntent, shouldShowPortfolioReport } from '../lib/reportVisibility';
import type {
  AgentMessage,
  AnalyzeRequest,
  AnalyzeResponse,
  ChatMessageItem,
  ChatSession,
  ChatSessionListItem,
  HistoryItem,
  SendMessageRequest,
  SendMessageResponse,
  SessionResponse,
} from '../types/agent';

const BASE_URL = '/ai';
const VIETNAMESE_CHAR_PATTERN = /[\u00C0-\u024F\u1EA0-\u1EF9]/;

function detectMessageLanguage(message: string): 'en' | 'vi' {
  if (VIETNAMESE_CHAR_PATTERN.test(message)) return 'vi';

  const normalized = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd');

  const viKeywords = [
    'toi',
    'minh',
    'xin chao',
    'chao',
    'chao ban',
    'cam on',
    'cho toi',
    'toi can',
    'minh muon',
    'giup minh',
    'ban oi',
    'phan tich',
    'co phieu',
    'danh muc',
    'dau tu',
    'thi truong',
    'chung khoan',
    'rui ro',
    'loi nhuan',
    'bao cao',
    'tu van',
  ];
  const enKeywords = ['analyze', 'stock', 'portfolio', 'invest', 'market', 'risk', 'return', 'report', 'please'];

  const viScore = viKeywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0);
  const enScore = enKeywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0);

  return viScore > enScore ? 'vi' : 'en';
}

function isMockSession(sessionId?: string | null) {
  return (
    isMockApiEnabled() ||
    localStorage.getItem('mockBackend') === '1' ||
    Boolean(sessionId?.startsWith('mock-'))
  );
}

function toAgentMessage(message: ChatMessageItem | any, index: number): AgentMessage {
  const role = message.role || message.type;
  const type = role === 'user' ? 'user' : role === 'assistant' ? 'answer' : role || 'answer';
  const metadata = message.metadata || {};
  const intent = normalizeIntent(message.intent || metadata.intent || metadata.workflow);
  const proposedPortfolio = getProposedPortfolio(message.proposed_portfolio || metadata.proposed_portfolio);
  const showFullReport = shouldShowPortfolioReport(
    intent,
    proposedPortfolio,
    message.showFullReport ?? metadata.showFullReport,
  );
  const runId = message.run_id || message.runId || metadata.run_id;

  return {
    id: String(message.id || message.message_id || `db-msg-${index}`),
    type,
    content: String(message.content || ''),
    timestamp: message.created_at ? parseAppTimestamp(message.created_at) : Number(message.timestamp || Date.now()),
    runId: showFullReport ? runId : undefined,
    intent,
    showFullReport,
    proposed_portfolio: proposedPortfolio,
    metrics: message.metrics || metadata.metrics,
  };
}

export function getSessionEventUrl(sessionId: string) {
  const token = localStorage.getItem(TOKEN_KEY);
  const apiBaseUrl = API_BASE_URL.replace(/\/$/, '');
  return token
    ? `${apiBaseUrl}${BASE_URL}/sessions/${sessionId}/events?token=${encodeURIComponent(token)}`
    : `${apiBaseUrl}${BASE_URL}/sessions/${sessionId}/events`;
}

export const sessionApi = {
  create: async (prompt = 'Phiên chat mới'): Promise<SessionResponse> => {
    if (isMockSession()) {
      return { session_id: `mock-${Date.now()}`, status: 'created' };
    }

    const response = await apiClient.post<SessionResponse>(`${BASE_URL}/sessions`, { prompt });
    return response.data;
  },

  send: async (
    sessionId: string,
    message: string,
    lang?: 'en' | 'vi',
    signal?: AbortSignal,
  ): Promise<SendMessageResponse> => {
    if (isMockSession(sessionId)) {
      try {
        const { sendMockEvent } = await import('./mockEventBus');
        setTimeout(
          () => sendMockEvent(sessionId, { type: 'text_delta', data: { text: 'Đang phân tích yêu cầu...' } }),
          180,
        );
        setTimeout(
          () =>
            sendMockEvent(sessionId, {
              type: 'tool_call',
              data: { id: 'mock-tool-1', tool: 'market_lookup', arguments: { query: message } },
            }),
          550,
        );
        setTimeout(
          () =>
            sendMockEvent(sessionId, {
              type: 'tool_result',
              data: {
                id: 'mock-tool-1',
                tool: 'market_lookup',
                result: 'Đã tìm dữ liệu thị trường',
                preview: 'Dữ liệu giá và tin tức mới nhất đã sẵn sàng.',
                elapsed_ms: 620,
              },
            }),
          1200,
        );
        setTimeout(
          () =>
            sendMockEvent(sessionId, {
              type: 'text_delta',
              data: { text: '\nGợi ý mẫu: cân bằng danh mục, kiểm soát rủi ro và theo dõi biến động trong tuần tới.' },
            }),
          1550,
        );
        setTimeout(
          () =>
            sendMockEvent(sessionId, {
              type: 'attempt.completed',
              data: {
                summary:
                  'Báo cáo mẫu: danh mục nên ưu tiên đa dạng hóa, giữ tỷ trọng tiền mặt hợp lý và theo dõi các mã có động lượng tốt.',
                run_id: `mock-run-${Date.now()}`,
                status: 'completed',
              },
            }),
          2200,
        );
      } catch (err) {
        console.error('Failed to emit mock events:', err);
      }
      return { session_id: sessionId, status: 'running' };
    }

    const payload: SendMessageRequest = { message, lang: lang || detectMessageLanguage(message) };
    const response = await apiClient.post<SendMessageResponse>(`${BASE_URL}/sessions/${sessionId}/messages`, payload, {
      signal,
    });
    return response.data;
  },

  getEventStream: (sessionId: string): EventSource => new EventSource(getSessionEventUrl(sessionId)),

  cancel: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/sessions/${sessionId}`);
  },

  getMessages: async (sessionId: string): Promise<ChatSession> => {
    if (isMockSession(sessionId)) {
      return {
        session_id: sessionId,
        messages: [],
        status: 'mock',
      };
    }

    const response = await apiClient.get<ChatSession | ChatMessageItem[]>(`${BASE_URL}/sessions/${sessionId}/messages`);
    const raw = response.data;
    const messagesRaw = Array.isArray(raw) ? raw : raw.messages || [];
    const messages = messagesRaw.map(toAgentMessage);

    return {
      ...(Array.isArray(raw) ? {} : raw),
      session_id: Array.isArray(raw) ? sessionId : raw.session_id || sessionId,
      messages,
    };
  },

  getSessions: async (userId?: string): Promise<ChatSessionListItem[]> => {
    if (isMockSession()) {
      return [
        {
          session_id: 'mock-session-demo',
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          updated_at: new Date().toISOString(),
          is_active: 1,
          message_count: 3,
        },
      ];
    }

    const url = userId ? `${BASE_URL}/sessions?user_id=${encodeURIComponent(userId)}` : `${BASE_URL}/sessions`;
    const response = await apiClient.get<ChatSessionListItem[]>(url);
    return response.data;
  },

  analyze: async (request: AnalyzeRequest): Promise<AnalyzeResponse> => {
    const response = await apiClient.post<AnalyzeResponse>(`${BASE_URL}/portfolio/analyze`, request);
    const result = response.data;

    if (result?.run_id) {
      saveReportHistory({
        run_id: result.run_id,
        timestamp: Date.now(),
        status: result.status,
        request: request.request,
        report: result.report || result.final_report || result.llm_commentary || '',
        final_report: result.final_report,
        summary: result.llm_commentary || undefined,
        metrics: result.metrics || null,
        user_profile: result.user_profile || null,
        proposed_portfolio: result.proposed_portfolio || null,
        validation_result: (result.validation_result as Record<string, unknown>) || null,
        llm_commentary: result.llm_commentary || null,
        market_news: result.market_news || null,
        visualization_url: result.visualization_url || null,
        source: 'analysis',
      });
    }

    return result;
  },

  getHistory: async (): Promise<HistoryItem[]> => {
    if (isMockSession()) {
      return [
        {
          run_id: 'mock-run-1',
          status: 'completed',
          timestamp: Date.now() - 1000 * 60 * 60,
          request: 'Phân tích danh mục mẫu',
        },
      ];
    }

    const response = await apiClient.get<HistoryItem[]>(`${BASE_URL}/portfolio/history`);
    return response.data;
  },

  getReport: async (runId: string): Promise<AnalyzeResponse> => {
    const response = await apiClient.get<AnalyzeResponse>(`${BASE_URL}/portfolio/report/${runId}`);
    return response.data;
  },

  health: async (): Promise<unknown> => {
    const response = await apiClient.get(`${BASE_URL}/health`);
    return response.data;
  },
};
