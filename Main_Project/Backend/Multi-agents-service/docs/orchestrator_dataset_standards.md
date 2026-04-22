# Chuẩn hóa Dataset Orchestrator cho Q-Learning PoC

> Tài liệu này định nghĩa các tiêu chuẩn thiết kế prompt người dùng trong
> `dataset_orchestrator.csv` để áp dụng cho MLflow workflow với thuật toán Q-Learning.

---

## 1. Tổng quan: Mapping giữa Dataset và Q-Learning

Mỗi hàng trong dataset orchestrator ánh xạ trực tiếp đến một vòng lặp Q-Learning:

```
User Query (row)
    │
    ▼
[State Extraction]          → state_id (0–26)   = Q-table ROW
    │
    ▼
[Action Selection ε-greedy] → correct_action_idx (0/1/2) = Q-table COLUMN
    │
    ▼
[Reward Computation]        → expected_reward_correct ∈ {+1.0 … +1.3}
    │
    ▼
[Q-table Update]            Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') − Q(s,a)]
```

---

## 2. Schema mở rộng (Extended Schema)

### Cột hiện tại (v1 – 7 cột)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `query` | str | Câu hỏi tiếng Việt của người dùng |
| `correct_agent` | str | fundamental / technical / screening |
| `difficulty` | str | easy / medium / hard |
| `query_length` | int | Số ký tự của query |
| `mentioned_tickers` | int | Số tickers được đề cập |
| `has_attachment` | bool | Có file đính kèm hay không |
| `attachment_type` | str | csv / pdf / xlsx / (rỗng) |

### Cột mở rộng cho Q-Learning (v2 – thêm 10 cột)
| Cột | Kiểu | Vai trò trong Q-Learning | Giá trị |
|-----|------|--------------------------|---------|
| `f_score_raw` | float | Điểm relevance thô – Fundamental | 0.0 – 1.0 |
| `t_score_raw` | float | Điểm relevance thô – Technical | 0.0 – 1.0 |
| `s_score_raw` | float | Điểm relevance thô – Screening | 0.0 – 1.0 |
| `f_level` | int | Chiều 1 của state (discretized) | 0=low, 1=med, 2=high |
| `t_level` | int | Chiều 2 của state (discretized) | 0=low, 1=med, 2=high |
| `s_level` | int | Chiều 3 của state (discretized) | 0=low, 1=med, 2=high |
| `state_id` | int | **Q-table row index** | 0 – 26 |
| `correct_action_idx` | int | **Q-table optimal column** | 0=fund, 1=tech, 2=screen |
| `expected_reward_correct` | float | Reward khi chọn đúng | 1.0 – 1.3 |
| `intent_category` | str | Sub-category ý định | xem §3 |
| `prompt_quality_score` | float | Điểm chất lượng tổng hợp | 0.0 – 1.0 |

### Công thức state_id
```python
state_id = f_level * 9 + t_level * 3 + s_level
# → 3^3 = 27 states, index 0–26
```

---

## 3. 6 Chuẩn cho Prompt (Prompt Standards)

### Chuẩn 1 – Rõ ràng ý định (Intent Clarity)
**Điều kiện:** `max(f_score_raw, t_score_raw, s_score_raw) ≥ 0.15`

- Query phải chứa ít nhất 1 keyword thuộc domain tài chính.
- Với **easy/medium**: agent đúng phải score cao nhất VÀ ≥ 1.5× score thứ hai.
- Với **hard**: cho phép 2 agent cùng score cao (mixed-intent).

| Difficulty | Yêu cầu clarity |
|------------|----------------|
| easy | dominant_score ≥ 0.4, ratio dominant/2nd ≥ 2.0 |
| medium | dominant_score ≥ 0.25, ratio ≥ 1.5 |
| hard | dominant_score ≥ 0.15, không giới hạn ratio |

---

### Chuẩn 2 – Độ dài hợp lệ (Valid Length) — PoC scope
```
20 ≤ query_length ≤ 120 ký tự
```
- `< 20`: Quá ngắn, thiếu từ khoá để extract state.
- `> 120`: Quá dài cho PoC tabular Q-Learning; để DQN (Phase 2) xử lý.

---

### Chuẩn 3 – Phủ từ khóa (Keyword Coverage)

Mỗi query phải chứa ít nhất **1 từ khoá** từ bộ từ điển của agent tương ứng:

