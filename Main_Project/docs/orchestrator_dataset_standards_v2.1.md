# Chuẩn hóa Dataset Orchestrator cho Q-Learning PoC — v2.1

> Tài liệu này định nghĩa các tiêu chuẩn thiết kế prompt người dùng trong
> `dataset_orchestrator_v2_final.csv` để áp dụng cho MLflow workflow với thuật toán Q-Learning.
>
> **Changelog từ v1:**
> - Chuẩn 1: Intent clarity violations giảm từ 36 → 4 (nhờ chiến lược nhúng 2+ keywords/template)
> - Chuẩn 3: No-keyword rows giảm từ 7 → 0 (100% query có keyword domain tài chính)
> - Schema mở rộng từ 7 → 18 cột (thêm 11 cột Q-Learning enrichment)
> - Thêm 17 intent sub-categories cho phân tích chi tiết
> - Thêm `prompt_quality_score` làm quality gate
> - Ghi nhận giới hạn cấu trúc: state coverage đạt 16/27 (keyword-based ceiling)
> - Thêm §9: Template Design Strategy (bài học từ v1 → v2)
> - Thêm §10: Known Limitations & Phase 2 Migration Path

---

## 1. Tổng quan: Mapping giữa Dataset và Q-Learning

Mỗi hàng trong dataset orchestrator ánh xạ trực tiếp đến một vòng lặp Q-Learning:

```
User Query (row)
    │
    ▼
[State Extraction]          → state_id (0–26)   = Q-table ROW
    │                          computed from f_level, t_level, s_level
    ▼
[Action Selection ε-greedy] → correct_action_idx (0/1/2) = Q-table COLUMN
    │
    ▼
[Reward Computation]        → expected_reward_correct ∈ {1.105 … 1.500}
    │
    ▼
[Q-table Update]            Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') − Q(s,a)]
```

### Dataset ở đâu trong pipeline?

```
dataset_orchestrator_v2_final.csv
    │
    ├── Cột 1-8:  Input ban đầu (query, agent, difficulty, metadata)
    ├── Cột 9-11: Relevance scores (f/t/s_score_raw) → feature extraction output
    ├── Cột 12-14: Discretized levels (f/t/s_level) → state encoding
    ├── Cột 15: state_id → Q-table row index (trực tiếp)
    ├── Cột 16: correct_action_idx → Q-table optimal column (ground truth)
    ├── Cột 17: expected_reward_correct → reward khi routing đúng
    └── Cột 18: prompt_quality_score → quality gate filter
```

---

## 2. Schema hoàn chỉnh (18 cột)

### Nhóm A: Input ban đầu (8 cột)

| # | Cột | Kiểu | Mô tả | Vai trò |
|---|-----|------|-------|---------|
| 1 | `query` | str | Câu hỏi tiếng Việt của user | Input chính cho state extraction |
| 2 | `correct_agent` | str | fundamental / technical / screening | Ground truth label |
| 3 | `difficulty` | str | easy / medium / hard | Phân tầng đánh giá + reward scaling |
| 4 | `query_length` | int | Số ký tự | Proxy cho complexity, input DQN Phase 2 |
| 5 | `mentioned_tickers` | int | Số mã cổ phiếu (0/1/2) | Feature phân biệt: 0→screening, 1→fund/tech |
| 6 | `has_attachment` | bool | User có đính kèm file | Thay đổi xác suất routing |
| 7 | `attachment_type` | str\|null | pdf / xlsx / csv | pdf→fund, csv→tech (production feature) |
| 8 | `intent_category` | str | 17 sub-categories (xem §4) | Phân tích chi tiết, không dùng trong Q-Learning |

### Nhóm B: Q-Learning Enrichment (10 cột)

