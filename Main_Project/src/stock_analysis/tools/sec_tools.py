import os
from typing import Optional, Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool
from sec_api import QueryApi
import requests
import html2text
import re


def _fetch_sec_filing(stock_name: str, form_type: str) -> str:
    """Shared helper: fetch latest SEC filing content as plain text."""
    try:
        queryApi = QueryApi(api_key=os.environ['SEC_API_API_KEY'])
        query = {
            "query": {
                "query_string": {
                    "query": f"ticker:{stock_name} AND formType:\"{form_type}\""
                }
            },
            "from": "0",
            "size": "1",
            "sort": [{"filedAt": {"order": "desc"}}]
        }
        filings = queryApi.get_filings(query)['filings']
        if not filings:
            return f"No {form_type} filings found for {stock_name}."

        url = filings[0]['linkToFilingDetails']
        headers = {
            "User-Agent": "crewai.com bisan@crewai.com",
            "Accept-Encoding": "gzip, deflate",
            "Host": "www.sec.gov"
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        h = html2text.HTML2Text()
        h.ignore_links = False
        text = h.handle(response.content.decode("utf-8"))
        text = re.sub(r"[^a-zA-Z$0-9\s\n]", "", text)
        return text[:15000]
    except Exception as e:
        return f"Error fetching {form_type} for {stock_name}: {e}"


# Schema when ticker is already known (pre-configured)
class FixedSEC10KToolSchema(BaseModel):
    search_query: str = Field(..., description="What to look for in the 10-K filing")

# Schema when ticker must be supplied by the LLM
class SEC10KToolSchema(BaseModel):
    stock_name: str = Field(..., description="Stock ticker symbol, e.g. AMZN")
    search_query: str = Field(..., description="What to look for in the 10-K filing")


class SEC10KTool(BaseTool):
    name: str = "Search SEC 10-K Filing"
    description: str = "Fetches and searches the latest 10-K annual report for a given stock ticker."
    args_schema: Type[BaseModel] = SEC10KToolSchema
    stock_name: Optional[str] = None

    def __init__(self, stock_name: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        if stock_name:
            self.stock_name = stock_name
            self.description = f"Fetches and searches {stock_name}'s latest 10-K annual SEC filing."
            self.args_schema = FixedSEC10KToolSchema

    def _run(self, search_query: str, stock_name: Optional[str] = None) -> str:
        ticker = self.stock_name or stock_name
        if not ticker:
            return "Error: No stock ticker provided."
        return _fetch_sec_filing(ticker, "10-K")


# Schema when ticker is already known (pre-configured)
class FixedSEC10QToolSchema(BaseModel):
    search_query: str = Field(..., description="What to look for in the 10-Q filing")

# Schema when ticker must be supplied by the LLM
class SEC10QToolSchema(BaseModel):
    stock_name: str = Field(..., description="Stock ticker symbol, e.g. AMZN")
    search_query: str = Field(..., description="What to look for in the 10-Q filing")


class SEC10QTool(BaseTool):
    name: str = "Search SEC 10-Q Filing"
    description: str = "Fetches and searches the latest 10-Q quarterly report for a given stock ticker."
    args_schema: Type[BaseModel] = SEC10QToolSchema
    stock_name: Optional[str] = None

    def __init__(self, stock_name: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        if stock_name:
            self.stock_name = stock_name
            self.description = f"Fetches and searches {stock_name}'s latest 10-Q quarterly SEC filing."
            self.args_schema = FixedSEC10QToolSchema

    def _run(self, search_query: str, stock_name: Optional[str] = None) -> str:
        ticker = self.stock_name or stock_name
        if not ticker:
            return "Error: No stock ticker provided."
        return _fetch_sec_filing(ticker, "10-Q")

