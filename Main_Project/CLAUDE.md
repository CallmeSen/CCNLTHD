# RL-Based Agent Orchestrator for Investment Chatbot

## What this project is
An ML/OPS system that uses Reinforcement Learning to orchestrate specialized AI agents (skills) for investment analysis. A user sends a query + optional financial documents → an RL orchestrator routes the query to the right agent(s) → agents execute and return results.

Think of it as: **an intelligent router that learns which "expert" to call for each type of investment question.**

## Architecture overview
```
User prompt + files
       ↓
RL Orchestrator (Q-Learning / DQN)
  state = query features + context
  action = select agent(s)
       ↓
┌─────────────┬─────────────┬──────────────┐
│ Fundamental  │  Technical   │  Screening   │
│ Agent        │  Agent       │  Agent       │
│ PE,ROE,EPS   │ RSI,MACD,MA  │ Filter,Rank  │
└─────────────┴─────────────┴──────────────┘
       ↓
  Reward signal → update Q(s,a)
```

## Current phase: PoC (Phase 1)
- Q-Learning with discretized state space (27-81 states)
- 3 simulated agents (Fundamental, Technical, Screening)
- Synthetic dataset (Vietnamese stock market: 30 tickers, HOSE)
- Target: routing accuracy > 85%, convergence < 200 episodes

## Key decisions made
- **Algorithm**: Q-Learning tabular → upgrade path to DQN → PPO
- **State encoding**: keyword relevance scores discretized to 3 levels per agent = 3^3 = 27 states
- **Reward design**: +1.0 correct routing, -0.5 wrong, +0.3×confidence bonus, -0.1 slow execution
- **ε-greedy exploration**: ε starts at 1.0, decays 0.995/episode to 0.01
- **Agents are microservices** (not neurons) — each is a complete service with its own logic and data

## Tech stack
- Python 3.10+ (NumPy, Pandas for PoC)
- MLflow for experiment tracking
- GitLab CI/CD for pipeline
- ArgoCD for K8s deployment (Phase 3)
- Future: sentence-transformers for text embeddings in DQN

## Project structure
```
├── CLAUDE.md                          # This file (project memory)
├── .claude/
│   └── rules/
│       ├── architecture.md            # System design decisions
│       ├── datasets.md                # Dataset specs & EDA findings
│       └── metrics.md                 # Evaluation metrics per agent
├── docs/
│   └── context_from_claude_chat.md    # Full research context from initial exploration
├── src/
│   ├── agents/
│   │   ├── fundamental_agent.py       # PE, ROE, EPS, DCF analysis
│   │   ├── technical_agent.py         # RSI, MACD, MA, Bollinger
│   │   └── screening_agent.py         # Filter, rank, compare stocks
│   ├── orchestrator/
│   │   ├── q_learning.py              # Q-Learning orchestrator
│   │   ├── feature_extraction.py      # Query → state encoding
│   │   └── reward.py                  # Reward function design
│   └── data/
│       ├── generate_datasets.py       # Synthetic data generation
│       └── eda.py                     # EDA utilities
├── data/
│   ├── dataset_fundamental.csv        # 240 rows × 18 cols
│   ├── dataset_technical.csv          # 15,120 rows × 29 cols
│   ├── dataset_screening.csv          # 30 rows × 23 cols
│   └── dataset_orchestrator.csv       # 140 rows × 7 cols
├── notebooks/
│   ├── 01_poc_orchestrator.py         # Original PoC (Q-Learning)
│   └── 02_datasets_eda_metrics.py     # Dataset generation + EDA
└── README.md
```

## Coding conventions
- Language: Python, type hints preferred
- Docstrings: Google style, Vietnamese comments OK for business logic
- Data: Pandas DataFrames for tabular, NumPy arrays for numeric
- Naming: snake_case for everything, UPPER_CASE for constants
- Each agent must implement `execute(query, context) -> AgentResult`
- Always log experiments with MLflow-compatible metrics

## Important context
- Vietnamese stock market tickers (HOSE): VNM, FPT, VCB, HPG, VIC, MWG, MSN, TCB, etc.
- Banking sector has D/E ratio 5-15 (normal), other sectors 0.1-4.0
- PE must be normalized by sector — cross-sector PE comparison is meaningless
- EPS distribution is heavily right-skewed (skew=+2.44) — needs log-transform
- Gross margin ↔ Net margin correlation = 0.848 — drop one to avoid multicollinearity

## Roadmap
- Phase 1: PoC notebook ← **current**
- Phase 2: DQN + real API (VNDirect, SSI) + MLflow + Docker
- Phase 3: Microservices on K8s + ArgoCD + PPO/SAC
- Phase 4: Online RL + human feedback + multi-step agent chains
