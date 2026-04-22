# Architecture decisions

## Core concept: RL as orchestrator
The system is NOT a single neural network. It is a **policy learner** that routes queries to independent agent services.

- Each agent = independent microservice (in production) or Python class (in PoC)
- Orchestrator = RL agent that learns: given this query type → call which agent(s)
- This is a Sequential Decision Making problem, not a classification problem

## Why Reinforcement Learning (not supervised classification)?
- RL can learn from delayed rewards (user satisfaction after full pipeline)
- RL handles multi-step routing (call agent A, then B based on A's result)
- RL naturally balances exploration (try new routings) vs exploitation (use best known)
- Supervised classification only maps input→label; RL optimizes a full reward signal

## Agent interface contract
Every agent MUST implement:
```python
class AgentResult:
    agent_name: str
    confidence: float      # 0-1
    result: dict
    execution_time_ms: float

class BaseAgent:
    name: str
    keywords: list[str]
    def execute(query: str, context: dict = None) -> AgentResult
    def _calculate_relevance(query: str) -> float
```

## State space design
- PoC: discrete states from keyword relevance scores
  - 3 agents × 3 levels (low/med/high) = 27 states
  - With metadata (has_attachment): 27 × 2 = 54 states (extended to 81)
- Production: continuous state from sentence-transformer embeddings → DQN

## Reward function design (critical — this shapes agent behavior)
```
reward = 0.0
if correct_routing: reward += 1.0
else: reward -= 0.5
reward += confidence * 0.3          # bonus for high agent confidence
if execution_time > 500ms: reward -= 0.1  # efficiency penalty
if difficulty == "hard" and correct: reward += 0.5  # hard query bonus
if difficulty == "easy" and wrong: reward -= 0.3    # easy miss penalty
```

## Upgrade path
Q-Learning (tabular) → DQN (text embeddings) → PPO (multi-agent chains)
Each step adds complexity but keeps the same state-action-reward framework.
