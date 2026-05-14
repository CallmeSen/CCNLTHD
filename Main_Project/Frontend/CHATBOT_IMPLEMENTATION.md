# Chatbot Implementation Specification

Tài liệu này mô tả cách triển khai chatbot multi-agent hiện có trong hệ thống, theo hướng đủ chi tiết để có thể tái sử dụng trên một giao diện khác mà vẫn giữ nguyên toàn bộ chức năng.

## 1. Mục tiêu của chatbot

Chatbot là giao diện hội thoại realtime cho hệ thống tư vấn tài chính đa tác tử. Người dùng nhập câu hỏi hoặc yêu cầu đầu tư, hệ thống sẽ:

1. Tạo hoặc sử dụng lại một session hội thoại.
2. Gửi nội dung yêu cầu đến backend multi-agent.
3. Mở kết nối SSE để nhận phản hồi theo thời gian thực.
4. Hiển thị tiến trình xử lý của từng agent/tool.
5. Trả về câu trả lời cuối cùng, báo cáo và liên kết đến màn hình report khi cần.

Mục tiêu triển khai lại trên UI khác là giữ nguyên các hành vi này, không chỉ hiển thị câu trả lời cuối cùng.

## 2. Kiến trúc tổng quan

### 2.1 Luồng cấp cao

Luồng hoạt động chuẩn của chatbot:

1. Người dùng mở màn hình chatbot tại `/agent`.
2. Frontend lấy session hiện tại từ store; nếu chưa có thì tạo session mới.
3. Frontend gửi message đến backend qua API `POST /sessions/{session_id}/messages`.
4. Backend khởi chạy workflow multi-agent và phát event qua SSE tại `GET /sessions/{session_id}/events`.
5. Frontend lắng nghe event, cập nhật trạng thái streaming, tool calls, kết quả tool, và câu trả lời cuối.
6. Khi workflow kết thúc, frontend lưu hội thoại vào danh sách message nội bộ và cho phép người dùng xuất file Markdown.

### 2.2 Thành phần chính

- Frontend chatbot chính: `src/pages/Agent.tsx`
- Store trạng thái hội thoại: `src/stores/useAgentStore.ts`
- Lớp xử lý SSE: `src/hooks/useSSE.ts`
- Các kiểu dữ liệu: `src/types/index.ts`
- API client: `src/services/api.ts`
- Các component con:
  - `src/components/chat/WelcomeScreen.tsx`
  - `src/components/chat/MessageBubble.tsx`
  - `src/components/chat/ThinkingTimeline.tsx`
  - `src/components/chat/ConversationTimeline.tsx`

Backend liên quan:

- API gateway: `Backend/api-gateway/src/main/resources/application.yml`
- Multi-agent service: `Backend/Multi-agents-service/src/fin_agents/api/sessions.py`
- Health endpoint: `Backend/Multi-agents-service/src/fin_agents/api/main.py`

## 3. Kết nối backend

### 3.1 Base URL

Frontend lấy base URL từ biến môi trường `VITE_API_URL`. Nếu không có, mặc định là `http://localhost:8000`.

### 3.2 Các endpoint bắt buộc

#### Chat session

- `POST /sessions`
  - Tạo session mới.
  - Frontend hiện tại gửi body `{ prompt: string }` để khởi tạo session, mặc dù backend chỉ cần trả về `session_id`.
  - Kết quả: `{ session_id: string }`.

- `POST /sessions/{session_id}/messages`
  - Gửi message của người dùng vào session.
  - Body: `{ message: string }`.
  - Backend bắt đầu workflow async cho session đó.
  - Kết quả: `{ session_id: string; status: string }`.

- `GET /sessions/{session_id}/events`
  - Mở SSE stream để nhận event realtime.
  - Đây là endpoint cốt lõi để chatbot có tính tương tác.

- `DELETE /sessions/{session_id}`
  - Hủy session và dọn dẹp lịch sử/buffer SSE.

#### Phân tích báo cáo liên quan

- `POST /portfolio/analyze`
- `GET /portfolio/history`
- `GET /portfolio/report/{runId}`
- `GET /health`

### 3.3 Gateway routing

API gateway cấu hình route `Path=/api/ai/**` tới service `lb://ai-intelligence-service`. Nếu triển khai qua gateway, frontend phải trỏ vào route này thay vì gọi trực tiếp service Python.

## 4. Hợp đồng dữ liệu

### 4.1 Dữ liệu request/response

Trong frontend, các kiểu dữ liệu chính gồm:

- `AnalyzeRequest`
  - `request: string`
  - `lang?: "en" | "vi"`