| # | Cột | Kiểu | Công thức | Vai trò trong Q-Learning |
|---|-----|------|-----------|--------------------------|
| 9 | `f_score_raw` | float | `min(1.0, fund_keyword_count × 0.25 + 0.1)` | Feature 1: relevance Fundamental |
| 10 | `t_score_raw` | float | `min(1.0, tech_keyword_count × 0.25 + 0.1)` | Feature 2: relevance Technical |
| 11 | `s_score_raw` | float | `min(1.0, screen_keyword_count × 0.25 + 0.1)` | Feature 3: relevance Screening |
| 12 | `f_level` | int | `0 if f<0.3 else (1 if f<0.6 else 2)` | Chiều 1 của state (discretized) |
| 13 | `t_level` | int | tương tự | Chiều 2 của state |
| 14 | `s_level` | int | tương tự | Chiều 3 của state |
| 15 | `state_id` | int | `f_level×9 + t_level×3 + s_level` | **Q-table row index** (0–26) |
| 16 | `correct_action_idx` | int | `{fund:0, tech:1, screen:2}` | **Q-table optimal column** |
| 17 | `expected_reward_correct` | float | `base_reward + 0.3 × max_score` | Target reward khi chọn đúng |
| 18 | `prompt_quality_score` | float | `clarity×0.4 + kw_ok×0.3 + length_ok×0.3` | Quality gate (≥0.6 để dùng) |

### Công thức state_id

```python
state_id = f_level * 9 + t_level * 3 + s_level
# → 3^3 = 27 states, index 0–26
# Ví dụ: state 18 = (2,0,0) → fundamental keywords cao, tech+screen thấp
#         state  6 = (0,2,0) → technical keywords cao
#         state  2 = (0,0,2) → screening keywords cao
```

### Công thức prompt_quality_score

```python
scores_sorted = sorted([f_score_raw, t_score_raw, s_score_raw], reverse=True)
clarity_ratio = scores_sorted[0] / max(scores_sorted[1], 0.01)
clarity_norm = min(clarity_ratio, 5) / 5              # cap at 5.0

kw_ok = 1.0 if scores_sorted[0] >= 0.15 else 0.3     # keyword present?
length_ok = 1.0 if 20 <= query_length <= 120 else 0.5 # valid length?

prompt_quality_score = min(1.0, clarity_norm × 0.4 + kw_ok × 0.3 + length_ok × 0.3)
```

---

## 3. 6 Chuẩn cho Prompt (Prompt Standards)

### Chuẩn 1 — Rõ ràng ý định (Intent Clarity)

**Nguyên tắc:** Query phải chứa đủ keyword để state extraction tạo ra dominant score
cho đúng agent. Score thấp hoặc score bằng nhau giữa 2 agent → Q-table không phân biệt được.

**Điều kiện:** `max(f_score_raw, t_score_raw, s_score_raw) ≥ 0.15`

| Difficulty | Yêu cầu dominant score | Yêu cầu ratio (dominant / 2nd) | Ví dụ |
|------------|----------------------|-------------------------------|-------|
| easy | ≥ 0.40 | ≥ 2.0 | "P/E và ROE của VNM" (fund=0.6, tech=0, screen=0) |
| medium | ≥ 0.25 | ≥ 1.5 | "RSI cho tín hiệu gì?" (fund=0, tech=0.35, screen=0) |
| hard | ≥ 0.15 | không giới hạn | "P/E thấp nhưng RSI cao" (fund=0.35, tech=0.35) |

**Kết quả v2.1:** 4 violations (tất cả là hard mixed — by design, chấp nhận được).

**Bài học từ v1 (36 violations):** Template v1 dùng 1 keyword/query → score thấp (0.1–0.2),
không đủ dominant. v2.1 nhúng 2+ keywords/template cho easy/medium (xem §9).

---

### Chuẩn 2 — Độ dài hợp lệ (Valid Length)

```
20 ≤ query_length ≤ 120 ký tự
```

| Range | Lý do |
|-------|-------|
| < 20 | Quá ngắn, thiếu keyword → state extraction trả về zeros |
| 20–60 | Optimal cho PoC: đủ keyword, không dư thừa |
| 60–120 | Chấp nhận: câu dài hơn nhưng vẫn xử lý được |
| > 120 | Quá dài cho tabular Q-Learning; Phase 2 DQN xử lý |

**Kết quả v2.1:** 0 violations. Range thực tế: 34–70 ký tự.

---

### Chuẩn 3 — Phủ từ khóa (Keyword Coverage)

