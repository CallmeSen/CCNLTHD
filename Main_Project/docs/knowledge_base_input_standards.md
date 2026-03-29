# Chuẩn hóa Knowledge Base Input cho Resource người dùng — v1.0

> Tài liệu này định nghĩa các chuẩn để xử lý resource đầu vào từ người dùng
> (file PDF, CSV, XLSX, v.v.) trước khi đưa vào RL Orchestrator. Mỗi resource
> được phân loại thành một Knowledge Base (KB) type, và mỗi KB type ảnh hưởng
> trực tiếp đến state encoding và routing decision.
>
> **Vấn đề cốt lõi:** User input = query + resource(s). Nếu chỉ routing dựa trên
> query text (như v2.1 hiện tại), orchestrator bỏ lỡ 50% thông tin. Resource
> chứa "knowledge base ngầm" — và đôi khi còn chứa "prompt ngầm" (highlight,
> ghi chú, instruction) mâu thuẫn với query.

---

## 1. Tại sao cần chuẩn hóa resource input?

### Vấn đề hiện tại (v2.1 dataset)

Dataset v2.1 có 2 cột resource: `has_attachment` (bool) và `attachment_type` (pdf/csv/xlsx).
Đây chỉ là **metadata bề mặt** — orchestrator biết "có file PDF" nhưng không biết:

- PDF đó chứa gì? (Báo cáo tài chính? Research report? Slide thuyết trình?)
- PDF đó thuộc knowledge base nào? (Fundamental? Technical? Screening?)
- PDF đó có chứa instruction/highlight thay đổi intent? ("Xem phần RSI trang 5")
- Nếu có nhiều file, chúng thuộc cùng KB hay khác KB?

### 4 vấn đề phát sinh

| # | Vấn đề | Ví dụ | Hệ quả nếu không xử lý |
|---|--------|-------|------------------------|
| 1 | Resource-Query conflict | Upload báo cáo TC + hỏi "RSI bao nhiêu?" | Route sai agent |
| 2 | Embedded prompt injection | PDF có ghi chú "Focus vào MACD" | Intent bị override ngầm |
| 3 | Multi-Knowledge-Base | Upload PDF + CSV + XLSX cùng lúc | Không biết ưu tiên KB nào |
| 4 | Resource validation | Upload file không liên quan / rỗng | Agent nhận garbage input |

### Hướng giải quyết: Resource Classifier Layer

Thêm một tầng **Resource Classifier** nằm giữa user input và orchestrator:

```
User Input (query + files)
       │
       ▼
[Resource Classifier]       ← TẦNG MỚI
  ├─ Validate resources
  ├─ Classify → KB type per file
  ├─ Extract embedded prompts
  └─ Resolve conflicts
       │
       ▼
[RL Orchestrator]           ← state giờ bao gồm KB signals
       │
       ▼
[Agent + relevant KB data]
```

---

## 2. Knowledge Base Taxonomy (Phân loại KB)

### 5 KB types

| KB Type | Code | Mô tả | File signatures |
|---------|------|-------|-----------------|
| `kb_financial_statement` | FS | Báo cáo tài chính, BCTC, financial report | PDF/XLSX có: revenue, net income, balance sheet, P&L |
| `kb_price_data` | PD | Dữ liệu giá OHLCV, lịch sử giao dịch | CSV/XLSX có: date, open, high, low, close, volume |
| `kb_stock_list` | SL | Danh sách mã, bảng so sánh, universe | CSV/XLSX có: ticker, sector, score, hoặc >5 mã cổ phiếu |
| `kb_research_report` | RR | Báo cáo phân tích từ CTCK, research note | PDF có: recommendation, target price, analyst name |
| `kb_unknown` | UK | Không nhận diện được / không liên quan | Không match bất kỳ signature nào |

### KB → Agent affinity (ánh xạ KB → agent phù hợp nhất)

```
kb_financial_statement  → fundamental  (affinity: 0.9)
                        → screening    (affinity: 0.1)

kb_price_data           → technical    (affinity: 0.9)
                        → screening    (affinity: 0.1)

kb_stock_list           → screening    (affinity: 0.8)
                        → fundamental  (affinity: 0.1)
                        → technical    (affinity: 0.1)

kb_research_report      → fundamental  (affinity: 0.5)
                        → technical    (affinity: 0.3)
                        → screening    (affinity: 0.2)

kb_unknown              → reject/clarify (không route)
```