- `AnalyzeResponse`
  - `run_id`
  - `status`
  - `final_report`
  - `report`
  - `user_profile`
  - `proposed_portfolio`
  - `metrics`
  - `validation_result`
  - `llm_commentary`
  - `market_news`
  - `visualization_url`
  - `lang`
  - `error`

### 4.2 Agent message model

Chatbot lưu từng phần hội thoại bằng `AgentMessage` với các kiểu:

- `user`
- `answer`
- `error`
- `tool_call`
- `tool_result`
- `run_complete`
- `thinking`
- `compact`

Mỗi message có thể có thêm:

- `tool`
- `args`
- `status`
- `elapsed_ms`
- `runId`
- `metrics`
- `equityCurve`
- `shadowId`
- `timestamp`

### 4.3 Tool call model

`ToolCallEntry` mô tả từng bước xử lý nội bộ của agent:

- `id`
- `tool`
- `arguments`
- `status: pending | running | done | error`
- `preview`
- `elapsed_ms`
- `timestamp`

### 4.4 SSE event handlers

Frontend xử lý các event sau:

- `text_delta`
- `tool_call`
- `tool_result`
- `thinking_done`
- `compact`
- `attempt.completed`
- `attempt.failed`
- `heartbeat`
- `reconnect`

Mỗi event được backend bọc dưới dạng `event: "message"` để `EventSource.onmessage` có thể nhận được. Trường `event` thật sẽ nằm bên trong payload JSON.

## 5. Luồng xử lý chi tiết

### 5.1 Tạo session

Khi người dùng gửi prompt đầu tiên:

1. Frontend thêm message của user vào store.
2. Nếu chưa có `sessionId`, frontend gọi `sessionApi.create(prompt.slice(0, 50))`.
3. Backend trả về `session_id`.
4. Frontend lưu `sessionId` vào store và cập nhật query param `?session=...`.
5. Frontend mở SSE tới `/sessions/{sessionId}/events`.

### 5.2 Gửi message

Frontend gọi `sessionApi.send(sessionId, prompt)` để backend bắt đầu chạy workflow.

### 5.3 Nhận stream realtime

Khi SSE hoạt động, frontend cập nhật các trạng thái sau:

- `text_delta`: nối thêm văn bản đang sinh ra vào `streamingText`.
- `tool_call`: tạo một tool đang chạy, hiển thị tên tool và arguments.
- `tool_result`: cập nhật tool sang `done` hoặc `error`, lưu preview và thời gian chạy.
- `attempt.completed`: chốt nội dung cuối cùng, chuyển tool calls thành message lịch sử, xóa streaming state.
- `attempt.failed`: xóa streaming, thêm message lỗi, đưa status về `idle`.

### 5.4 Hủy chạy

Khi người dùng bấm nút stop:

1. Frontend gọi `sessionApi.cancel(sessionId)`.
2. Xóa `streamingText`.
3. Xóa danh sách tool calls đang hiển thị.
4. Đưa trạng thái về `idle`.

### 5.5 Xuất hội thoại

Người dùng có thể xuất toàn bộ lịch sử chat ra file Markdown. File xuất có nội dung dạng:

- tiêu đề `# Chat Export`
- thời gian xuất
- các section `User`, `Assistant`, `Error`
- thông tin tool call khi có

## 6. Giao diện chatbot

### 6.1 Màn hình chính `/agent`

Đây là màn hình chatbot realtime chính. Layout bao gồm:

- Header với tiêu đề `Agent Chat`.
- Nút export hội thoại.
- Vùng hiển thị messages.
- Vùng hiển thị streaming text và timeline xử lý của agent.
- Ô nhập prompt ở cuối trang.
- Nút stop khi đang chạy.

### 6.2 Welcome screen

Khi chưa có hội thoại, màn hình hiển thị:

- logo/biểu tượng chatbot
- mô tả ngắn
- các prompt mẫu để người dùng bấm chọn nhanh
- liên kết nhanh sang `Analysis` và `History`

### 6.3 Message bubble

Mỗi loại message được render khác nhau:

- `user`: bong bóng bên phải
- `answer`: bong bóng assistant bên trái
- `error`: khối lỗi màu cảnh báo
- `tool_call`: khối hiển thị tool đang chạy
- `tool_result`: khối hiển thị output và elapsed time
- `compact`: trạng thái compacting context

### 6.4 Thinking timeline

