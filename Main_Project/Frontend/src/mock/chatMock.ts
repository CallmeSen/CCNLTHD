/**
 * chatMock.ts
 *
 * Dev-only mock runner for the chatbot UI. This file contains functions that
 * simulate SSE events for a given sessionId using the existing mockEventBus.
 * It intentionally does NOT modify application source files; call it from the
 * browser console during development.
 *
 * Usage (in browser devtools while the app is running under Vite):
 *
 * 1) Enable mock mode so the app uses mock session/event logic:
 *    localStorage.setItem('mockBackend','1'); location.reload();
 *
 * 2) After a session has been created (or you created one via the UI), run:
 *    import('/src/mock/chatMock.ts').then(m => m.startAutoMock())
 *
 * 3) Or simulate manually for a known sessionId:
 *    import('/src/mock/chatMock.ts').then(m => m.simulateForSession('mock-12345','Analyze my portfolio'))
 *
 * 4) To stop mock mode from persisting:
 *    localStorage.removeItem('mockBackend'); location.reload();
 */

import { sendMockEvent, createMockEventSource, getMockSource } from '../services/mockEventBus';
import { useAgentStore } from '../store/useAgentStore';

// Helper to sleep
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait until a sessionId is available in the persisted agent store.
 * Timeout optional in ms.
 */
export async function waitForSession(timeout = 10000): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const sid = (useAgentStore as any).getState().sessionId as string | null;
    if (sid) return sid;
    await sleep(150);
  }
  return null;
}

/**
 * Simulate a short streaming conversation for a given sessionId.
 * This will emit text_delta, tool_call, tool_result and attempt.completed events.
 */
export async function simulateForSession(sessionId: string, message = 'Test request') {
  // Ensure mock event source exists for this session (useful if SSE connect hasn't created it)
  try {
    // create if not present
    const existing = getMockSource(sessionId);
    if (!existing) createMockEventSource(sessionId);
  } catch (err) {
    console.warn('Could not create mock source:', err);
  }

  // timeline of events
  sendMockEvent(sessionId, { type: 'text_delta', data: { text: 'Đang phân tích yêu cầu...' } });
  await sleep(300);
  sendMockEvent(sessionId, { type: 'tool_call', data: { id: 't1', tool: 'market_lookup', arguments: { q: message } } });
  await sleep(600);
  sendMockEvent(sessionId, { type: 'tool_result', data: { id: 't1', result: 'Found market data', preview: 'Price up 2%', elapsed_ms: 120 } });
  await sleep(400);
  sendMockEvent(sessionId, { type: 'text_delta', data: { text: '\nĐề xuất mẫu: giữ 50% cổ phiếu, 50% trái phiếu.' } });
  await sleep(400);
  sendMockEvent(sessionId, { type: 'attempt.completed', data: { summary: 'Kết luận mẫu: Cân nhắc giữ tỷ lệ cân bằng.', run_id: `mock-run-${Date.now()}` } });
}

/**
 * Start automatic mocking: wait for a session to appear and then simulate a
 * conversation for it. Returns the sessionId used or null on timeout.
 */
export async function startAutoMock(timeout = 15000) {
  // ensure app uses mock backend behavior
  try {
    localStorage.setItem('mockBackend', '1');
  } catch (err) {
    // ignore
  }

  const sid = await waitForSession(timeout);
  if (!sid) {
    console.warn('No session found within timeout; make sure you opened /agent and initiated a session.');
    return null;
  }

  // simulate a conversation shortly after session creation
  setTimeout(() => simulateForSession(sid), 400);
  return sid;
}

export function stopAutoMock() {
  try {
    localStorage.removeItem('mockBackend');
  } catch (err) {}
}

// expose a convenience default for dynamic imports
export default { waitForSession, simulateForSession, startAutoMock, stopAutoMock };