**Ý nghĩa:** Affinity score được cộng vào relevance scores trước khi discretize state.
Ví dụ: user upload CSV giá → `t_score_raw += 0.9 × kb_weight`, kéo state về phía technical.

---

## 3. Resource Classification Rules (5 chuẩn)

### Chuẩn R1 — File Type Validation

| File type | Accepted | Lý do |
|-----------|----------|-------|
| `.pdf` | ✅ | Báo cáo TC, research report |
| `.csv` | ✅ | Dữ liệu giá, danh sách mã |
| `.xlsx` / `.xls` | ✅ | Bảng tính tài chính, so sánh |
| `.txt` | ✅ | Ghi chú, danh sách |
| `.docx` | ⚠️ Conditional | Chỉ nếu chứa data tài chính |
| `.jpg/.png` | ❌ | Không extract được structured data |
| `.mp3/.mp4` | ❌ | Ngoài scope |
| Khác | ❌ | Reject + thông báo user |

**Action khi reject:** Trả về user message gợi ý format phù hợp, vẫn xử lý query text.

### Chuẩn R2 — Content Fingerprinting (KB Detection)

Mỗi file được scan qua content fingerprints để xác định KB type:

```python
KB_FINGERPRINTS = {
    "kb_financial_statement": {
        "required_any": ["revenue", "doanh thu", "net income", "lợi nhuận",
                         "balance sheet", "bảng cân đối", "cash flow",
                         "income statement", "P&L", "equity", "vốn chủ"],
        "required_structure": "tabular with quarters/years as columns",
        "min_matches": 3,
    },
    "kb_price_data": {
        "required_any": ["open", "high", "low", "close", "volume",
                         "date", "OHLCV", "giá mở cửa", "giá đóng cửa"],
        "required_structure": "time series with date column",
        "min_matches": 4,  # cần ít nhất 4/5 OHLCV fields
    },
    "kb_stock_list": {
        "required_any": ["ticker", "mã", "symbol", "sector", "ngành",
                         "market cap", "vốn hóa", "score", "điểm"],
        "required_structure": "multiple tickers (≥5 unique) in rows",
        "min_matches": 2,
    },
    "kb_research_report": {
        "required_any": ["recommendation", "khuyến nghị", "target price",
                         "giá mục tiêu", "analyst", "phân tích viên",
                         "mua", "bán", "nắm giữ", "buy", "sell", "hold"],
        "required_structure": "prose with conclusion section",
        "min_matches": 2,
    },
}
```

**Quy tắc ưu tiên:** Nếu file match nhiều KB type, chọn type có `min_matches` cao nhất.
Nếu không match bất kỳ type nào → `kb_unknown`.

### Chuẩn R3 — Embedded Prompt Detection

**Embedded prompt** = instruction/highlight/ghi chú trong resource mà thay đổi intent.

Phát hiện bằng scan các pattern:

```python
EMBEDDED_PROMPT_PATTERNS = [
    # Direct instructions
    r"(?:hãy|cần|nên|yêu cầu)\s+(?:phân tích|đánh giá|xem|focus|tập trung)",
    r"(?:focus|concentrate|look at|xem)\s+(?:on|vào|phần)",
    
    # Highlighted sections (PDF annotations, bold/underline markers)
    r"\*\*[^*]+\*\*",                    # **bold text**
    r"!!![^!]+!!!",                       # !!!highlighted!!!
    r"(?:IMPORTANT|QUAN TRỌNG|NOTE|GHI CHÚ):",
    
    # Questions embedded in resource
    r"\?\s*$",                            # lines ending with ?
    
    # Action keywords
    r"(?:RSI|MACD|MA|PE|ROE|DCF|filter|lọc|so sánh).*\?",
]
```

**3 cách xử lý embedded prompt:**

| Strategy | Khi nào dùng | Ví dụ |
|----------|-------------|-------|
| **IGNORE** | Embedded prompt mâu thuẫn với query text | Query: "PE bao nhiêu?", PDF ghi "Xem MACD" → ignore MACD |
| **MERGE** | Embedded prompt bổ sung cho query (cùng direction) | Query: "Phân tích VNM", PDF highlight "Cash flow quan trọng" → merge |
| **ESCALATE** | Embedded prompt thay đổi hoàn toàn intent | Query: "Xem báo cáo", PDF ghi "So sánh 10 mã" → hỏi user |

