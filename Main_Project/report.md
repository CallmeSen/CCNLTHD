## Cấu trúc hệ thống AI agent
1) Kiến trúc runtime đang chạy (main.py, crew.py)
Entrypoint: main.py → run() → StockAnalysisCrew().crew().kickoff(inputs=...)
Orchestration: Crew chạy theo Process.sequential
Agent roles cấu hình (config/agents.yaml):
financial_analyst
research_analyst
investment_advisor
Task flow (config/tasks.yaml):
financial_analysis
research
filings_analysis
recommend (tổng hợp và đưa khuyến nghị cuối)
2) Kiến trúc mục tiêu trong tài liệu dự án (architecture.md)
RL Orchestrator là policy learner để route query đến agent phù hợp
Bản chất: Sequential Decision Making
Agent contract chuẩn có AgentResult(confidence, execution_time_ms, result, ...)
Lộ trình: Q-Learning → DQN → PPO
## Công nghệ sử dụng các luồng
Orchestration: CrewAI
LLM runtime: Ollama local (model="ollama/openhermes", base_url="http://localhost:11434")
Web retrieval:
requests + BeautifulSoup
fallback Browserless API nếu trang cần JS
Embedding semantic search:
sentence-transformers (all-MiniLM-L6-v2)
vector store in-memory + cosine similarity
Math parsing: calculator an toàn qua ast (không eval trực tiếp)
Env management: python-dotenv
Packaging/runner: uv, Python virtual environment
## Tool sử dụng (trong luồng agent)
Trong run thực tế, hệ thống expose 3 tool chính:

web_search_and_read_tool

Input: website_url (bắt buộc), search_query (tuỳ chọn)
Output: đoạn văn liên quan theo semantic search
browserless_web_scraper

Input: website_url
Output: nội dung scrape từ trang có JS rendering
calculator_tool

Input: operation (biểu thức toán học hợp lệ)
Output: kết quả tính toán hoặc lỗi validation
## Định dạng input / output
Input vào crew (main.py)
Input task template (tasks.yaml)
{company_stock} được inject vào mô tả task để phân tích theo ticker cụ thể.
Output cuối
kickoff(...) trả về report text (chuỗi dài), in ra dưới block:
Here is the Report:
Nội dung là tổng hợp tài chính + tin tức + khuyến nghị đầu tư.
## Các độ đo đề cập
Theo metrics.md, các nhóm metric chính:

Orchestrator:
routing_accuracy, routing_accuracy_by_difficulty, cumulative_reward, convergence_episode, exploration_efficiency, q_value_stability, multi_agent_precision, end_to_end_latency_p95.

Fundamental Agent:
valuation_accuracy, ratio_completeness, sector_ranking_ndcg, signal_precision, latency_p95_ms.

Technical Agent:
signal_accuracy, trend_detection_f1, indicator_coverage, support_resistance_mae, pattern_recognition_precision, latency_p95_ms.

Screening Agent:
filter_precision, ranking_ndcg_at_10, coverage, comparison_accuracy, response_relevance, latency_p95_ms.

PoC hiện tại (tài liệu):

Overall accuracy: 82.1%
By difficulty: easy 100%, medium 81.8%, hard 78.6%
Last 50 episodes avg: 86.0% ± 1.8%