Mỗi query phải chứa ít nhất **1 từ khoá** từ bộ từ điển của agent tương ứng,
tức `max(f_score_raw, t_score_raw, s_score_raw) ≥ 0.15`.

#### Fundamental keywords (31 terms)

```
PE, P/E, ROE, EPS, ROA, doanh thu, revenue, lợi nhuận, profit,
báo cáo tài chính, financial, cổ tức, dividend, yield,
giá trị nội tại, intrinsic, book value, P/B, biên lợi nhuận,
margin, nợ, debt, equity, balance sheet, income statement,
cash flow, DCF, định giá, valuation, fundamental
```

#### Technical keywords (28 terms)

```
MA, SMA, EMA, RSI, MACD, Bollinger, xu hướng, trend,
hỗ trợ, kháng cự, support, resistance, nến, candlestick,
chart, biểu đồ, volume, khối lượng, breakout, momentum,
stochastic, fibonacci, đường trung bình, tín hiệu,
entry, exit, technical, pattern
```

#### Screening keywords (24 terms)

```
lọc, filter, sàng lọc, screen, so sánh, compare,
top, tốt nhất, best, xếp hạng, ranking, ngành, sector,
industry, danh sách, list, tiêu chí, tìm, find, recommend,
gợi ý, đề xuất, portfolio, penny stock
```

**Kết quả v2.1:** 0 violations (v1 có 7).

**Lưu ý matching:** Matching case-insensitive trên `query.lower()`. Keyword "MA" cũng match
"MACD" — chấp nhận vì cả hai đều là technical. Keyword "margin" match cả "biên lợi nhuận margin" — OK.

---

### Chuẩn 4 — Phủ state space (State Space Coverage)

**Tiêu chí:**
- ≥ **18/27 states** được cover (67% coverage)
- Mỗi state được cover phải có ≥ **2 training examples**
- Không có state nào chiếm > **20%** tổng số rows

**Kết quả v2.1:** 16/27 states covered, 14 states có 2+ examples,
max concentration = 21.4% (state 6, technical queries).

### State map thực tế (v2.1)

```
State  2 = (0,0,2):  23 rows → screening    ████████████████████████  (16.4%)
State  5 = (0,1,2):   5 rows → screening    █████
State  6 = (0,2,0):  30 rows → technical    ██████████████████████████████  (21.4%) ⚠️
State  7 = (0,2,1):   2 rows → technical    ██
State  8 = (0,2,2):   2 rows → screening    ██
State 10 = (1,0,1):   2 rows → fundamental  ██
State 11 = (1,0,2):   1 row  → screening    █
State 12 = (1,1,0):   4 rows → fundamental  ████
State 14 = (1,1,2):   1 row  → screening    █
State 15 = (1,2,0):  12 rows → fund+tech    ████████████  (mixed)
State 17 = (1,2,2):   2 rows → screening    ██
State 18 = (2,0,0):  27 rows → fundamental  ███████████████████████████  (19.3%)
State 20 = (2,0,2):   5 rows → screening    █████
State 21 = (2,1,0):   5 rows → fundamental  █████
State 23 = (2,1,2):   3 rows → fund+screen  ███  (mixed)
State 24 = (2,2,0):  16 rows → fund+tech    ████████████████  (mixed)
```

### Các state "vàng" (high-value, dùng cho nhanh debugging)

| State | (f,t,s) | Rows | Dominant agent | Đặc điểm |
|-------|---------|------|----------------|-----------|
| 18 | (2,0,0) | 27 | fundamental | Query rõ ràng nhất cho fund — chỉ fund keywords |
| 6 | (0,2,0) | 30 | technical | Query rõ ràng nhất cho tech — chỉ tech keywords |
| 2 | (0,0,2) | 23 | screening | Query rõ ràng nhất cho screen — chỉ screen keywords |
| 24 | (2,2,0) | 16 | fund+tech mixed | Hard queries: cả fund và tech keywords cao |
| 15 | (1,2,0) | 12 | fund+tech mixed | Medium-hard: tech dominant nhưng có fund context |

### Tại sao chỉ 16/27 states?

**Giới hạn cấu trúc của keyword-based scoring.**