**Quy tắc mặc định: QUERY WINS.** Embedded prompt chỉ override khi query intent
là "general" (không rõ agent) VÀ embedded prompt có intent rõ ràng.

### Chuẩn R4 — Multi-KB Conflict Resolution

Khi user upload nhiều file thuộc nhiều KB types:

```python
CONFLICT_RESOLUTION = {
    # Strategy 1: DOMINANT KB (dùng khi query rõ ràng)
    # → Chọn KB phù hợp nhất với query, bỏ qua KB khác
    "dominant": {
        "condition": "query intent clarity ≥ 0.4 (easy/medium)",
        "action": "Chọn KB có affinity cao nhất với query intent agent",
        "example": "Query='PE VNM?' + [PDF báo cáo TC, CSV giá] → chọn PDF (fund KB)",
    },
    
    # Strategy 2: SEQUENTIAL CHAIN (dùng khi query phức tạp)
    # → Gọi lần lượt agents với KB tương ứng
    "chain": {
        "condition": "query intent clarity < 0.4 (hard/mixed) AND ≥2 KB types",
        "action": "Route đến primary agent trước, rồi chain sang secondary",
        "example": "Query='Phân tích toàn diện VNM' + [PDF + CSV] → fund(PDF) → tech(CSV)",
    },
    
    # Strategy 3: PARALLEL (dùng cho screening/comparison)
    # → Gọi nhiều agents song song với KB phù hợp
    "parallel": {
        "condition": "query intent = screening AND ≥2 files cùng type",
        "action": "Gửi tất cả files cho screening agent",
        "example": "Query='So sánh 3 mã' + [3 PDF báo cáo] → screening(all PDFs)",
    },
}
```

**Priority khi chọn strategy:**

```
1. Nếu query intent rõ ràng (easy/medium) → DOMINANT
2. Nếu query mixed + multi-KB → CHAIN
3. Nếu query screening + multi-file cùng type → PARALLEL
4. Default → DOMINANT (chọn KB có affinity cao nhất)
```

### Chuẩn R5 — KB Quality Gate

Mỗi resource phải pass quality checks trước khi trở thành KB:

| Check | Threshold | Fail action |
|-------|-----------|-------------|
| File size | 10KB ≤ size ≤ 50MB | Reject + thông báo |
| Readable content | Extracted text > 100 chars | Reject (file rỗng/encrypted) |
| KB type detected | type ≠ `kb_unknown` | Warn user, proceed without resource |
| Language | Vietnamese hoặc English | Warn nếu ngôn ngữ khác |
| Data freshness | Date trong file ≤ 2 năm | Warn "dữ liệu có thể đã cũ" |
| Ticker coverage | Tickers trong file ∈ VN market | Warn nếu toàn ticker nước ngoài |

---

## 4. Tác động lên Dataset Orchestrator (Schema v3)

### Cột mới cần thêm (6 cột resource-aware)

| # | Cột | Kiểu | Mô tả | Ví dụ |
|---|-----|------|-------|-------|
| 19 | `resource_count` | int | Số file user upload | 0, 1, 2, 3 |
| 20 | `kb_types` | str (JSON array) | Danh sách KB types | `["kb_financial_statement"]` |
| 21 | `kb_primary` | str | KB type chính (affinity cao nhất) | `kb_price_data` |
| 22 | `kb_query_alignment` | str | aligned / conflict / neutral | `conflict` |
| 23 | `has_embedded_prompt` | bool | Resource có chứa prompt không | `True` |
| 24 | `conflict_resolution` | str | dominant / chain / parallel / none | `chain` |

### State space mở rộng

```python
# v2.1: state_id = f_level×9 + t_level×3 + s_level  (27 states)

# v3 (resource-aware):
# Thêm 2 chiều mới:
#   kb_signal (0=no resource, 1=aligned, 2=conflict)  → 3 levels
#   has_embedded_prompt (0/1)                           → 2 levels
#
# state_id_v3 = state_id_v2 × 6 + kb_signal × 2 + has_embedded_prompt
# → 27 × 6 = 162 states
#
# NHƯNG: 162 states quá lớn cho tabular Q-Learning
# → PoC: keep 27 states + dùng kb_signal làm reward modifier
# → Phase 2 DQN: encode tất cả vào continuous state vector
```

