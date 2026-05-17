# cấu trúc thư mục
```
app/
├─ main.py
├─ api/
│  ├─ routes.py
│  ├─ schemas.py
│  └─ dependencies.py
├─ graphs/
│  ├─ root/
│  │  ├─ graph.py
│  │  ├─ router.py
│  │  ├─ state.py
│  │  └─ policies.py
│  ├─ workflows/
│  │  ├─ intake/
│  │  │  ├─ graph.py
│  │  │  ├─ state.py
│  │  │  ├─ nodes.py
│  │  │  ├─ routes.py
│  │  │  └─ prompts/
│  │  ├─ research/
│  │  │  ├─ graph.py
│  │  │  ├─ state.py
│  │  │  ├─ nodes/
│  │  │  ├─ routes.py
│  │  │  ├─ tools.py
│  │  │  └─ prompts/
│  │  ├─ portfolio_analysis/
│  │  │  ├─ graph.py
│  │  │  ├─ state.py
│  │  │  ├─ nodes/
│  │  │  ├─ routes.py
│  │  │  ├─ calculators.py
│  │  │  └─ prompts/
│  │  ├─ risk_review/
│  │  │  ├─ graph.py
│  │  │  ├─ state.py
│  │  │  ├─ nodes.py
│  │  │  ├─ routes.py
│  │  │  └─ prompts/
│  │  └─ reporting/
│  │     ├─ graph.py
│  │     ├─ state.py
│  │     ├─ nodes.py
│  │     ├─ templates/
│  │     └─ prompts/
│  └─ shared/
│     ├─ base_state.py
│     ├─ messages.py
│     ├─ command_helpers.py
│     └─ graph_utils.py
├─ agents/
│  ├─ supervisor/
│  │  ├─ node.py
│  │  ├─ prompt.py
│  │  └─ schema.py
│  ├─ researcher/
│  ├─ allocator/
│  ├─ risk/
│  ├─ reviewer/
│  └─ reporter/
├─ tools/
│  ├─ market_data/
│  ├─ filings/
│  ├─ portfolio_db/
│  ├─ search/
│  └─ notifications/
├─ memory/
│  ├─ checkpoint.py
│  ├─ store.py
│  └─ thread_context.py
├─ config/
│  ├─ settings.py
│  ├─ models.py
│  └─ feature_flags.py
├─ observability/
│  ├─ tracing.py
│  ├─ metrics.py
│  └─ logging.py
├─ evals/
│  ├─ routing/
│  ├─ workflow/
│  └─ regression/
└─ tests/
   ├─ unit/
   ├─ integration/
   └─ graph_snapshots/
```