Trong tiếng Việt tự nhiên, các state yêu cầu 2+ agent cùng ở mức "medium" (level 1)
rất hiếm xảy ra. Ví dụ state 13 = (1,1,1) cần query có keyword fund + tech + screen
ở cùng mức trung bình — gần như không tồn tại trong prompt thật.

**11 states không được cover:** 1, 3, 4, 9, 13, 16, 19, 22, 25, 26, 0.
Phần lớn là states có f_level=0 + t_level=0 (không keyword) hoặc 3 levels cùng > 0
(không thực tế cho tiếng Việt).

**Giải pháp Phase 2:** Chuyển sang DQN với text embeddings → state space liên tục,
không còn phụ thuộc 27 ô rời rạc. State coverage không còn là constraint.

---

### Chuẩn 5 — Cân bằng nhãn (Class Balance)

**Target:**
```
Fundamental : Technical : Screening = 35% : 30% : 35%   (±5%)
easy : medium : hard = 25% : 40% : 35%
```

**Kết quả v2.1:**
```
Agent:      fundamental=42.9%  technical=28.6%  screening=28.6%
Difficulty: easy=37.1%         medium=31.4%     hard=31.4%
```

**Lệch fundamental (42.9% vs target 35%):** Do hard mixed queries nghiêng về fundamental
làm primary agent — "phân tích toàn diện cả cơ bản lẫn kỹ thuật" thường default về
fundamental vì đó là agent "tổng quát" nhất. Đây là quyết định nghiệp vụ hợp lý:
khi nghi ngờ, route về fundamental trước.

**Khắc phục nếu cần:** Tăng templates `screen_mixed` và `tech_mixed`,
hoặc chấp nhận fundamental là agent "default" cho mixed queries.

---

### Chuẩn 6 — Nhất quán nhãn (Label Consistency)

**Quy tắc:**
- Cùng template query với ticker khác nhau → **cùng correct_agent**
- Không annotate cùng query text với 2 nhãn khác nhau
- Ví dụ: `"RSI của [X] ở vùng quá mua?"` → luôn là `technical` với mọi X

**Kết quả v2.1:** 0 contradictions (pass).

---

## 4. Intent Categories (17 sub-categories)

### Fundamental (6 categories, 60 rows)

| intent_category | Rows | Ví dụ | Keyword pattern |
|-----------------|------|-------|-----------------|
| `fund_ratio` | 22 | "P/E và ROE của VCB hiện tại" | PE, ROE, EPS, P/B, ROA |
| `fund_mixed` | 24 | "Báo cáo tài chính tốt, chart ủng hộ?" | fund + tech keywords cùng lúc |
| `fund_financial_statement` | 4 | "Phân tích báo cáo tài chính quý 3 FPT" | báo cáo, financial, balance sheet |
| `fund_valuation` | 4 | "Định giá DCF cho VNM" | DCF, valuation, intrinsic, định giá |
| `fund_comparison` | 4 | "ROE VNM so với ngành" | so với ngành, so sánh + fund metric |
| `fund_dividend` | 2 | "Cổ tức dividend yield hấp dẫn?" | cổ tức, dividend, yield |

### Technical (5 categories, 40 rows)

| intent_category | Rows | Ví dụ | Keyword pattern |
|-----------------|------|-------|-----------------|
| `tech_indicator` | 24 | "RSI và MACD cho tín hiệu gì?" | RSI, MACD, Bollinger, stochastic |
| `tech_mixed` | 8 | "RSI quá bán và P/E thấp, entry?" | tech + fund keywords cùng lúc |
| `tech_trend` | 4 | "Xu hướng trend MA50 MA200" | xu hướng, trend, MA, SMA, EMA |
| `tech_pattern` | 2 | "Mẫu hình nến double top?" | pattern, nến, candlestick, double |
| `tech_entry_exit` | 2 | "Điểm entry mua theo technical" | entry, exit, hỗ trợ, kháng cự |

### Screening (6 categories, 40 rows)