#### Fundamental keywords (30+ terms)
```
PE, P/E, ROE, EPS, ROA, doanh thu, revenue, lợi nhuận, profit,
báo cáo tài chính, financial, cổ tức, dividend, yield,
giá trị nội tại, intrinsic, book value, P/B, biên lợi nhuận,
margin, nợ, debt, equity, balance sheet, income statement,
cash flow, DCF, định giá, valuation, fundamental
```

#### Technical keywords (30+ terms)
```
MA, SMA, EMA, RSI, MACD, Bollinger, xu hướng, trend,
hỗ trợ, kháng cự, support, resistance, nến, candlestick,
chart, biểu đồ, volume, khối lượng, breakout, momentum,
stochastic, fibonacci, đường trung bình, tín hiệu,
entry, exit, technical, pattern
```

#### Screening keywords (25+ terms)
```
lọc, filter, sàng lọc, screen, so sánh, compare,
top, tốt nhất, best, xếp hạng, ranking, ngành, sector,
industry, danh sách, list, tiêu chí, tìm, find, recommend,
gợi ý, đề xuất, portfolio, penny stock
```

---

### Chuẩn 4 – Phủ state space (State Space Coverage)

Training set (≥ 112 rows) phải đảm bảo:
- ≥ **18/27 states** được cover (67% coverage).
- Mỗi state được cover phải có ≥ **2 training examples**.
- Không có state nào chiếm > **20%** tổng số rows.

Các state "vàng" (high-value, thường xảy ra nhất):
```
State 18 = (2,0,0) → query rõ là Fundamental       → correct_agent = fundamental
State  2 = (0,0,2) → query rõ là Screening          → correct_agent = screening
State  6 = (0,2,0) → query rõ là Technical           → correct_agent = technical
State 14 = (1,1,2) → hard mixed (fund+screen)        → correct_agent = screening
State 16 = (1,2,1) → hard mixed (tech+fund)          → correct_agent = fundamental
```

---

### Chuẩn 5 – Cân bằng nhãn (Class Balance)
```
Fundamental : Technical : Screening = 35% : 30% : 35%   (±5%)
easy : medium : hard = 25% : 40% : 35%
```
Lý do: Technical queries thường rõ ràng hơn (keyword-specific) nên ít data hơn vẫn học tốt.

---

### Chuẩn 6 – Nhất quán nhãn (Label Consistency)
- Cùng template query với ticker khác nhau → **cùng correct_agent**.
- Ví dụ: `"RSI của [X] ở vùng quá mua?"` → luôn là `technical`.
- Không annotate cùng query text với 2 nhãn khác nhau (không có duplicates có nhãn mâu thuẫn).

---

## 4. Intent Category (Sub-categories)

### Fundamental sub-categories
| intent_category | Ví dụ query |
|-----------------|-------------|
| `fund_valuation` | "Đánh giá giá trị nội tại VNM bằng DCF" |
| `fund_ratio` | "EPS/ROE/PE của VCB là bao nhiêu?" |
| `fund_financial_statement` | "Phân tích báo cáo tài chính quý 3 FPT" |
| `fund_dividend` | "Cổ tức VNM có hấp dẫn không?" |
| `fund_comparison` | "Net margin MSN so với ngành" |
| `fund_mixed` | "HDB ra báo cáo tốt, chart có ủng hộ?" ← hard |

### Technical sub-categories
| intent_category | Ví dụ query |
|-----------------|-------------|
| `tech_indicator` | "RSI/MACD/Stochastic cho tín hiệu gì?" |
| `tech_trend` | "MA50 và MA200 của CTG đang thế nào?" |
| `tech_pattern` | "Double top/bottom của PLX?" |
| `tech_entry_exit` | "Điểm entry mua SAB" |
| `tech_volume` | "Volume profile VIC vùng giá quan trọng?" |

### Screening sub-categories
| intent_category | Ví dụ query |
|-----------------|-------------|
| `screen_filter` | "Filter market cap trên 50 nghìn tỷ" |
| `screen_rank` | "Xếp hạng ngành Technology theo PE" |
| `screen_recommend` | "Gợi ý 5 cổ phiếu cho người mới" |
| `screen_compare` | "So sánh VNM và FPT - mã nào tốt hơn?" |
| `screen_portfolio` | "Đề xuất portfolio 10 mã ngân sách 100tr" |

---

## 5. Reward Design cho từng intent_category

```python
# Reward schedule theo difficulty và intent
REWARD_SCHEDULE = {
    "easy":   {"correct": +1.0, "wrong": -0.5},
    "medium": {"correct": +1.0, "wrong": -0.5},
    "hard":   {"correct": +1.2, "wrong": -0.3},  # harder = higher reward, softer penalty
}

# Confidence bonus từ agent
# reward_total = base_reward + agent.confidence * 0.3

# Execution time penalty
# if execution_time_ms > 500: reward -= 0.1
```

