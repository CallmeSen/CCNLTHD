/**
 * Session API Service
 * Các endpoint liên quan đến chatbot sessions và messages
 */

import { apiClient } from './apiClient';
import { saveReportHistory } from './reportHistory';
import type {
  SessionResponse,
  SendMessageRequest,
  SendMessageResponse,
  AnalyzeRequest,
  AnalyzeResponse,
} from '../types/agent';
import type { ChatSession } from '../types/agent';

const BASE_URL = '/ai';

export const sessionApi = {
  /**
   * Tạo session mới
   */
  create: async (prompt?: string): Promise<SessionResponse> => {
    const mockFlag = import.meta.env.VITE_MOCK_API === 'true' || localStorage.getItem('mockBackend') === '1';
    if (mockFlag) {
      return Promise.resolve({ session_id: `mock-${Date.now()}` });
    }

    try {
      const response = await apiClient.post<SessionResponse>(`${BASE_URL}/sessions`, {
        prompt: prompt || 'New chat session',
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create session:', error);
      // Fallback to mock session so UI remains testable
      const fallbackId = `mock-${Date.now()}`;
      console.warn('Falling back to mock session id:', fallbackId);
      return { session_id: fallbackId };
    }
  },

  /**
   * Gửi message vào session
   */
  send: async (sessionId: string, message: string): Promise<SendMessageResponse> => {
    const mockFlag =
      import.meta.env.VITE_MOCK_API === 'true' ||
      localStorage.getItem('mockBackend') === '1' ||
      sessionId.startsWith('mock-');
    if (mockFlag) {
      // Simulate accepted send
      // Emit mock events via mockEventBus asynchronously
      try {
        const { sendMockEvent } = await import('./mockEventBus');
        // small streaming of text deltas
        setTimeout(() => sendMockEvent(sessionId, { type: 'text_delta', data: { text: 'Đang phân tích yêu cầu...' } }), 200);
        setTimeout(() => sendMockEvent(sessionId, { type: 'tool_call', data: { id: 't1', tool: 'market_lookup', arguments: { q: message } } }), 600);
        setTimeout(() => sendMockEvent(sessionId, { type: 'tool_result', data: { id: 't1', result: 'Found market data', preview: 'Price went up', elapsed_ms: 120 } }), 1500);
        setTimeout(() => sendMockEvent(sessionId, { type: 'text_delta', data: { text: '\nĐề xuất: giữ 50% cổ phiếu, 50% trái phiếu.' } }), 1800);
        setTimeout(() => sendMockEvent(sessionId, { type: 'attempt.completed', data: { summary: 'Kết luận mẫu: Cân nhắc giữ tỷ lệ cân bằng.', run_id: `mock-run-${Date.now()}` } }), 2300);
      } catch (err) {
        console.error('Failed to send mock events:', err);
      }
      return Promise.resolve({ session_id: sessionId, status: 'running' });
    }

    try {
      const response = await apiClient.post<SendMessageResponse>(
        `${BASE_URL}/sessions/${sessionId}/messages`,
        { message } as SendMessageRequest
      );
      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },

  /**
   * Lấy SSE stream từ session
   * Trả về EventSource object để client có thể lắng nghe events
   */
  getEventStream: (sessionId: string): EventSource => {
    const token = localStorage.getItem(TOKEN_KEY);
    const url = token
      ? `/api/ai/sessions/${sessionId}/events?token=${encodeURIComponent(token)}`
      : `/api/ai/sessions/${sessionId}/events`;
    return new EventSource(url);
  },

  /**
   * Hủy session
   */
  cancel: async (sessionId: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE_URL}/sessions/${sessionId}`);
    } catch (error) {
      console.error('Failed to cancel session:', error);
      throw error;
    }
  },

  /**
   * Lấy messages/history của session
   */
  getMessages: async (sessionId: string): Promise<ChatSession> => {
    try {
      const response = await apiClient.get<ChatSession>(`${BASE_URL}/sessions/${sessionId}/messages`);
      return response.data;
    } catch (error) {
      console.error('Failed to get session messages:', error);
      throw error;
    }
  },

  /**
   * Phân tích portfolio (endpoint riêng cho analysis screen)
   */
  analyze: async (request: AnalyzeRequest): Promise<AnalyzeResponse> => {
    try {
      const response = await apiClient.post<AnalyzeResponse>(
        `${BASE_URL}/portfolio/analyze`,
        request
      );
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
          metrics: (result.metrics as Record<string, any>) || null,
          user_profile: (result.user_profile as Record<string, any>) || null,
          proposed_portfolio: (result.proposed_portfolio as Record<string, number>) || null,
          validation_result: (result.validation_result as Record<string, any>) || null,
          llm_commentary: result.llm_commentary || null,
          market_news: result.market_news || null,
          visualization_url: result.visualization_url || null,
          source: 'analysis',
        });
      }
      return result;
    } catch (error) {
      console.error('Failed to analyze portfolio:', error);
      throw error;
    }
  },

  /**
   * Lấy lịch sử phân tích
   */
  getHistory: async (): Promise<any[]> => {
    const mockFlag = import.meta.env.VITE_MOCK_API === 'true' || localStorage.getItem('mockBackend') === '1';
    if (mockFlag) {
      return Promise.resolve([
        { run_id: `mock-run-1`, status: 'completed', timestamp: Date.now() - 1000 * 60 * 60 },
        { run_id: `mock-run-2`, status: 'failed', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
      ]);
    }

    try {
      const response = await apiClient.get(`${BASE_URL}/portfolio/history`);
      return response.data;
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  },

  /**
   * Lấy chi tiết report
   */
  getReport: async (runId: string): Promise<AnalyzeResponse> => {
    try {
      const response = await apiClient.get<AnalyzeResponse>(
        `${BASE_URL}/portfolio/report/${runId}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get report:', error);
      throw error;
    }
  },

  /**
   * Kiểm tra health của AI service
   */
  health: async (): Promise<any> => {
    try {
      const response = await apiClient.get(`${BASE_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('Failed to check health:', error);
      throw error;
    }
  },
};
