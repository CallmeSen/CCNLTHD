"""CLI entry point cho Stock Analysis PoC.

Usage:
    uv run stock_analysis              # dùng ticker mặc định FPT
    uv run stock_analysis VNM          # phân tích VNM
    uv run stock_analysis VCB "Ngành ngân hàng đang biến động ra sao?"
"""
import sys

from stock_analysis.crew import StockAnalysisCrew

DEFAULT_TICKER = "FPT"
DEFAULT_QUERY = "Đưa ra khuyến nghị đầu tư cho cổ phiếu này trong 1-3 tháng tới."


def run() -> str:
    ticker = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_TICKER
    query = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_QUERY

    inputs = {
        "company_stock": ticker.upper(),
        "query": query,
    }

    print("## Stock Analysis Crew — VN market")
    print(f"## Ticker: {inputs['company_stock']}")
    print(f"## Query : {inputs['query']}")
    print("-" * 60)

    result = StockAnalysisCrew().crew().kickoff(inputs=inputs)

    print("\n" + "#" * 40)
    print("## Báo cáo cuối cùng")
    print("#" * 40 + "\n")
    print(result)
    return result


def train() -> None:
    """Train the crew for a given number of iterations.

    Usage: uv run train <n_iterations> [ticker]
    """
    if len(sys.argv) < 2:
        raise SystemExit("Usage: train <n_iterations> [ticker]")

    n = int(sys.argv[1])
    ticker = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_TICKER

    inputs = {
        "company_stock": ticker.upper(),
        "query": DEFAULT_QUERY,
    }
    try:
        StockAnalysisCrew().crew().train(n_iterations=n, inputs=inputs)
    except Exception as e:
        raise Exception(f"An error occurred while training the crew: {e}")


if __name__ == "__main__":
    run()
