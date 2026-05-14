/**
 * Predefined mock scenarios for chatbot testing.
 *
 * Each scenario exposes a function that accepts a `sessionId` and optional
 * message text, then emits a realistic sequence of SSE events using the
 * mockEventBus.
 *
 * Usage (browser console while app running in dev):
 *
 * import('/src/mock/scenarios.ts').then(s => s.successScenario('mock-123'))
 * import('/src/mock/scenarios.ts').then(s => s.failureScenario('mock-123'))
 * import('/src/mock/scenarios.ts').then(s => s.multiToolScenario('mock-123'))
 */

import { createMockEventSource, getMockSource, sendMockEvent } from '../services/mockEventBus';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ensureSource(sessionId: string) {
  try {
    if (!getMockSource(sessionId)) createMockEventSource(sessionId);
  } catch (err) {
    console.warn('ensureSource:', err);
  }
}

export async function successScenario(sessionId: string, message = 'Please analyze my portfolio') {
  await ensureSource(sessionId);
  sendMockEvent(sessionId, { type: 'text_delta', data: { text: 'Nhận yêu cầu: ' + message } });
  await sleep(200);
  sendMockEvent(sessionId, { type: 'tool_call', data: { id: 't-market', tool: 'market_lookup', arguments: { q: message } } });
  await sleep(500);
  sendMockEvent(sessionId, { type: 'tool_result', data: { id: 't-market', result: { price: '100.5' }, preview: 'Price 100.5', elapsed_ms: 150 } });
  await sleep(300);
  sendMockEvent(sessionId, { type: 'tool_call', data: { id: 't-risk', tool: 'risk_assessment', arguments: {} } });
  await sleep(600);
  sendMockEvent(sessionId, { type: 'tool_result', data: { id: 't-risk', result: { risk: 'moderate' }, preview: 'Risk: moderate', elapsed_ms: 320 } });
  await sleep(200);
  sendMockEvent(sessionId, { type: 'text_delta', data: { text: '\nKết quả sơ bộ: đề xuất phân bổ 60/40.' } });
  await sleep(300);
  sendMockEvent(sessionId, { type: 'attempt.completed', data: { summary: 'Hoàn tất phân tích: đề xuất 60% cổ phiếu, 40% trái phiếu.', run_id: `mock-run-${Date.now()}` } });
}

export async function failureScenario(sessionId: string, message = 'Analyze portfolio') {
  await ensureSource(sessionId);
  sendMockEvent(sessionId, { type: 'text_delta', data: { text: 'Bắt đầu xử lý...' } });
  await sleep(400);
  sendMockEvent(sessionId, { type: 'tool_call', data: { id: 't-lookup', tool: 'market_lookup' } });
  await sleep(500);
  // Simulate tool error
  sendMockEvent(sessionId, { type: 'tool_result', data: { id: 't-lookup', error: 'Market data service timeout' } });
  await sleep(200);
  sendMockEvent(sessionId, { type: 'attempt.failed', data: { error: 'Không thể lấy dữ liệu thị trường. Vui lòng thử lại sau.' } });
}

export async function multiToolScenario(sessionId: string, message = 'Run deep analysis') {
  await ensureSource(sessionId);
  sendMockEvent(sessionId, { type: 'text_delta', data: { text: 'Khởi chạy pipeline phân tích nâng cao...' } });
  await sleep(200);

  const tools = [
    { id: 't1', tool: 'market_lookup' },
    { id: 't2', tool: 'fundamental_scan' },
    { id: 't3', tool: 'portfolio_optimizer' },
  ];

  for (const t of tools) {
    sendMockEvent(sessionId, { type: 'tool_call', data: { id: t.id, tool: t.tool } });
    await sleep(350);
    sendMockEvent(sessionId, { type: 'tool_result', data: { id: t.id, result: `${t.tool} OK`, preview: `${t.tool} preview`, elapsed_ms: Math.floor(Math.random() * 300) + 100 } });
    await sleep(200);
  }

  sendMockEvent(sessionId, { type: 'text_delta', data: { text: '\nPipeline hoàn tất. Tổng hợp báo cáo...' } });
  await sleep(300);
  sendMockEvent(sessionId, { type: 'attempt.completed', data: { summary: 'Báo cáo tổng hợp (multi-tool) hoàn tất.', run_id: `mock-run-${Date.now()}` } });
}

export default { successScenario, failureScenario, multiToolScenario };