| intent_category | Rows | Ví dụ | Keyword pattern |
|-----------------|------|-------|-----------------|
| `screen_filter` | 15 | "Lọc filter cổ phiếu P/E thấp nhất" | lọc, filter, sàng lọc, screen |
| `screen_mixed` | 12 | "Tìm mã có ROE cao và fund tốt nhất" | screen + fund keywords |
| `screen_recommend` | 7 | "Gợi ý recommend 5 cổ phiếu" | gợi ý, recommend, đề xuất |
| `screen_compare` | 3 | "So sánh compare VNM và FPT" | so sánh, compare |
| `screen_portfolio` | 2 | "Đề xuất portfolio 10 mã" | portfolio, danh mục, ngân sách |
| `screen_rank` | 1 | "Xếp hạng ranking ngành Banking" | xếp hạng, ranking, top |

---

## 5. Reward Design

### Base reward schedule

```python
REWARD_SCHEDULE = {
    "easy":   {"correct": +1.0, "wrong": -0.5},
    "medium": {"correct": +1.0, "wrong": -0.5},
    "hard":   {"correct": +1.2, "wrong": -0.3},  # harder = higher reward, softer penalty
}
```

### Expected reward computation (cột `expected_reward_correct`)

```python
max_score = max(f_score_raw, t_score_raw, s_score_raw)  # agent confidence proxy
expected_reward_correct = base_correct_reward + 0.3 × max_score
```

| Difficulty | Base | + Confidence bonus | Actual range (v2.1) |
|------------|------|--------------------|---------------------|
| easy | 1.0 | + 0.12 to 0.30 | 1.105 – 1.300 |
| medium | 1.0 | + 0.08 to 0.30 | 1.075 – 1.300 |
| hard | 1.2 | + 0.11 to 0.30 | 1.305 – 1.500 |

### Full reward function (runtime)

```python
def compute_reward(chosen_agent, correct_agent, agent_result, difficulty):
    # Base
    if chosen_agent == correct_agent:
        reward = REWARD_SCHEDULE[difficulty]["correct"]
    else:
        reward = REWARD_SCHEDULE[difficulty]["wrong"]

    # Confidence bonus (from agent's self-assessed confidence)
    reward += agent_result.confidence * 0.3

    # Execution time penalty
    if agent_result.execution_time_ms > 500:
        reward -= 0.1

    return reward
```

---

## 6. Relevance Score Profiles per Agent

Dựa trên v2.1 dataset, mỗi agent có profile score đặc trưng:

```
                    f_score_raw        t_score_raw        s_score_raw
                    mean ± std         mean ± std         mean ± std
fundamental         0.672 ± 0.237      0.298 ± 0.323      0.032 ± 0.124
technical           0.107 ± 0.223      0.874 ± 0.145      0.017 ± 0.077
screening           0.131 ± 0.244      0.128 ± 0.227      0.895 ± 0.167
```

**Đọc bảng:** Technical agent có profile rõ nhất (t_score mean 0.874, f+s gần 0).
Fundamental agent bị "nhiễu" bởi tech keywords (t_score mean 0.298) do hard mixed queries.
Screening cũng rõ (s_score mean 0.895).

**Ý nghĩa cho Q-Learning:** States mà f_score cao VÀ t_score cao (state 24, 15) là
"chiến trường" — nơi orchestrator cần nhiều training examples nhất để phân biệt.

---

## 7. MLflow Experiment Tracking Schema

### Parameters logged per run

```python
mlflow_params = {
    # Q-Learning hyperparameters
    "learning_rate":    0.15,
    "discount_factor":  0.9,
    "epsilon_start":    1.0,
    "epsilon_end":      0.01,
    "epsilon_decay":    0.995,
    # Environment
    "n_states":         27,
    "n_actions":        3,
    "n_episodes":       500,
    # Dataset
    "train_size":       112,
    "test_size":        28,
    "dataset_version":  "v2.1",
    "unique_states":    16,
    "intent_categories": 17,
    # Quality
    "min_quality_score": 0.6,
    "mean_quality_score": 0.888,
}
```

### Metrics logged per episode

```python
mlflow_metrics_per_ep = {
    "episode_reward":        float,   # total reward this episode
    "episode_accuracy":      float,   # % correct routing
    "epsilon":               float,   # current exploration rate
    "q_value_max":           float,   # max Q-value in table
    "q_value_mean":          float,   # mean Q-value across non-zero entries
    "q_value_std":           float,   # stability indicator
}
```

