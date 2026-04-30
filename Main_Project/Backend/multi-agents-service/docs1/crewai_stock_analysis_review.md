# Phân tích hệ thống CrewAI Stock Analysis

**Scope:** module `Main_Project/src/stock_analysis/` (CrewAI crew).
**Lưu ý:** Repo còn nhánh song song là RL Q-Learning orchestrator (mô tả trong `Main_Project/CLAUDE.md`) — **không** nằm trong scope tài liệu này.

---

## 1. Overview hệ thống

- **Mục tiêu:** Sinh "báo cáo phân tích cổ phiếu" dạng văn bản cho một ticker (hiện hardcode `AMZN`) bằng cách cho 3 vai trò LLM lần lượt đọc news + SEC filings rồi tổng hợp khuyến nghị đầu tư.
- **Use case thực tế giải quyết:**
  - Single-stock qualitative research (news + 10-K/10-Q summary).
  - Sinh prose recommendation.
- **Use case KHÔNG giải quyết:** portfolio optimization, risk management, screening, realtime signal, backtest, execution.
- **Loại hệ thống:** **Workflow-based (static pipeline)**, *không phải* agentic.
  - `Process.sequential`, thứ tự task cố định theo khai báo.
  - Không planner, không routing, không điều kiện nhánh, không loop phản hồi.
  - "Multi-agent" theo nghĩa CrewAI (role/goal/tools riêng) nhưng **không autonomous decision-making**.

---

## 2. Tech stack

| Thành phần | Thực trạng | Ghi chú |
|---|---|---|
| Framework | CrewAI `>=0.152.0`, pattern `@CrewBase` + YAML config | Chỉ dùng **Crews**, không dùng **Flows** |
| LLM | Groq `llama-3.1-8b-instant`, `max_tokens=2048` | 8B quá nhỏ cho reasoning tài chính, hallucinate cao |
| Tools | `ScrapeWebsiteTool`, `SEC10KTool`, `SEC10QTool`, `CalculatorTool` | Không có market data API (Yahoo/Alpha Vantage/VNDirect) |
| Database | Không có | Không cache, không state |
| Memory | CrewAI `memory` không bật | Mỗi run cold start |
| RAG / vector DB | Không | Không embeddings, không LangChain |
| Secrets | `.env` + dotenv | Không secret manager |
| Tests | Không | |
| CI/CD | Không áp dụng cho module này | |

**Production-ready?** **Không.**
**Coupling:** Agent ↔ Tool ↔ Ticker bị khóa cứng — `SEC10QTool("AMZN")` khởi tạo ngay trong class definition → đổi ticker ở `main.py` không có tác dụng (**BUG**).

---

## 3. Agent architecture

| Agent | Role | Tools | Tasks được gán |
|---|---|---|---|
| `research_analyst_agent` | Staff Research Analyst | Scrape + SEC10K + SEC10Q | `research` |
| `financial_analyst_agent` | "Best Financial Analyst" | Scrape + Calculator | `financial_analysis`, `filings_analysis` |
| `investment_advisor_agent` | Private Investment Advisor | Scrape + Calculator | `recommend` |

**Vấn đề phân công:**
- `filings_analysis` yêu cầu đọc 10-K/10-Q nhưng được gán cho `financial_analyst` — agent này **không có SEC tool**. Agent sẽ fail hoặc bịa nội dung filings.
- Role/goal/backstory chỉ là flavor text ("Impress your customers"), không có domain rule, constraint, hay output schema.

**Coordination:** `Process.sequential`. Không có hierarchical manager, không có planner agent, không có delegation runtime.

**Data passing:** Shared context của CrewAI (text injection vào prompt kế tiếp). Không có typed artifact, không có shared memory store.

---

## 4. Flow & execution

```
inputs={query, company_stock=AMZN}
  → research (scrape news + SEC)
    → financial_analysis (ratios qua Calculator prompt)
      → filings_analysis (agent không có SEC tool!)
        → recommend (tổng hợp)
          → str output
```

- **Stateful flow?** Không. Không dùng CrewAI Flows.
- **Conditional / loop?** Không.
- **Đây có phải "true agent system"?** **Không — chỉ là orchestrated LLM calls.** 4 prompt theo thứ tự, mỗi prompt có thể gọi tool, output nối vào prompt kế. Không có autonomy, goal-directed planning, hay memory adaptation.

