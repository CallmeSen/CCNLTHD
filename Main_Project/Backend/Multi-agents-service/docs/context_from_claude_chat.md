# Context from initial research conversation (Claude.ai)

This document captures all knowledge, decisions, and insights from the initial research
conversation that defined this project. It is reference material — Claude Code should
read it when deeper context is needed but it does NOT need to be in CLAUDE.md
(too long, would waste context window).

## 1. Original vision statement (from user)

> "Khi người dùng đến với ứng dụng chatbot, họ đã có sẵn một số tiền dư muốn được đem
> đi đầu tư và cần được cân nhắc hỗ trợ phân tích đầu tư, đánh giá cổ phiếu, tài sản
> khác nhau. Ở phần đầu vào người dùng có thể thêm vào các tệp thông tin tài chính
> liên quan, báo cáo tài chính, giá đầu tư mà họ đang muốn quan tâm. Sau đó chatbot
> sẽ tự nhận biết điều phối các skill ứng với mỗi agent."

Tech stack requested: MLflow, GitLab CI/CD, ArgoCD, Reinforcement Learning for orchestration.

## 2. Key conceptual clarification: Agent vs Node

**Agent (Skill)** = a complete service with its own logic, data source, and API.
Example: Fundamental Agent receives a ticker + financial report, computes P/E, ROE, EPS,
and returns a structured result with a recommendation.

**Node in neural network** = a single arithmetic operation (weight × input + bias → activation).
It has no business meaning on its own.

The orchestrator's RL model has nodes (in DQN), but each AGENT is not a node.
The RL model learns WHICH agent to call, not how to be an agent.

## 3. The core problem formalized

This is a **Sequential Decision Making** problem:
- State s: features extracted from user query + context (file type, history, etc.)
- Action a: which agent(s) to invoke and in what order
- Reward r: quality of final response (correct routing, confidence, speed, user satisfaction)
- Policy π(s) → a: the learned mapping that maximizes cumulative reward

This is why Reinforcement Learning is the right framework:
- Supervised classification can only do input → label (no delayed reward, no multi-step)
- RL handles: exploration/exploitation, delayed rewards, sequential decisions

## 4. Scope decisions for PoC

Chose to scope down to:
- 3 agents (not N): Fundamental, Technical, Screening
- Discrete state space (not continuous): keyword relevance → 3 levels → 27 states
- Tabular Q-Learning (not DQN/PPO): simplest algorithm, easy to debug and visualize
- Synthetic data (not real API): 30 VN tickers, mô phỏng CafeF/VNDirect structure
- Single-agent routing (not multi-agent chains): choose 1 best agent per query

## 5. Dataset design rationale

### Why these 4 datasets?
1. **Fundamental** (financial statements): the raw data an FA agent needs
2. **Technical** (OHLCV + indicators): the raw data a TA agent needs
3. **Screening** (stock universe snapshot): the reference table a screener queries
4. **Orchestrator** (query → label): the training data for the RL router

### Why synthetic, not real?
- No network access in PoC environment
- Synthetic data lets us control distributions and edge cases
- Structure mirrors real data from CafeF/VNDirect exactly
- Production migration: swap data source, keep all code

### Sector profiles used for realistic generation
Banking: PE 5-18, ROE 10-25%, D/E 5-15, margin 25-55%
Technology: PE 12-30, ROE 15-35%, D/E 0.2-1.5, margin 10-30%
Real Estate: PE 8-40, ROE 5-20%, D/E 1-4, margin 15-45%
Consumer Staples: PE 15-35, ROE 20-45%, D/E 0.1-1, margin 25-50%
... (full profiles in src/data/generate_datasets.py)

## 6. EDA key findings (Fundamental dataset)

### Data quality
- 99.4% overall completeness (26 nulls out of 4,320 cells)
- Missing values only in: pb_ratio (5%), dividend_yield (3.3%), book_value (2.5%)
- Recommendation: forward-fill by previous quarter or median imputation by sector