### Metrics logged at end

```python
mlflow_metrics_final = {
    # Accuracy targets
    "test_accuracy":                    float,   # target > 85%
    "test_accuracy_easy":               float,   # target > 95%
    "test_accuracy_medium":             float,   # target > 80%
    "test_accuracy_hard":               float,   # target > 70%
    # Convergence
    "convergence_episode_70pct":        int,
    "convergence_episode_85pct":        int,     # target < 200
    # Stability
    "final_50ep_accuracy_mean":         float,
    "final_50ep_accuracy_std":          float,   # target < 3%
    # Coverage
    "state_coverage_pct":               float,   # % of 27 states visited
    "states_with_correct_policy":       int,     # states where argmax Q = correct
    # Per-agent breakdown
    "routing_accuracy_fundamental":     float,
    "routing_accuracy_technical":       float,
    "routing_accuracy_screening":       float,
}
```

### Artifacts

```python
mlflow_artifacts = {
    "q_table.npy":                  "numpy array shape (27, 3)",
    "confusion_matrix.csv":         "3×3 true vs predicted agents",
    "training_curve.png":           "accuracy & reward per episode",
    "state_coverage.json":          "which states visited, count per state",
    "dataset_enriched.csv":         "v2.1 dataset with all 18 columns",
    "validation_report.json":       "6-standard compliance report",
}
```

---

## 8. Validation Pipeline

```
dataset_orchestrator_v2_final.csv (18 cols, 140 rows)
        │
        ▼
[validate_prompt_standards()]
  ├─ Chuẩn 1: intent clarity     → 4 violations (all hard, OK)
  ├─ Chuẩn 2: length 20-120      → 0 violations ✅
  ├─ Chuẩn 3: keyword coverage   → 0 violations ✅
  ├─ Chuẩn 4: state coverage     → 16/27 states (structural limit)
  ├─ Chuẩn 5: class balance      → fund 42.9% (slightly high)
  └─ Chuẩn 6: label consistency  → 0 contradictions ✅
        │
        ▼
[Quality Gate]
  └─ prompt_quality_score ≥ 0.6 for ALL rows → 140/140 pass ✅
        │
        ▼
[Train/Test Split]   80/20 stratified by correct_agent
  ├─ Train: 112 rows
  └─ Test:  28 rows
        │
        ▼
[train_q_learning() + mlflow.log_*()]
        │
        ▼
[MLflow UI: localhost:5000]
```

---

## 9. Template Design Strategy (NEW — bài học từ v1)

### Vấn đề v1: 1 keyword/template → intent clarity thấp

```
v1 template: "Chỉ số P/E của {t} hiện tại là bao nhiêu?"
→ f_score_raw = 0.35 (chỉ match "P/E")
→ Với easy query: cần dominant ≥ 0.4, KHÔNG ĐẠT
```

### Giải pháp v2.1: 2+ keywords/template cho easy/medium

```
v2.1 template: "Chỉ số P/E và ROE của {t} hiện tại bao nhiêu?"
→ f_score_raw = 0.60 (match "P/E" + "ROE")
→ Với easy query: dominant 0.60 ≥ 0.4, ratio 0.60/0.0 = ∞ ≥ 2.0, ĐẠT ✅
```

### Quy tắc template theo difficulty

| Difficulty | Quy tắc keywords | Ví dụ |
|------------|-------------------|-------|
| easy | 2+ keywords từ **1 agent duy nhất**, 0 từ agent khác | "RSI và MACD cho tín hiệu gì?" |
| medium | 1-2 keywords từ agent chính, cho phép 0-1 từ secondary | "RSI cho tín hiệu gì ở vùng hiện tại?" |
| hard | 1+ keywords từ **2 agents**, tạo mixed intent | "P/E thấp nhưng RSI cao, ưu tiên gì?" |

### Template toolkit (for generating new queries)

```python
# Easy: nhúng 2+ keywords cùng agent, dùng "và" connector
"[KW1] và [KW2] của {ticker} [câu hỏi]?"

# Medium: 1 keyword mạnh + context
"[KW1] của {ticker} [hành động cụ thể]?"

# Hard: keywords từ 2 agents + từ nối mâu thuẫn
"{ticker} có [FUND_KW] [tốt/xấu] nhưng [TECH_KW] [ngược lại], nên [hành động]?"
```