Khi chatbot đang thực thi nhiều bước, `ThinkingTimeline` hiển thị danh sách tool calls theo dạng step-by-step. UI này phải giữ nguyên nếu tái triển khai, vì nó là phần thể hiện bản chất multi-agent của sản phẩm.

### 6.5 Conversation timeline

`ConversationTimeline` hiển thị các dấu mốc cho các lượt user message, hỗ trợ nhảy nhanh giữa các đoạn hội thoại trong vùng chat dài.

## 7. Các trạng thái UI bắt buộc

Frontend cần có tối thiểu các trạng thái sau:

- `idle`: không có request đang chạy.
- `streaming`: đang nhận dữ liệu realtime.
- `error`: có lỗi khi gửi request hoặc nhận stream.
- `sessionLoading`: đang load phiên trò chuyện.
- `sseStatus: disconnected | connecting | connected | reconnecting`.

Ngoài ra còn có:

- `streamingText`: phần text đang được sinh dở.
- `toolCalls`: danh sách tool đang chạy.
- `showScrollBtn`: nút scroll xuống cuối khi người dùng đã cuộn lên trên.

## 8. Các màn hình liên quan

### 8.1 `/analysis`

Màn hình phân tích portfolio theo dạng form, không phải chat realtime. Nó dùng cùng backend pipeline nhưng cho phép nhập yêu cầu phân tích và đi thẳng tới report.

### 8.2 `/history`

Danh sách lịch sử các phân tích đã chạy, có search và thống kê cơ bản.

### 8.3 `/report/:runId`

Màn hình xem báo cáo hoàn chỉnh. Có:

- portfolio allocation
- metrics
- compliance result
- market news
- commentary
- visualization embed nếu có

### 8.4 `/runs/:runId`

Màn hình xem chi tiết một run, tập trung vào dữ liệu báo cáo và các chỉ số liên quan.

### 8.5 Navigation

`Layout.tsx` cho thấy chatbot là một phần của hệ thống điều hướng lớn hơn với các mục `Agent`, `Analysis`, `History`, `Runs`, `Compare`, `Correlation`, `Settings`.

## 9. Hành vi quan trọng cần giữ nguyên khi tái triển khai trên UI khác

Nếu dùng chatbot này trên giao diện khác, cần giữ nguyên các điểm sau:

1. Phải tạo và lưu `sessionId`.
2. Phải gửi message trước, sau đó mở SSE để nhận stream.
3. Phải map đúng các event backend sang trạng thái UI.
4. Phải hiển thị tối thiểu user message, answer, error, tool_call, tool_result.
5. Phải hỗ trợ cancel session.
6. Phải hỗ trợ export hội thoại.
7. Phải xử lý reconnect SSE.
8. Phải cho phép người dùng xem lịch sử và đi sang report từ `runId`.
9. Phải giữ được trải nghiệm realtime: text delta, tiến trình tool, và câu trả lời cuối.

## 10. Checklist triển khai trên giao diện khác

- Kết nối tới base URL của backend.
- Tạo session trước khi gửi tin nhắn đầu tiên.
- Gửi `POST /sessions/{session_id}/messages` với body `{ message }`.
- Mở `GET /sessions/{session_id}/events` bằng `EventSource`.
- Parse event JSON và phân phối theo loại event.
- Lưu state cuộc hội thoại trong store riêng.
- Render riêng cho `user`, `answer`, `error`, `tool_call`, `tool_result`.
- Có nút stop/cancel.
- Có nút export Markdown.
- Có cơ chế scroll-to-bottom thông minh.
- Có màn hình history/report để truy cập kết quả đã tạo.

## 11. Ghi chú triển khai thực tế

- Frontend hiện đang dùng `EventSource.onmessage`, nên backend phải tiếp tục bọc event type bên trong JSON payload.
- Khi backend phát `attempt.completed`, frontend dùng trường `summary` để chốt câu trả lời cuối cùng.
- Khi backend phát `attempt.failed`, frontend phải hiển thị lỗi người dùng có thể đọc được.
- Query param `?session=` đã có mặt, nên có thể mở rộng để khôi phục session về sau.
- Flow hiện tại ưu tiên trải nghiệm realtime, do đó không nên chỉ lấy một response cuối cùng rồi render tĩnh.

## 12. Kết luận

Chatbot này không chỉ là một ô chat đơn giản. Nó là giao diện realtime cho một pipeline multi-agent có session, SSE streaming, tool timeline, cancel, export, lịch sử và report. Nếu triển khai lại ở giao diện khác, cần coi tài liệu này như hợp đồng chức năng tối thiểu để không làm mất bất kỳ khả năng nào của hệ thống hiện tại.