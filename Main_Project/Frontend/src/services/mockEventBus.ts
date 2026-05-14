type MessageHandler = (e: MessageEvent) => void;

interface MockSource {
  onopen: (() => void) | null;
  onmessage: MessageHandler | null;
  onerror: ((err?: any) => void) | null;
  close: () => void;
}

const sources: Record<string, MockSource> = {};

export function createMockEventSource(sessionId: string): MockSource {
  const src: MockSource = {
    onopen: null,
    onmessage: null,
    onerror: null,
    close() {
      delete sources[sessionId];
    },
  };

  sources[sessionId] = src;

  // fire open asynchronously
  setTimeout(() => src.onopen && src.onopen(), 50);

  return src;
}

export function getMockSource(sessionId: string): MockSource | undefined {
  return sources[sessionId];
}

export function sendMockEvent(sessionId: string, payload: any) {
  const src = sources[sessionId];
  if (!src) return;
  try {
    const event = { data: JSON.stringify(payload) } as MessageEvent;
    src.onmessage && src.onmessage(event);
  } catch (err) {
    src.onerror && src.onerror(err);
  }
}

export function closeMockSource(sessionId: string) {
  const src = sources[sessionId];
  if (src) src.close();
}
