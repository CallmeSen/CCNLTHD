"""
LangSmith dataset-based evaluation for the stock advisory workflow.

Requirements:
  - LANGCHAIN_API_KEY env var must be set
  - OPENROUTER_API_KEY env var must be set (real LLM calls)
  - TAVILY_API_KEY env var must be set (real news calls)

Run:
  pytest tests/langsmith/ -m langsmith -v

In GitLab CI:
  Set LANGCHAIN_API_KEY, OPENROUTER_API_KEY, TAVILY_API_KEY as CI variables.
  Job is `when: manual` to avoid accidental token spend.
"""
import os
import pytest

DATASET_NAME = "invest-advisor-advisory-v1"
LANGSMITH_PROJECT = os.getenv("LANGCHAIN_PROJECT", "invest-advisor-ci")
MIN_PASS_SCORE = 0.70  # 70% evaluators must pass for the suite to succeed


# ── Golden test cases ──────────────────────────────────────────────────────────

GOLDEN_EXAMPLES = [
    {
        "inputs": {
            "request": "I want to invest $50,000 in technology stocks with moderate risk over 5 years.",
            "lang": "en",
        },
        "expected": {
            "must_have_portfolio": True,
            "language": "en",
            "min_assets": 2,
        },
    },
    {
        "inputs": {
            "request": "Tôi muốn đầu tư 100 triệu đồng vào cổ phiếu Việt Nam, chấp nhận rủi ro cao.",
            "lang": "vi",
        },
        "expected": {
            "must_have_portfolio": True,
            "language": "vi",
            "min_assets": 2,
        },
    },
    {
        "inputs": {
            "request": "Build a conservative portfolio with $200k, focused on dividend stocks.",
            "lang": "en",
        },
        "expected": {
            "must_have_portfolio": True,
            "language": "en",
            "min_assets": 2,
        },
    },
    {
        "inputs": {
            "request": "Phân tích danh mục đầu tư gồm VCB, FPT, HPG với vốn 50 triệu, rủi ro thấp.",
            "lang": "vi",
        },
        "expected": {
            "must_have_portfolio": True,
            "language": "vi",
            "min_assets": 2,
        },
    },
    {
        "inputs": {
            "request": "High risk portfolio: AAPL, TSLA, NVDA — invest $30k, 2 year horizon.",
            "lang": "en",
        },
        "expected": {
            "must_have_portfolio": True,
            "language": "en",
            "min_assets": 2,
        },
    },
]


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_or_create_dataset(client, name: str):
    """Return existing dataset or create one with GOLDEN_EXAMPLES."""
    existing = list(client.list_datasets(dataset_name=name))
    if existing:
        dataset = existing[0]
        # Only add examples if dataset is empty
        if not list(client.list_examples(dataset_id=dataset.id)):
            client.create_examples(
                inputs=[ex["inputs"] for ex in GOLDEN_EXAMPLES],
                outputs=[ex["expected"] for ex in GOLDEN_EXAMPLES],
                dataset_id=dataset.id,
            )
        return dataset

    dataset = client.create_dataset(name, description="Golden test cases for stock advisory workflow")
    client.create_examples(
        inputs=[ex["inputs"] for ex in GOLDEN_EXAMPLES],
        outputs=[ex["expected"] for ex in GOLDEN_EXAMPLES],
        dataset_id=dataset.id,
    )
    return dataset


def _run_advisory(inputs: dict) -> dict:
    """Target function: runs the real workflow and returns the result dict."""
    from fin_agents.core.orchestrator import OrchestratorService
    from fin_agents.db.database import SessionLocal

    db = SessionLocal()
    try:
        orchestrator = OrchestratorService(db)
        return orchestrator.run_stock_workflow(
            initial_request=inputs["request"],
            lang=inputs.get("lang", "en"),
        )
    finally:
        db.close()


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.langsmith
@pytest.mark.slow
def test_dataset_exists_or_creates():
    """Verify dataset can be created/accessed in LangSmith."""
    langsmith = pytest.importorskip("langsmith", reason="langsmith not installed")

    api_key = os.getenv("LANGCHAIN_API_KEY")
    if not api_key:
        pytest.skip("LANGCHAIN_API_KEY not set — skipping LangSmith test")

    client = langsmith.Client()
    dataset = _get_or_create_dataset(client, DATASET_NAME)
    assert dataset is not None
    assert dataset.name == DATASET_NAME

    examples = list(client.list_examples(dataset_id=dataset.id))
    assert len(examples) >= len(GOLDEN_EXAMPLES)


@pytest.mark.langsmith
@pytest.mark.slow
def test_evaluate_advisory_workflow():
    """
    Run LangSmith evaluation on the full advisory workflow.
    Asserts aggregate score >= MIN_PASS_SCORE (70%).
    """
    langsmith = pytest.importorskip("langsmith", reason="langsmith not installed")

    api_key = os.getenv("LANGCHAIN_API_KEY")
    if not api_key:
        pytest.skip("LANGCHAIN_API_KEY not set — skipping LangSmith test")

    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if not openrouter_key:
        pytest.skip("OPENROUTER_API_KEY not set — skipping LangSmith test")

    from tests.langsmith.evaluators import ALL_EVALUATORS

    client = langsmith.Client()
    dataset = _get_or_create_dataset(client, DATASET_NAME)

    results = langsmith.evaluate(
        _run_advisory,
        data=dataset,
        evaluators=ALL_EVALUATORS,
        experiment_prefix="invest-advisor",
        max_concurrency=1,
    )

    # Aggregate scores
    all_scores = []
    for result in results:
        eval_results = result.get("evaluation_results")
        if eval_results and hasattr(eval_results, "results"):
            for eval_result in eval_results.results:
                if eval_result.score is not None:
                    all_scores.append(float(eval_result.score))

    if not all_scores:
        pytest.skip("No evaluation scores returned — check LangSmith results manually")

    avg_score = sum(all_scores) / len(all_scores)
    assert avg_score >= MIN_PASS_SCORE, (
        f"LangSmith evaluation score {avg_score:.2%} < threshold {MIN_PASS_SCORE:.0%}. "
        f"View results: https://smith.langchain.com/projects/{LANGSMITH_PROJECT}"
    )
