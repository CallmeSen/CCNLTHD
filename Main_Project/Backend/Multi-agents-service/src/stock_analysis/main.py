import os
import sys


# def _configure_console_encoding() -> None:
#     """Ensure UTF-8 console output to avoid charmap errors on Windows terminals."""
#     os.environ.setdefault("PYTHONUTF8", "1")
#     os.environ.setdefault("PYTHONIOENCODING", "utf-8")

#     for stream_name in ("stdout", "stderr"):
#         stream = getattr(sys, stream_name, None)
#         if stream is not None and hasattr(stream, "reconfigure"):
#             try:
#                 stream.reconfigure(encoding="utf-8", errors="replace")
#             except Exception:
#                 # Keep execution robust even in terminals that do not support reconfigure.
#                 pass


# _configure_console_encoding()

from crew import StockAnalysisCrew

def run():
    inputs = {
        'query': 'What is the company you want to analyze?',
        'company_stock': 'AMZN',
    }
    return StockAnalysisCrew().crew().kickoff(inputs=inputs)

def train():
    """
    Train the crew for a given number of iterations.
    """
    inputs = {
        'query': 'What is last years revenue',
        'company_stock': 'AMZN',
    }
    try:
        StockAnalysisCrew().crew().train(n_iterations=int(sys.argv[1]), inputs=inputs)

    except Exception as e:
        raise Exception(f"An error occurred while training the crew: {e}")
    
if __name__ == "__main__":
    print("## Welcome to Stock Analysis Crew")
    print('-------------------------------')
    result = run()
    print("\n\n########################")
    print("## Here is the Report")
    print("########################\n")
    print(result)