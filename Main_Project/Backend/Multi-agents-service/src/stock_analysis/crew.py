from typing import List
from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task

from tools.calculator_tool import CalculatorTool  # kept for backwards compat if needed
from tools.custom_tools import WebSearchTool, CalculatorTool as ImprovedCalculatorTool, BrowserlessTool
# from tools.sec_tools import SEC10KTool, SEC10QTool  # Disabled due to embedchain compatibility issues

from dotenv import load_dotenv
load_dotenv()

from crewai import LLM
llm = LLM(
    model="ollama/openhermes",
    base_url="http://localhost:11434"
)

# Shared embedder instance - loads once, reused by all WebSearchTool instances
_shared_embedder = None

def _get_embedder():
    global _shared_embedder
    if _shared_embedder is None:
        from tools.custom_tools import SentenceTransformerEmbedder
        _shared_embedder = SentenceTransformerEmbedder(model_name="all-MiniLM-L6-v2")
        print(f"[TOOL INIT] SentenceTransformerEmbedder ready (all-MiniLM-L6-v2)")
    return _shared_embedder


@CrewBase
class StockAnalysisCrew:
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'
    
    @agent
    def financial_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['financial_analyst'],
            verbose=True,
            llm=llm,
            tools=[
                WebSearchTool(embedder=_get_embedder()),
                BrowserlessTool(),
                ImprovedCalculatorTool(),
            ]
        )
    
    @task
    def financial_analysis(self) -> Task: 
        return Task(
            config=self.tasks_config['financial_analysis'],
            agent=self.financial_agent(),
        )

    @agent
    def research_analyst_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['research_analyst'],
            verbose=True,
            llm=llm,
            tools=[
                WebSearchTool(embedder=_get_embedder()),
                BrowserlessTool(),
            ]
        )
    
    @task
    def research(self) -> Task:
        return Task(
            config=self.tasks_config['research'],
            agent=self.research_analyst_agent(),
        )
    
    @agent
    def financial_analyst_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['financial_analyst'],
            verbose=True,
            llm=llm,
            tools=[
                WebSearchTool(embedder=_get_embedder()),
                BrowserlessTool(),
                ImprovedCalculatorTool(),
            ]
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

    @agent
    def investment_advisor_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['investment_advisor'],
            verbose=True,
            llm=llm,
            tools=[
                WebSearchTool(embedder=_get_embedder()),
                BrowserlessTool(),
                ImprovedCalculatorTool(),
            ]
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
