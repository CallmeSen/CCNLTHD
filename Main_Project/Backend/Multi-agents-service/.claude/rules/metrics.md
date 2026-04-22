# Evaluation metrics

## Orchestrator metrics (ML/OPS core)
- routing_accuracy: % queries routed to correct agent → target > 85%
- routing_accuracy_by_difficulty: easy > 95%, medium > 80%, hard > 70%
- cumulative_reward: total reward per episode → should increase monotonically
- convergence_episode: first episode reaching 85% accuracy → target < 200
- exploration_efficiency: reward gained per exploration step → 3x random after 100 ep
- q_value_stability: variance of Q-values in last 50 episodes → should decrease
- multi_agent_precision: correct primary agent on mixed queries → target > 60%
- end_to_end_latency_p95: query → response total time → target < 2 seconds

## Fundamental Agent metrics
- valuation_accuracy: MAPE of estimated vs market price → target < 15%
- ratio_completeness: % of financial ratios computed (not null) → target > 95%
- sector_ranking_ndcg: NDCG of within-sector ranking → target > 0.8
- signal_precision: BUY/SELL accuracy after 3 months → target > 70%
- latency_p95_ms: processing time → target < 500ms

## Technical Agent metrics
- signal_accuracy: BUY/SELL correct after N days → target > 55% (above random)
- trend_detection_f1: uptrend/downtrend classification F1 → target > 0.65
- indicator_coverage: % indicators computed (enough data window) → target > 90%
- support_resistance_mae: S/R level error as % of price → target < 3%
- pattern_recognition_precision: candlestick pattern → did predicted move happen → > 60%
- latency_p95_ms → target < 300ms

## Screening Agent metrics
- filter_precision: returned stocks match user criteria → target > 85%
- ranking_ndcg_at_10: top 10 recommendations vs expert ranking → target > 0.75
- coverage: % of stock universe scanned → target = 100%
- comparison_accuracy: A vs B correct on all dimensions → target > 90%
- response_relevance: results related to query intent → target > 80%
- latency_p95_ms → target < 800ms

## Current PoC results (Q-Learning, 500 episodes, 140 queries)
- Overall test accuracy: 82.1% (23/28)
- By agent: fundamental 80%, technical 100%, screening 71.4%
- By difficulty: easy 100%, medium 81.8%, hard 78.6%
- Convergence: 70% at ep 155, 80% at ep 246, 85% at ep 340, 90% at ep 449
- Last 50 episodes avg: 86.0% ± 1.8%
