# Chatbot UI Implementation (Agent Chat)

Tài liệu này mô tả chi tiết cách triển khai giao diện chatbot (Agent Chat) trong Frontend, các component chính, mô hình dữ liệu, và các kết nối tới backend (SSE / REST). Mục tiêu: AI hoặc kỹ sư khác có thể đọc và hiểu chi tiết luồng dữ liệu, sự kiện, và nơi để thay đổi / mở rộng.

---

**Vị trí file tham chiếu**

- Main page: [src/pages/Agent.tsx](src/pages/Agent.tsx)
- Components: [src/components/chat/WelcomeScreen.tsx](src/components/chat/WelcomeScreen.tsx), [src/components/chat/MessageBubble.tsx](src/components/chat/MessageBubble.tsx), [src/components/chat/ThinkingTimeline.tsx](src/components/chat/ThinkingTimeline.tsx), [src/components/chat/ConversationTimeline.tsx](src/components/chat/ConversationTimeline.tsx), [src/components/chat/ToolCallCard.tsx](src/components/chat/ToolCallCard.tsx), [src/components/chat/MetricsCard.tsx](src/components/chat/MetricsCard.tsx)
- Hooks / services / store: [src/hooks/useSSE.ts](src/hooks/useSSE.ts), [src/services/api.ts](src/services/api.ts), [src/stores/useAgentStore.ts](src/stores/useAgentStore.ts), [src/types/index.ts](src/types/index.ts)

---

## 1. Tổng quan luồng hoạt động

- Người dùng nhập prompt trên `Agent` page và gửi (Enter hoặc nút Send).
- Nếu chưa có `sessionId`, frontend gọi REST `POST /sessions` để tạo phiên mới.
- Frontend kết nối tới stream SSE tại `/sessions/{sessionId}/events` (EventSource).
- Khi gửi message, frontend POST `/sessions/{sessionId}/messages` — backend trả về (sau khi xử lý) loạt sự kiện SSE:
  - `text_delta`: phần text đang streaming (delta) — frontend gộp vào `streamingText`.
  - `tool_call`: một bước agent gọi tool (được thêm vào `toolCalls`).
  - `tool_result`: kết quả của tool (cập nhật toolCalls thành done/error, hiển thị preview).
  - `attempt.completed`: thông báo attempt hoàn thành; frontend gọi `finishStreaming` để chuyển đổi các toolCalls thành `tool_call` / `tool_result` messages cuối cùng và thêm message `answer` với nội dung cuối cùng.
  - `attempt.failed`: đánh dấu lỗi, dọn streaming.

Luồng chính (tóm tắt): User -> sessionApi.create (nếu cần) -> sessionApi.send -> SSE events -> useSSE xử lý -> useAgentStore cập nhật -> UI render.

---

## 2. Màn hình liên quan (screens)

- Agent chat page — `src/pages/Agent.tsx`
  - Header: trạng thái streaming (Live), export chat.
  - Message list: render nhóm tin nhắn, timeline, streaming area.
  - Input: textarea (Enter gửi, Shift+Enter newline), nút gửi / stop.

- Welcome screen — `src/components/chat/WelcomeScreen.tsx`
  - Hiển thị mẫu prompt, links tới Analysis / History.
  - Gọi `onSelectPrompt(prompt)` khi người dùng chọn mẫu.

- Export/History screens liên quan: `History`, `Report` pages (tham khảo router). Các liên kết export trong `Agent.tsx` sẽ tạo file markdown export.

---

## 3. Component chính — trách nhiệm và props

- `Agent` (page) — [src/pages/Agent.tsx](src/pages/Agent.tsx)
  - State local: `input`, refs cho list / input, `showScrollBtn`.
  - Kết nối store/hook:
    - `useAgentStore` để lấy `messages`, `streamingText`, `status`, `sessionId`, `toolCalls`, `sessionLoading`.
    - `useSSE` cung cấp `connect`, `disconnect`, `sendMessage` (hook wrapper).
  - Chức năng chính:
    - `runPrompt(prompt)` — tạo session nếu cần (`sessionApi.create`), gọi `setupSSE(sessionId)`, rồi `sessionApi.send(sessionId, prompt)`.
    - `setupSSE` — gọi `connect(sseUrl, handlers)` và đăng ký các handler (text_delta, tool_call, tool_result, attempt.completed, attempt.failed). Handler cập nhật store (appendDelta, addToolCall, updateToolCall, finishStreaming, v.v.).
    - Scroll behaviour: `isNearBottom()` và `scrollToBottom()` để quyết định auto-scroll hoặc hiện nút scroll-to-bottom.
    - `handleCancel()` gửi `sessionApi.cancel(sessionId)` để dừng.
    - `handleExport()` xuất toàn bộ `messages` thành Markdown.

