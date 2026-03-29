from typing import List
from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task

from tools.calculator_tool import CalculatorTool
from tools.sec_tools import SEC10KTool, SEC10QTool

from crewai_tools import WebsiteSearchTool, ScrapeWebsiteTool, TXTSearchTool

from dotenv import load_dotenv
load_dotenv()

from crewai import LLM

# --- FREE MODEL OPTIONS (pick one, comment out the others) ---

# Option 1: Groq (FREE cloud API - fastest, recommended)
# Get free key at: https://console.groq.com/
# Add to .env: GROQ_API_KEY=gsk_...
llm = LLM(model="groq/llama-3.3-70b-versatile")

# Option 2: Google Gemini (FREE cloud API)
# Get free key at: https://aistudio.google.com/app/apikey
# Add to .env: GEMINI_API_KEY=...
# llm = LLM(model="gemini/gemini-2.0-flash")

# Option 3: Ollama (FREE local, runs on your machine)
# Install Ollama: https://ollama.com/  then run: ollama pull llama3.2
# llm = LLM(model="ollama/llama3.2", base_url="http://localhost:11434")

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
                ScrapeWebsiteTool(),
                WebsiteSearchTool(),
                CalculatorTool(),
                SEC10QTool("AMZN"),
                SEC10KTool("AMZN"),
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
                ScrapeWebsiteTool(),
                # WebsiteSearchTool(), 
                SEC10QTool("AMZN"),
                SEC10KTool("AMZN"),
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
                ScrapeWebsiteTool(),
                WebsiteSearchTool(),
                CalculatorTool(),
                SEC10QTool(),
                SEC10KTool(),
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
                ScrapeWebsiteTool(),
                WebsiteSearchTool(),
                CalculatorTool(),
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
