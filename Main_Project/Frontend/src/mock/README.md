# Chat Mock — Developer Guide

This folder contains dev-only helpers to simulate the chatbot multi-agent pipeline
without requiring the AI backend. Use these tools from the browser devtools while
running the frontend in development (Vite).

Files
- `chatMock.ts` — convenience runner. Functions:
  - `startAutoMock(timeout?)` — sets `localStorage.mockBackend=1`, waits for a session to
    appear in the frontend store, then simulates a short conversation for that session.
  - `simulateForSession(sessionId, message?)` — simulate a conversation for a given session id.
  - `waitForSession(timeout?)` — utility to wait for sessionId in the store.
  - `stopAutoMock()` — remove `mockBackend` flag from localStorage.

- `scenarios.ts` — predefined scenarios you can pick manually:
  - `successScenario(sessionId, message?)`
  - `failureScenario(sessionId, message?)`
  - `multiToolScenario(sessionId, message?)`

How to use
1. Start the frontend dev server (Vite):

```bash
cd Main_Project/Frontend
npm run dev
```

2. Enable mock mode (optional, useful when backend is down):

Open the browser devtools Console and run:

```js
localStorage.setItem('mockBackend','1');
location.reload();
```

When `mockBackend` is set the app will use the mock session/event flow (no backend required).

3. Create or open a chat session

Open `/agent` and trigger the UI to create a session (send a user message or let the page auto-create).

4. Run a mock scenario

Dynamic import and run a scenario from Console. Examples:

```js
// wait for session and auto simulate
import('/src/mock/chatMock.ts').then(m => m.startAutoMock());

// or run a predefined scenario for a specific session id
import('/src/mock/scenarios.ts').then(s => s.successScenario('mock-12345'));

// run a failure scenario
import('/src/mock/scenarios.ts').then(s => s.failureScenario('mock-12345'));

// run multi-tool scenario
import('/src/mock/scenarios.ts').then(s => s.multiToolScenario('mock-12345'));
```

Tips
- If the app already created a `sessionId` in the store, you can retrieve it via the console:

```js
// in console (if zustand store is accessible):
import('/src/store/useAgentStore.ts').then(m => console.log((m as any).getState().sessionId));
```

- `chatMock.startAutoMock()` will set `localStorage.mockBackend` for you and simulate automatically.
- To stop using mock mode, remove the flag and reload:

```js
localStorage.removeItem('mockBackend');
location.reload();
```

Safety and scope
- All mock code is intended for local development only. Do NOT enable `mockBackend` in production.
- Mock modules live under `src/mock/` and do not change production logic; they call the same store and
  the mock event bus used by the app when in mock mode.

If you want a small dev UI to pick scenarios directly from the app, I can add a hidden toggle — tell me
if you'd like that and I will add it as a non-production-only component.