### expected_reward_correct computation
```python
expected_reward_correct = base_correct_reward + 0.3 * avg_confidence_penalty
# easy/medium: ~1.0 – 1.25
# hard: ~1.1 – 1.4
```

---

## 6. MLflow Experiment Tracking Schema

```python
# Experiment: "RL-Orchestrator-PoC"

# Parameters logged per run:
mlflow_params = {
    "learning_rate":    0.1,
    "discount_factor":  0.95,
    "epsilon_start":    1.0,
    "epsilon_end":      0.01,
    "epsilon_decay":    0.995,
    "n_states":         27,
    "n_actions":        3,
    "n_episodes":       500,
    "train_size":       112,     # 80% of 140
    "test_size":        28,      # 20% of 140
    "dataset_version":  "v2",    # v2 = enriched with state columns
}

# Metrics logged per episode:
mlflow_metrics_per_ep = {
    "episode_reward":        float,   # total reward this episode
    "episode_accuracy":      float,   # % correct routing this episode
    "epsilon":               float,   # current exploration rate
    "q_value_max":           float,   # max Q-value in table
    "q_value_mean":          float,   # mean Q-value in table
}

# Metrics logged at end:
mlflow_metrics_final = {
    "test_accuracy":                    float,   # target > 85%
    "test_accuracy_easy":               float,   # target > 95%
    "test_accuracy_medium":             float,   # target > 80%
    "test_accuracy_hard":               float,   # target > 70%
    "convergence_episode":              int,     # first ep reaching 85%
    "final_50ep_accuracy_mean":         float,
    "final_50ep_accuracy_std":          float,
    "state_coverage":                   float,   # % of 27 states visited
    "routing_accuracy_fundamental":     float,
    "routing_accuracy_technical":       float,
    "routing_accuracy_screening":       float,
}

# Artifacts:
mlflow_artifacts = {
    "q_table.npy":              "numpy array shape (27,3)",
    "confusion_matrix.csv":     "3×3 true vs predicted agents",
    "training_curve.png":       "accuracy & reward per episode",
    "state_coverage.json":      "which states were visited",
    "dataset_enriched.csv":     "v2 dataset with state columns",
}
```

---

## 7. Validation Pipeline (Kiểm tra chuẩn trước khi train)

```
dataset_orchestrator.csv
        │
        ▼
[validate_prompt_standards()]
  ├─ Chuẩn 1: check intent clarity    → mark low-quality rows
  ├─ Chuẩn 2: check length 20-120     → flag out-of-range
  ├─ Chuẩn 3: check keyword coverage  → warn zero-keyword rows
  ├─ Chuẩn 4: check state coverage    → report state distribution
  ├─ Chuẩn 5: check class balance     → report label skew
  └─ Chuẩn 6: check label consistency → detect contradictions
        │
        ▼
[enrich_dataset()]
  ├─ Compute f_score_raw, t_score_raw, s_score_raw
  ├─ Discretize → f_level, t_level, s_level
  ├─ Compute state_id = f*9 + t*3 + s
  ├─ Map correct_agent → correct_action_idx
  ├─ Compute expected_reward_correct
  ├─ Classify intent_category
  └─ Score prompt_quality_score
        │
        ▼
[dataset_orchestrator_v2.csv]    ← input đầu vào cho Q-Learning training
        │
        ▼
[train_q_learning() + mlflow.log_*()]
        │
        ▼
[MLflow UI: localhost:5000]
```

---

## 8. Tóm tắt Chuẩn (Quick Reference)

| # | Chuẩn | Tiêu chí kiểm tra | Threshold |
|---|-------|-------------------|-----------|
| 1 | Intent Clarity | `max(scores) / second_max ≥ ratio` | ratio ≥ 1.5 (medium) |
| 2 | Valid Length | `20 ≤ len(query) ≤ 120` | hard fail ngoài range |
| 3 | Keyword Coverage | `max(scores) ≥ 0.15` | warn nếu thấp hơn |
| 4 | State Coverage | `len(unique states) ≥ 18` | 67% of 27 states |
| 5 | Class Balance | `|agent_freq - 0.33| ≤ 0.05` | ±5% từ uniform |
| 6 | Label Consistency | no duplicate query → different label | 0 violations |

**Dataset quality gate:** `prompt_quality_score ≥ 0.6` cho tất cả rows training.

---

*Version: v2 | Ngày: 28/03/2026 | Phase: PoC (Q-Learning tabular)*