- `WelcomeScreen` — [src/components/chat/WelcomeScreen.tsx](src/components/chat/WelcomeScreen.tsx)
  - Props: `onSelectPrompt: (p: string) => void`.
  - Hiển thị sample prompts và feature cards.

- `MessageBubble` — [src/components/chat/MessageBubble.tsx](src/components/chat/MessageBubble.tsx)
  - Props: `message: AgentMessage`, `isStreaming?: boolean`.
  - Render theo `message.type`: `user`, `answer` (assistant), `tool_call`, `tool_result`, `compact`, `error`.
  - Sử dụng `react-markdown` + `remark-gfm` để render markdown, code blocks, bảng, link.

- `ThinkingTimeline` — [src/components/chat/ThinkingTimeline.tsx](src/components/chat/ThinkingTimeline.tsx)
  - Props: `toolCalls: ToolCallEntry[]`.
  - Hiển thị danh sách các bước tool call; mỗi `ToolStep` có trạng thái pending/running/done/error, có thể expand để xem `arguments` và `preview`.

- `ConversationTimeline` — [src/components/chat/ConversationTimeline.tsx](src/components/chat/ConversationTimeline.tsx)
  - Props: `messages`, `containerRef`.
  - Nếu có >= 2 user messages, hiển thị series dot timeline để scroll tới từng user message.

- `ToolCallCard` / `MetricCard` — dùng để hiển thị tool calls và metrics (xem mã để các chi tiết UI nhỏ).

---

## 4. State management (Zustand store)

- File: [src/stores/useAgentStore.ts](src/stores/useAgentStore.ts)
- Trạng thái chính:
  - `messages: AgentMessage[]` — danh sách các message đã hoàn tất (user, tool_call, tool_result, answer, error, ...)
  - `streamingText: string` — text đang streaming (partial), hiển thị như một message tạm thời với id `streaming`.
  - `toolCalls: ToolCallEntry[]` — danh sách các bước tool hiện đang chạy/đã chạy (pending/running/done/error).
  - `status: "idle" | "streaming" | "error"` — trạng thái gửi/nhận.
  - `sseStatus` — trạng thái kết nối EventSource.
  - `sessionId` và `sessionLoading`.

- Các action chính (cập nhật store): `addMessage`, `appendDelta`, `addToolCall`, `updateToolCall`, `finishStreaming` (chuyển toolCalls -> messages + tạo message answer), `clearStreaming`, `clearToolCalls`.

---

## 5. Hooks & Backend kết nối

- `useSSE` — [src/hooks/useSSE.ts](src/hooks/useSSE.ts)
  - `connect(url, handlers)`: tạo `EventSource(url)`, set `onmessage` để parse JSON payloads. Lưu ý: backend gói `event` type trong payload (browser `EventSource` chỉ natively dispatches `message`), do đó `useSSE` parse `raw.event` từ `ev.data`.
  - `onmessage` xử lý các event: `text_delta`, `tool_call`, `tool_result`, `thinking_done`, `compact`, `attempt.completed`, `attempt.failed`, `heartbeat`, `reconnect`.
  - Khi `tool_result` đến, hook delay 500ms trước khi gọi `updateToolCall` để spinner/chuyển trạng thái mượt hơn.
  - `sendMessage(sessionId, text, handlers)`: POST `/sessions/{sessionId}/messages` rồi gọi `connect` trở lại để mở lại SSE cho phiên.
  - `disconnect()` đóng EventSource và abort controller.

- REST API helpers — [src/services/api.ts](src/services/api.ts)
  - `POST /sessions` -> create session (body { prompt }) => response { session_id }
  - `POST /sessions/{sessionId}/messages` -> gửi message
  - `GET /sessions/{sessionId}/messages` -> tải lịch sử messages
  - `DELETE /sessions/{sessionId}` -> cancel session
  - `sseUrl(sessionId)` helper trả về `${BASE_URL}/sessions/${sessionId}/events`.
  - `BASE_URL` được lấy từ `import.meta.env.VITE_API_URL` (mặc định `http://localhost:8000`).

Ví dụ payload SSE (đơn giản):