**Quyết định thiết kế cho PoC:**

State space giữ nguyên 27 (tránh sparse Q-table). Thay vào đó, KB signal
ảnh hưởng qua **reward function**:

```python
def compute_reward_v3(chosen, correct, difficulty, kb_alignment):
    base_reward = compute_reward_v2(chosen, correct, difficulty)
    
    # KB alignment bonus/penalty
    if kb_alignment == "aligned":
        base_reward += 0.2    # resource xác nhận đúng hướng
    elif kb_alignment == "conflict":
        if chosen == correct:
            base_reward += 0.5  # bonus lớn: route đúng dù resource gây nhiễu
        else:
            base_reward -= 0.2  # penalty nhẹ hơn: conflict là khó
    
    return base_reward
```

---

## 5. Quy trình xử lý Resource (Pipeline)

```
User uploads file(s)
        │
        ▼
[R1: File Type Validation]
  ├─ Accepted → tiếp tục
  └─ Rejected → thông báo user, proceed with query only
        │
        ▼
[R2: Content Fingerprinting]
  ├─ Extract text (PDF→pymupdf, CSV→pandas, XLSX→openpyxl)
  ├─ Match against KB_FINGERPRINTS
  └─ Assign kb_type per file
        │
        ▼
[R3: Embedded Prompt Detection]
  ├─ Scan for EMBEDDED_PROMPT_PATTERNS
  ├─ Extract prompt intent (if found)
  └─ Flag has_embedded_prompt
        │
        ▼
[R4: Conflict Resolution]
  ├─ Compare query_intent vs kb_type vs embedded_prompt_intent
  ├─ Apply priority: query > resource > embedded
  ├─ Choose strategy: dominant / chain / parallel
  └─ Set kb_query_alignment: aligned / conflict / neutral
        │
        ▼
[R5: KB Quality Gate]
  ├─ Check size, content, freshness
  └─ Warn/reject low-quality resources
        │
        ▼
[Enriched state for RL Orchestrator]
  state = {
      query_features,          # (existing v2.1)
      kb_primary,              # NEW: dominant KB type
      kb_query_alignment,      # NEW: aligned/conflict/neutral
      has_embedded_prompt,     # NEW: bool
      conflict_resolution,     # NEW: dominant/chain/parallel
  }
```

---

## 6. Ví dụ áp dụng cụ thể

### Ví dụ 1: Resource aligned — đơn giản nhất

```
Query:     "Phân tích P/E và ROE của VNM"
Resource:  VNM_Q3_2024.pdf (báo cáo tài chính)
────────────────────────────────────────────
R1: PDF → accepted ✅
R2: Content fingerprint → "revenue", "net income", "equity" → kb_financial_statement
R3: No embedded prompt
R4: query_intent=fundamental, kb_type=fundamental → ALIGNED
R5: Quality OK
────────────────────────────────────────────
Result: kb_query_alignment = "aligned"
        Orchestrator state: f_level=2, t_level=0, s_level=0
        KB bonus: +0.2 reward
        Route → fundamental agent + VNM_Q3_2024.pdf as context
```

### Ví dụ 2: Resource-Query conflict

```
Query:     "RSI và MACD của VNM cho tín hiệu gì?"
Resource:  VNM_Q3_2024.pdf (báo cáo tài chính)
────────────────────────────────────────────
R1: PDF → accepted ✅
R2: Content fingerprint → kb_financial_statement
R3: No embedded prompt
R4: query_intent=TECHNICAL, kb_type=FUNDAMENTAL → CONFLICT
    Priority: query > resource
    Strategy: DOMINANT (query intent rõ ràng, easy)
R5: Quality OK
────────────────────────────────────────────
Result: kb_query_alignment = "conflict"
        Orchestrator: IGNORE resource, route based on query
        Route → technical agent (KHÔNG dùng PDF)
        Inform user: "File bạn upload là báo cáo tài chính,
                      nhưng câu hỏi về phân tích kỹ thuật.
                      Tôi sẽ phân tích RSI/MACD dựa trên dữ liệu giá."
```

### Ví dụ 3: Embedded prompt conflict