---

## 5. Độ liên quan với quản lý đầu tư

| Phạm vi đầu tư | Bao phủ |
|---|---|
| Qualitative research (news) | ✅ |
| Báo cáo advisory dạng prose | ✅ |
| Fundamental (ratio) | ⚠️ chỉ Calculator qua prompt — dễ sai số |
| Technical analysis | ❌ |
| Portfolio management | ❌ |
| Risk management (VaR, beta, drawdown) | ❌ |
| Realtime data / quote | ❌ |
| Execution / broker integration | ❌ |
| Screening / ranking | ❌ |
| Backtest / attribution | ❌ |
| Compliance / suitability / KYC | ❌ |
| Audit trail cho khuyến nghị | ❌ |

**Mức độ:** **Demo / tutorial-level prototype** (biến thể của example CrewAI stock-analysis phổ biến, thêm free LLM option). Không phải research prototype (không eval), không phải production.

---

## 6. Khả năng tích hợp microservice

**Dạng deploy:** Phải là **service riêng**.
- LLM latency 10–60s sẽ block host service.
- Dependency footprint khác biệt (crewai, sec-api, html2text).
- Cần scale độc lập, isolate failure, rate-limit riêng.

**API interface đề xuất:**
```
POST /v1/analysis/stock          → 202 Accepted + job_id
GET  /v1/analysis/stock/{job_id} → status + result
POST /v1/analysis/stock/stream   → SSE/WebSocket streaming
```

- **Sync vs async:** async bắt buộc. Sync HTTP sẽ timeout ở gateway.
- **Event-driven:** Kafka / Redis Streams với topic `analysis.requested` → worker consume → `analysis.completed` / `analysis.failed`. Consumer group để scale horizontal.

**Vấn đề production cần giải:**
1. **Latency:** P95 vài chục giây → queue + async callback hoặc streaming partial result.
2. **Idempotency:** `idempotency_key = hash(ticker + date + intent)`; cache theo bucket (news 1h, filings 24h).
3. **Observability:** OpenTelemetry span/agent/task, log prompt + output với redaction, track token cost, trace tool calls. CrewAI có callback hook → emit metric từ đó.
4. **Cost control:** budget guard per request, max_tokens cứng, circuit breaker.
5. **Determinism:** lưu seed, prompt version, model version, tool version vào artifact store.
6. **Safety:** disclaimer layer, compliance filter, "not financial advice" wrapper.
7. **Secrets:** Vault/Secret Manager thay `.env`.
8. **Rate limit upstream:** backoff + retry queue cho sec-api, Groq.

---

## 7. Kiến trúc & trade-off

### Ưu điểm
- Config YAML tách biệt code — đúng pattern CrewAI.
- Decorator `@CrewBase` gọn, dễ đọc.
- Tool layer tách riêng, dễ thay.
- Free LLM option → PoC chi phí 0.
- Calculator dùng AST safe eval, không `eval()` trực tiếp.

### Nhược điểm / risks
1. **Không thực sự agentic** — pipeline tuần tự cố định. Nếu chỉ cần pipeline, CrewAI là **over-engineered** so với script 100 dòng gọi LLM.
2. **BUG: hardcoded ticker `AMZN`** trong tool constructor — tham số `{company_stock}` tưởng dynamic nhưng thực tế không phải.
3. **BUG: regex `[^a-zA-Z$0-9\s\n]` strip dấu `.`, `,`, `-`, `%`** → số liệu tài chính trong 10-K/10-Q bị phá → agent đọc sai số.
4. **BUG: tool gán sai agent** — `filings_analysis` gán cho `financial_analyst` (không có SEC tool).
5. Model quá nhỏ (Llama 3.1 8B) cho reasoning tài chính.
6. Không có eval / test / ground truth.
7. Không memory → không học từ lịch sử.
8. Không guard rails cho advisory output (rủi ro compliance).
9. Scrape không có allowlist domain → có đường prompt injection qua nội dung web.
10. Không có bất kỳ test file nào.

