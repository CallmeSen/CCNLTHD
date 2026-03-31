import os
os.environ["LITELLM_LOG"] = "CRITICAL"  # suppress non-fatal proxy logging noise

from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task

from tools.calculator_tool import CalculatorTool
from tools.sec_tools import SEC10KTool, SEC10QTool

from crewai_tools import ScrapeWebsiteTool

from dotenv import load_dotenv
load_dotenv()

# --- FREE MODEL OPTIONS (pick one, comment out the others) ---

# Option 1: Groq (FREE cloud API - fastest, recommended)
llm = LLM(model="groq/llama-3.1-8b-instant", max_tokens=2048)

# Option 2: Google Gemini (FREE cloud API)
# llm = LLM(model="gemini/gemini-2.0-flash")

# Option 3: Ollama (FREE local, runs on your machine)
# llm = LLM(model="ollama/llama3.2", base_url="http://localhost:11434")

@CrewBase
class StockAnalysisCrew:
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    @agent
    def research_analyst_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['research_analyst'],
            verbose=True,
            llm=llm,
            tools=[
                ScrapeWebsiteTool(),
                SEC10QTool("AMZN"),
                SEC10KTool("AMZN"),
            ]
        )

    @agent
    def financial_analyst_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['financial_analyst'],
            verbose=True,
            llm=llm,
            tools=[
                ScrapeWebsiteTool(),
                CalculatorTool(),
            ]
        )

    @agent
    def investment_advisor_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['investment_advisor'],
            verbose=True,
            llm=llm,
            tools=[
                ScrapeWebsiteTool(),
                CalculatorTool(),
            ]
        )

    @task
    def research(self) -> Task:
        return Task(
            config=self.tasks_config['research'],
            agent=self.research_analyst_agent(),
        )

    @task
    def financial_analysis(self) -> Task:
        return Task(
            config=self.tasks_config['financial_analysis'],
            agent=self.financial_analyst_agent(),
        )

    @task
    def filings_analysis(self) -> Task:
        return Task(
            config=self.tasks_config['filings_analysis'],
            agent=self.financial_analyst_agent(),
        )

    @task
    def recommend(self) -> Task:
        return Task(
            config=self.tasks_config['recommend'],
            agent=self.investment_advisor_agent(),
        )

    @crew
    def crew(self) -> Crew:
        """Creates the Stock Analysis"""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