```json
{ "event": "text_delta", "delta": "partial text..." }
{ "event": "tool_call", "tool": "MarketFetch", "arguments": { "symbol": "AAPL" } }
{ "event": "tool_result", "tool": "MarketFetch", "status": "ok", "preview": "price: 150", "elapsed_ms": 230 }
{ "event": "attempt.completed", "run_dir": "runs/2026-05-01/abc", "summary": "Recommended rebalance" }
```

---

## 6. Dạng dữ liệu (types)

- `ToolCallEntry`:

```ts
interface ToolCallEntry {
  id: string;
  tool: string;
  arguments?: Record<string, unknown>;
  status: "pending" | "running" | "done" | "error";
  preview?: string;
  elapsed_ms?: number;
  timestamp?: number;
}
```

- `AgentMessage` (trong `src/types/index.ts`): có `type` là `user|answer|error|tool_call|tool_result|run_complete|thinking|compact`, `content`, `timestamp`, optional `tool`, `status`, `elapsed_ms`, `runId`.

---

## 7. UI behavior & UX details

- Streaming text: `streamingText` hiển thị bằng một `MessageBubble` tạm thời với `id: "streaming"` và prop `isStreaming` để show pulse.
- Thinking timeline: `ThinkingTimeline` hiển thị ngay khi có `toolCalls` (even trước khi text stream bắt đầu) — giúp người dùng thấy tiến trình agent.
- Auto-scroll: chỉ tự cuộn khi người dùng đang gần cuối; nếu không thì hiện nút scroll-to-bottom.
- Cancel: gọi `sessionApi.cancel(sessionId)` để yêu cầu backend hủy; frontend sẽ `clearStreaming()` và set `status` về `idle`.
- Export: tạo markdown export bằng cách duyệt `messages` và map thành section.

---

## 8. Debug / Logging

- Trong một số component (ví dụ `ThinkingTimeline`, `Agent.tsx`, `useSSE.ts`) có các fetch tới `http://127.0.0.1:7544/ingest/...` — đây là debug/telemetry local ingestion (dev). Khi triển khai production, có thể loại bỏ các fetch này hoặc bật/tắt qua biến môi trường.

---

## 9. Mở rộng & điểm cần lưu ý cho AI / developer

- Nếu muốn thêm tính năng multi-session restore: `Agent.tsx` đã đọc `session` query param (`useSearchParams`) — hiện chưa dùng để tự động restore, có thể gọi `sessionApi.messages(session)` và `useAgentStore.switchSession(session, cached)`.
- Xử lý xác thực: `api` sử dụng axios baseURL; nếu cần JWT, thêm interceptor request để inject header `Authorization`.
- Nếu backend chuyển sang Server-Sent Events với custom event types (non-"message"), cần đảm bảo dùng `addEventListener("tool_call", ...)` server side event name; hiện implementation parse `ev.data` JSON payload and inspect `raw.event` because default EventSource may not forward custom event types in some environments.
- Lưu ý race conditions: `useSSE` khi `tool_result` delay 500ms để animation mượt; nếu cần thay đổi thời gian, chỉnh `_doneTimerRef` logic.

---

## 10. File liên quan — quick links

- [src/pages/Agent.tsx](src/pages/Agent.tsx)
- [src/components/chat/WelcomeScreen.tsx](src/components/chat/WelcomeScreen.tsx)
- [src/components/chat/MessageBubble.tsx](src/components/chat/MessageBubble.tsx)
- [src/components/chat/ThinkingTimeline.tsx](src/components/chat/ThinkingTimeline.tsx)
- [src/components/chat/ConversationTimeline.tsx](src/components/chat/ConversationTimeline.tsx)
- [src/hooks/useSSE.ts](src/hooks/useSSE.ts)
- [src/services/api.ts](src/services/api.ts)
- [src/stores/useAgentStore.ts](src/stores/useAgentStore.ts)
- [src/types/index.ts](src/types/index.ts)

---

Nếu bạn muốn, tôi có thể:

- Thêm sơ đồ luồng (Mermaid) vào file này.
- Viết tests nhỏ mock SSE để CI kiểm thử tính năng streaming.
- Tạo checklist thay đổi khi porting backend (event names / payloads).

Ghi chú: file này được tạo tự động từ mã nguồn hiện có; nếu bạn muốn tài liệu chi tiết hơn ở từng dòng, tôi có thể chèn ví dụ payload thực tế từ log SSE hoặc trích xuất mẫu event từ backend.