### So sánh
- **CrewAI vs single-agent (ReAct) có tool access:** Với use case hiện tại (pipeline cố định), single-agent đơn giản hơn, rẻ hơn, cùng kết quả. CrewAI chỉ thắng khi cần (a) role/tool chuyên biệt rõ rệt, (b) parallel task, (c) hierarchical delegation, (d) vòng lặp nhiều bước — *không điều nào* áp dụng ở đây.
- **CrewAI vs microservice truyền thống:** Microservice thuần deterministic, nhanh, rẻ hơn 100×. LLM thắng ở xử lý unstructured (news, filings). Giải pháp đúng là **hybrid**: numerical core bằng code/API (PE, RSI, screener), LLM chỉ diễn giải. Hệ thống hiện tại đẩy quá nhiều vào LLM (tính ratio qua Calculator prompt-driven).

### Có đáng dùng trong production không?
**KHÔNG.** Đây là tutorial-grade demo. Productionize cần ~70% rework.

---

## 8. Đề xuất cải tiến

### Giữ CrewAI?
Chỉ giữ nếu roadmap thật sự cần multi-agent với delegation/parallel/loop. Nếu use case vẫn là "pipeline 4 bước", **bỏ CrewAI**, viết bằng LangGraph (state machine rõ ràng) hoặc plain orchestrator + LLM SDK.

### Refactor ưu tiên
1. **Sửa bug hardcoded ticker:** `SEC10KTool/SEC10QTool` không gắn ticker; truyền qua runtime từ task context.
2. **Sửa regex SEC filing:** giữ `.,%-$()`. Tốt hơn: dùng parser 10-K có cấu trúc (sec-parser) thay `html2text`.
3. **Sửa tool assignment:** `filings_analysis` phải gán cho agent có SEC tool.
4. **Đổi model:** tối thiểu Llama 3.1 70B / Gemini 2.0 Flash / GPT-4o-mini. 8B không đủ cho số liệu tài chính.
5. **Tách numerical core:** `FundamentalService` dùng yfinance / VNDirect trả JSON ratio → LLM chỉ diễn giải, không tính.
6. **Structured output:** Pydantic schema per task (`ResearchReport`, `Recommendation`) thay vì free-form prose.
7. **Caching:** Redis cache SEC filing TTL 24h, news scrape TTL 1h.
8. **Guard rails:** disclaimer layer, PII filter, prompt-injection sanitizer cho scrape.
9. **Observability:** CrewAI step callback → OTel span; full prompt/response lưu S3 cho audit.
10. **Eval harness:** dataset gold + expected rubric + LLM-as-judge, chạy trong CI.
11. **Đa thị trường:** abstract `MarketDataProvider` interface (SEC US + VNDirect/SSI VN), thống nhất với nhánh RL orchestrator trong repo.

### Kiến trúc production đề xuất
```
API Gateway (FastAPI, async)
  → publish Kafka "analysis.requested"
Worker pool (K8s HPA theo queue depth)
  → CrewAI/LangGraph pipeline
  → Tool layer: MarketData / Filings / News (cached, rate-limited)
  → LLM gateway (LiteLLM, cost guard, provider fallback)
  → Output validator (Pydantic + compliance filter)
  → publish Kafka "analysis.completed"
Result store: Postgres (metadata) + S3 (artifact) + Redis (hot cache)
Observability: OTel → Tempo/Loki/Prometheus, cost dashboard per model
```

### Productionize checklist
- [ ] Async API + job queue
- [ ] Idempotency key + DLQ + retry
- [ ] Circuit breaker + budget guard
- [ ] Audit log toàn bộ prompt/tool/response
- [ ] Eval harness trong CI
- [ ] Compliance review (disclaimer, suitability)
- [ ] Load test LLM P95
- [ ] Secret management
- [ ] Blue/green rollout cho prompt + model version

---

## TL;DR

Module `stock_analysis/` là một **CrewAI tutorial-level pipeline**, không phải một agentic system. Kiến trúc hiện tại có ít nhất **3 bug thực sự** (hardcoded ticker, regex phá số liệu, tool gán sai agent), thiếu toàn bộ tầng market data thực, thiếu eval, thiếu observability, và dùng LLM 8B không đủ cho domain tài chính. **Không production-ready.** Nếu muốn sản phẩm thực, hoặc là refactor theo hướng hybrid (numerical core + LLM explainer) và giữ CrewAI chỉ khi cần multi-agent thật sự, hoặc là thay bằng LangGraph state machine cho pipeline rõ ràng hơn.