```
Query:     "Xem giúp tôi file này"  (query mơ hồ, intent unclear)
Resource:  VNM_analysis.pdf
           Nội dung: Báo cáo tài chính VNM
           Trang 5 có highlight: "**Cần phân tích RSI và MACD kỹ hơn**"
────────────────────────────────────────────
R1: PDF → accepted ✅
R2: Content fingerprint → kb_financial_statement (dominant)
R3: Embedded prompt detected: "phân tích RSI và MACD" → intent=technical
R4: query_intent=UNCLEAR, kb_type=FUNDAMENTAL, embedded=TECHNICAL
    Query unclear → resource gets higher weight
    But: resource content ≠ embedded prompt intent
    Strategy: CHAIN (fundamental first from content, then technical from prompt)
R5: Quality OK
────────────────────────────────────────────
Result: kb_query_alignment = "conflict"
        conflict_resolution = "chain"
        Route → fundamental(PDF content) → technical(based on embedded prompt)
        Inform user: "File là báo cáo tài chính VNM. Tôi thấy bạn có ghi chú
                      muốn phân tích RSI/MACD. Tôi sẽ phân tích tài chính trước,
                      sau đó chuyển sang phân tích kỹ thuật."
```

### Ví dụ 4: Multi-KB

```
Query:     "Đánh giá toàn diện VNM để quyết định mua hay không"
Resources: VNM_Q3.pdf      (báo cáo tài chính)
           VNM_price.csv   (dữ liệu giá 1 năm)
           sector_list.xlsx (so sánh ngành Consumer Staples)
────────────────────────────────────────────
R1: All accepted ✅
R2: PDF → kb_financial_statement
    CSV → kb_price_data
    XLSX → kb_stock_list
R3: No embedded prompts
R4: query_intent=MIXED (hard), 3 KB types → CHAIN strategy
    Chain order based on affinity:
    1. fundamental (PDF, highest affinity for "đánh giá")
    2. technical (CSV, supplement with price trend)
    3. screening (XLSX, compare vs peers)
R5: All quality OK
────────────────────────────────────────────
Result: kb_types = ["kb_financial_statement", "kb_price_data", "kb_stock_list"]
        conflict_resolution = "chain"
        Route → fundamental(PDF) → technical(CSV) → screening(XLSX)
        Final synthesis: aggregate all 3 agents' outputs
```

### Ví dụ 5: Invalid resource

```
Query:     "Phân tích portfolio của tôi"
Resource:  selfie.jpg
────────────────────────────────────────────
R1: JPG → REJECTED ❌
R5: kb_type = kb_unknown
────────────────────────────────────────────
Result: Proceed with query only (no resource)
        Inform user: "File ảnh không chứa dữ liệu tài chính.
                      Vui lòng upload PDF báo cáo, CSV giá, hoặc Excel danh mục.
                      Tôi sẽ phân tích dựa trên câu hỏi của bạn."
```

---

## 7. Priority Rule (Quy tắc ưu tiên — quan trọng nhất)

Khi có conflict giữa 3 nguồn intent, ưu tiên theo thứ tự:

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│   1. QUERY TEXT         (ưu tiên cao nhất)               │
│      User gõ gì → đó là intent chính                    │
│      Lý do: user chủ động viết, rõ ràng nhất            │
│                                                          │
│   2. RESOURCE CONTENT   (ưu tiên trung bình)            │
│      File chứa data gì → gợi ý KB type                 │
│      Lý do: user chủ động upload, nhưng có thể nhầm    │
│                                                          │
│   3. EMBEDDED PROMPT    (ưu tiên thấp nhất)             │
│      Ghi chú/highlight trong file → gợi ý phụ          │
│      Lý do: có thể là ghi chú cũ, không phải intent    │
│              hiện tại; cũng có thể là prompt injection   │
│                                                          │
│   NGOẠI LỆ: Khi query text mơ hồ ("xem file này")      │
│   → resource content lên ưu tiên 1, embedded lên 2      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Quy tắc phát hiện query mơ hồ:**

```python
VAGUE_QUERY_PATTERNS = [
    r"^(?:xem|đọc|mở|check|review)\s+(?:file|tệp|tài liệu|này|giúp)",
    r"^(?:file|tệp)\s+(?:này|đây)\s+(?:nói|chứa|có)\s+gì",
    r"^(?:phân tích|analyze)\s+(?:file|tệp|tài liệu|document)\s+(?:này|đây|giúp)",
]
# Nếu query match bất kỳ pattern nào → vague = True
# → Resource content lên priority 1
```