---

## 10. Known Limitations & Phase 2 Migration Path

### Giới hạn PoC hiện tại

| Giới hạn | Ảnh hưởng | Giải pháp Phase 2 |
|-----------|-----------|-------------------|
| 16/27 states covered | 11 states không có training data | DQN: state = continuous embedding |
| Keyword matching chỉ đếm | "tôi muốn biết về tình hình tài chính" bị miss | Sentence-transformer encoding |
| State 6 chiếm 21.4% | Q-table lệch, overfit state này | Continuous state → tự cân bằng |
| Chỉ 3 actions (discrete) | Không thể multi-agent routing | PPO: action = probability over agents |
| Synthetic data | Không reflect user behavior thật | Real user logs + human annotation |
| 140 rows | Quá nhỏ cho complex patterns | 1000+ rows từ production logs |

### Migration path: v2.1 → DQN Phase 2

```python
# Thay đổi 1: State encoding
# PoC:  state = keyword_discretize(query) → int 0-26
# DQN:  state = sentence_transformer.encode(query) → float[384]
#        + concat([mentioned_tickers, has_attachment, session_turn])
#        → float[387]

# Thay đổi 2: Q-function
# PoC:  Q-table[27][3] → lookup
# DQN:  Q-network(state_387d) → 3 action values

# Thay đổi 3: Dataset columns needed
# DQN chỉ cần: query, correct_agent, difficulty, metadata
# KHÔNG cần: f_score_raw, f_level, state_id (computed by network)
# NHƯNG GIỮ: intent_category, prompt_quality_score (for analysis)
```

### Các cột dataset tồn tại qua Phase 2

| Cột | Phase 1 (Q-Learning) | Phase 2 (DQN) | Phase 3 (PPO) |
|-----|---------------------|---------------|---------------|
| query | ✅ input | ✅ input | ✅ input |
| correct_agent | ✅ label | ✅ label | ✅ primary label |
| difficulty | ✅ reward scaling | ✅ analysis | ✅ analysis |
| f/t/s_score_raw | ✅ state features | ❌ replaced by embedding | ❌ |
| state_id | ✅ Q-table index | ❌ continuous state | ❌ |
| intent_category | ✅ analysis | ✅ analysis | ✅ sub-routing |
| prompt_quality_score | ✅ quality gate | ✅ quality gate | ✅ quality gate |
| metadata_json | ❌ not in PoC | ✅ rich context | ✅ rich context |
| agent_config_json | ❌ not in PoC | ✅ action config | ✅ action config |

---

## 11. Quick Reference

| # | Chuẩn | Tiêu chí | Target | v2.1 Result |
|---|-------|----------|--------|-------------|
| 1 | Intent Clarity | `dominant / 2nd ≥ ratio` | ratio ≥ 1.5 (med) | 4 violations (hard only) |
| 2 | Valid Length | `20 ≤ len ≤ 120` | hard fail ngoài range | 0 violations ✅ |
| 3 | Keyword Coverage | `max(scores) ≥ 0.15` | warn nếu thấp | 0 violations ✅ |
| 4 | State Coverage | `unique states ≥ 18` | 67% of 27 | 16/27 (structural limit) |
| 5 | Class Balance | `\|freq - target\| ≤ 5%` | ±5% từ target | fund +7.9% (acceptable) |
| 6 | Label Consistency | no contradictions | 0 violations | 0 violations ✅ |

**Quality gate:** `prompt_quality_score ≥ 0.6` → 140/140 pass (100%) ✅

**Quality score stats:** mean=0.888, std=0.134, min=0.680, max=1.000

---

*Version: v2.1 | Ngày: 29/03/2026 | Phase: PoC (Q-Learning tabular)*
*Predecessor: v1 (28/03/2026) — 44 violations → v2.1: 4 violations*
*Dataset: dataset_orchestrator_v2_final.csv (140 rows × 18 cols)*
*Scripts: generate_v2_standards.py, generate_v2_final.py*