### Distribution insights
- PE ratio: right-skewed (skew +1.10), most stocks in 8-20 range
- EPS: heavily right-skewed (skew +2.44) with fat tails (kurt +7.41) → MUST log-transform
- Net margin: approximately symmetric (skew +0.44) → safe to use as-is
- D/E: right-skewed (skew +0.99) → consider log-transform or tier encoding

### Correlation insights (for feature engineering)
- gross_margin ↔ net_margin: r = +0.848 (STRONG) → drop one to avoid multicollinearity
- D/E ↔ gross_margin: r = +0.510 (STRONG) → banking drives this (high D/E, high margin)
- PE ↔ D/E: r = -0.361 → high-debt companies get PE discount from market
- EPS ↔ revenue: r = +0.466 → expected, larger companies earn more per share
- dividend_yield is nearly uncorrelated with everything → independent signal, keep it

### Sector-specific patterns
- Consumer Staples: highest ROE (30.5%), low D/E → "quality" stocks
- Banking: 33% of dataset, D/E = 9.78 is NORMAL (leverage-based business)
- Airlines: widest PE spread (11-49) due to seasonal profit volatility
- Real Estate: PE range 8-40, most variance across cycles

### Feature engineering recommendations
1. Create `pe_sector_normalized` = ticker PE / sector average PE
2. Create `de_tier` by sector (Banking: <8=low, 8-12=med, >12=high; Others: <1=low, 1-3=med, >3=high)
3. Log-transform EPS before any modeling
4. Drop gross_margin (keep net_margin — more directly useful)
5. Add `revenue_growth_qoq` = (revenue_t - revenue_{t-1}) / revenue_{t-1}

## 7. EDA key findings (Technical dataset)

- RSI distribution is healthy: 10.8% oversold (<30), 78% neutral, 11.3% overbought (>70)
- MACD balanced: 50.8% bullish, 49% bearish
- Golden/Death crosses rare: 24 and 22 events across 15,120 rows
- Volume spikes (>2x avg) at 7.2% — good signal for breakout detection
- Daily returns: mean 7.57% annualized, std 40.81% — typical VN market volatility
- Correlation: RSI ↔ bb_position = 0.846 (redundant); volume_ratio independent of everything

## 8. Training results

### PoC v1 (45 queries, 300 episodes)
- Final train accuracy: 94.4%
- Test accuracy: 88.9% (8/9)
- Convergence: rapid after episode 150

### PoC v2 (140 queries, 500 episodes)
- Final train accuracy: 88.4%
- Test accuracy: 82.1% (23/28)
- By agent: fundamental 80%, technical 100%, screening 71.4%
- By difficulty: easy 100%, medium 81.8%, hard 78.6%
- Convergence: 70% at ep 155, 85% at ep 340
- Main errors: mixed queries ("phân tích toàn diện"), keyword-ambiguous queries

### Error analysis
Most misclassifications happen when:
1. Query has overlapping keywords across agents (e.g., "so sánh D/E" → screening or fundamental?)
2. Mixed-intent queries need both agents (solved in Phase 3 with multi-agent chains)
3. Screening keywords ("filter", "market cap") appear in fundamental context

This confirms: DQN with text embeddings (Phase 2) will improve disambiguation significantly.

## 9. Production roadmap

Phase 1 (PoC) ← CURRENT
- Q-Learning, synthetic data, 3 agents, notebook

Phase 2 (Alpha)
- DQN with sentence-transformer embeddings
- Real data from VNDirect/SSI APIs
- MLflow experiment tracking
- Dockerized single service

Phase 3 (Beta)
- Each agent = K8s microservice
- PPO/SAC for multi-agent orchestration
- GitLab CI/CD pipeline
- ArgoCD deployment
- A/B testing routing policies

Phase 4 (Production)
- Online RL (continuous learning from user feedback)
- Human-in-the-loop annotation pipeline
- Multi-step reasoning chains (agent A → agent B → synthesize)
- Dynamic agent discovery (add new agents without retraining from scratch)