---

## 8. Tác động lên training dataset

### Dataset v3 sẽ cần thêm rows cho mỗi scenario

```
v2.1: 140 rows (query only, 15% has_attachment nhưng không dùng content)

v3 target: 250+ rows, phân bổ:
  ├─ 100 rows: query only (no resource)      ← giữ từ v2.1
  ├─  50 rows: query + aligned resource      ← MỚI
  ├─  40 rows: query + conflict resource     ← MỚI
  ├─  30 rows: query + embedded prompt       ← MỚI
  ├─  20 rows: query + multi-KB              ← MỚI
  └─  10 rows: query + invalid resource      ← MỚI
```

### Reward function v3

```python
REWARD_V3 = {
    # Base reward (same as v2.1)
    "base": {"correct": 1.0, "wrong": -0.5, "hard_correct": 1.2, "hard_wrong": -0.3},
    
    # KB alignment modifier
    "kb_aligned":       +0.2,   # resource xác nhận intent
    "kb_conflict_win":  +0.5,   # route đúng dù resource gây nhiễu
    "kb_conflict_lose": -0.2,   # route sai vì bị resource đánh lừa
    "kb_neutral":        0.0,   # no resource
    
    # Embedded prompt modifier
    "embedded_correctly_ignored":  +0.3,  # ignore embedded khi query rõ → đúng
    "embedded_correctly_followed": +0.2,  # follow embedded khi query mơ hồ → đúng
    "embedded_incorrectly_followed": -0.4, # bị prompt injection đánh lừa → sai
    
    # Multi-KB modifier
    "chain_all_correct":  +0.8,   # chọn đúng thứ tự chain
    "chain_partial":      +0.3,   # đúng agent chính, sai thứ tự
    "chain_wrong":        -0.3,   # sai agent chính
}
```

---

## 9. Scope cho PoC vs Production

### PoC (Phase 1 — bạn đang ở đây)

```
Làm:
  ✅ Thêm cột resource metadata vào dataset (kb_type, alignment)
  ✅ Dùng KB signal làm reward modifier (không mở rộng state space)
  ✅ Mô phỏng conflict scenarios trong synthetic data
  ✅ Đo thêm metric: conflict_routing_accuracy

Không làm:
  ❌ Thực sự parse PDF/CSV content (dùng synthetic labels)
  ❌ NLP-based embedded prompt detection (dùng regex patterns)
  ❌ Multi-agent chaining (chỉ single-agent routing)
  ❌ Real-time resource processing pipeline
```

### Phase 2 (DQN)

```
Thêm:
  ✅ Content fingerprinting thật (pymupdf, pandas)
  ✅ Resource embedding (encode file summary vào state vector)
  ✅ Embedded prompt detection (classifier model)
  ✅ Chain routing cho multi-KB queries
```

### Phase 3 (Production)

```
Thêm:
  ✅ Async resource processing pipeline (Celery/K8s jobs)
  ✅ Resource caching (vector store cho KB lookups)
  ✅ User feedback loop (user confirm/correct KB classification)
  ✅ Dynamic KB discovery (tự học KB types mới)
```

---

## 10. Quick Reference

| # | Chuẩn | Mô tả | Threshold |
|---|-------|-------|-----------|
| R1 | File type validation | PDF/CSV/XLSX accepted | Reject unsupported types |
| R2 | Content fingerprinting | Detect KB type từ content | min_matches ≥ 2-4 keywords |
| R3 | Embedded prompt detection | Scan highlight/instruction | Regex pattern matching |
| R4 | Conflict resolution | Query > Resource > Embedded | Strategy: dominant/chain/parallel |
| R5 | KB quality gate | Size, readability, freshness | 10KB-50MB, >100 chars text |

**Quy tắc vàng: Query intent luôn thắng resource signal,
trừ khi query mơ hồ ("xem file này") — lúc đó resource lên ưu tiên 1.**

---

*Version: v1.0 | Ngày: 29/03/2026 | Phase: PoC*
*Companion doc: orchestrator_dataset_standards_v2.1.md*
*Tác động: dataset cần mở rộng từ 140 → 250+ rows, thêm 6 cột resource-aware*
