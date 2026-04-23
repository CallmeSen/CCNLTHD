import os

from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task
from dotenv import load_dotenv

from stock_analysis.tools.custom_tools import (
    WebSearchTool,
    CalculatorTool as ImprovedCalculatorTool,
    BrowserlessTool,
)

load_dotenv()

_OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "openrouter/anthropic/claude-sonnet-4-5",
)
_OPENROUTER_FALLBACK = os.getenv(
    "OPENROUTER_FALLBACK_MODEL",
    "openrouter/google/gemini-2.0-flash-exp:free",
)

llm = LLM(
    model=_OPENROUTER_MODEL,
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    temperature=0.3,
)

_shared_embedder = None


def _get_embedder():
    global _shared_embedder
    if _shared_embedder is None:
        from stock_analysis.tools.custom_tools import SentenceTransformerEmbedder
        _shared_embedder = SentenceTransformerEmbedder(model_name="all-MiniLM-L6-v2")
        print("[TOOL INIT] SentenceTransformerEmbedder ready (all-MiniLM-L6-v2)")
    return _shared_embedder


@CrewBase
class StockAnalysisCrew:
    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    # ---------------- Agents ----------------

    @agent
    def financial_analyst_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["financial_analyst"],
            verbose=True,
            llm=llm,
            max_iter=3,
            tools=[
                WebSearchTool(embedder=_get_embedder()),
                BrowserlessTool(),
                ImprovedCalculatorTool(),
            ],
        )

    @agent
    def research_analyst_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["research_analyst"],
            verbose=True,
            llm=llm,
            max_iter=3,
            tools=[
                WebSearchTool(embedder=_get_embedder()),
                BrowserlessTool(),
            ],
        )

    @agent
    def technical_analyst_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["technical_analyst"],
            verbose=True,
            llm=llm,
            max_iter=3,
            tools=[
                WebSearchTool(embedder=_get_embedder()),
                BrowserlessTool(),
                ImprovedCalculatorTool(),
            ],
        )

    @agent
    def investment_advisor_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["investment_advisor"],
            verbose=True,
            llm=llm,
            max_iter=3,
            tools=[
                ImprovedCalculatorTool(),
            ],
        )

    # ---------------- Tasks: 3 parallel + 1 synthesizer ----------------
    # 3 task phân tích chạy song song (async_execution=True),
    # task `recommend` chờ cả 3 xong rồi tổng hợp (context=[...])

    @task
    def financial_analysis(self) -> Task:
        return Task(
            config=self.tasks_config["financial_analysis"],
            agent=self.financial_analyst_agent(),
            async_execution=True,
        )

    @task
    def research(self) -> Task:
        return Task(
            config=self.tasks_config["research"],
            agent=self.research_analyst_agent(),
            async_execution=True,
        )

    @task
    def technical_analysis(self) -> Task:
        return Task(
            config=self.tasks_config["technical_analysis"],
            agent=self.technical_analyst_agent(),
            async_execution=True,
        )

    @task
    def recommend(self) -> Task:
        return Task(
            config=self.tasks_config["recommend"],
            agent=self.investment_advisor_agent(),
            context=[
                self.financial_analysis(),
                self.research(),
                self.technical_analysis(),
            ],
        )

    @crew
    def crew(self) -> Crew:
        """Stock Analysis Crew (3 analyst song song + 1 advisor tổng hợp)."""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
