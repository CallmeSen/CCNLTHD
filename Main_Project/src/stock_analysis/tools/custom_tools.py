"""
Custom web search tool that uses sentence-transformers for embeddings.
No OpenAI API required - runs fully offline.
"""
from crewai.tools import BaseTool
from pydantic import BaseModel, Field
import requests
from bs4 import BeautifulSoup
import re
import numpy as np
from typing import Optional, Any


# =============================================================
# Sentence Transformers Embedder (replaces OpenAI embeddings)
# =============================================================
class SentenceTransformerEmbedder:
    """Wraps sentence-transformers to match ChromaDB 1.x EmbeddingFunction interface."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer
        self._model = SentenceTransformer(model_name)
        self._dimensions = self._model.get_sentence_embedding_dimension()

    def __call__(self, input: str | list[str]) -> list[list[float]]:
        """ChromaDB 1.x signature: takes a string or list of strings, returns list of float lists."""
        if isinstance(input, str):
            input = [input]
        vectors = self._model.encode(input, convert_to_numpy=True, normalize_embeddings=True)
        return vectors.tolist()

    @property
    def dimensions(self) -> int:
        return self._dimensions


class InMemoryVectorStore:
    """Simple in-memory chunk store with cosine similarity search."""

    def __init__(self, embedder):
        self._embedder = embedder
        self._chunks: list[str] = []
        self._ids: list[str] = []
        self._vectors: list[list[float]] = []

    def add(self, texts: list[str], ids: Optional[list[str]] = None):
        for i, text in enumerate(texts):
            chunk_id = ids[i] if ids else f"chunk_{len(self._chunks)}"
            self._chunks.append(text)
            self._ids.append(chunk_id)
            self._vectors.append(self._embedder(text)[0])

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        query_vec = self._embedder(query)[0]
        scores = []
        for vec in self._vectors:
            q = np.array(query_vec)
            v = np.array(vec)
            score = float(np.dot(q, v) / (np.linalg.norm(q) * np.linalg.norm(v) + 1e-9))
            scores.append(score)

        # Get top-k
        indices = np.argsort(scores)[::-1][:top_k]
        return [
            {"id": self._ids[i], "text": self._chunks[i], "score": scores[i]}
            for i in indices
        ]

    def clear(self):
        self._chunks = []
        self._ids = []
        self._vectors = []


# =============================================================
# Tool Schemas
# =============================================================
class WebSearchToolSchema(BaseModel):
    website_url: str = Field(..., description="Mandatory URL of the website to read")
    search_query: Optional[str] = Field(
        default="",
        description=(
            "Optional search query to find specific information on the page. "
            "If not provided, returns a summary. Examples: 'P/E ratio EPS revenue', "
            "'insider trading', 'debt to equity', 'risk factors'"
        ),
    )


class WebSearchTool(BaseTool):
    """
    A tool that reads website content and enables semantic search on it.
    Uses sentence-transformers (all-MiniLM-L6-v2) for embeddings - fully offline, no OpenAI needed.

    Usage:
        tool = WebSearchTool()
        tool.load("https://example.com")
        results = tool.search("what is this site about?")
    """

    name: str = "Web Search and Read Tool"
    description: str = (
        "Use this tool to read and semantically search website content. "
        "First call load() with a URL, then call _run() with a search query. "
        "Returns the most relevant passages from the page."
    )
    args_schema: type[BaseModel] = WebSearchToolSchema

    def __init__(self, embedder: Optional[Any] = None, chunk_size: int = 500, chunk_overlap: int = 100, **kwargs):
        super().__init__(**kwargs)
        self._embedder = embedder or SentenceTransformerEmbedder()
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        self._store: Optional[InMemoryVectorStore] = None
        self._current_url: Optional[str] = None
        self._loaded: bool = False

    # ── Load website ──────────────────────────────────────────
    def load(self, url: str) -> str:
        """Fetch and index a website. Returns a summary of loaded content."""
        self._current_url = url
        self._store = InMemoryVectorStore(self._embedder)

        # Try requests first
        text = self._fetch_via_requests(url)

        # Fallback to Browserless if requests failed
        if text.startswith("WARNING:") or text.startswith("Error:") or len(text) < 200:
            browserless = BrowserlessTool()
            text = browserless._run(url)
            if "WARNING: Thin content" in text or "Both Browserless and requests failed" in text:
                self._loaded = False
                return text

        try:
            soup = BeautifulSoup(text, "html.parser")

            # Remove nav, footer, script, style, ads
            for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe"]):
                tag.decompose()

            # Remove ad-related classes
            for tag in soup.find_all(class_=re.compile(r"ad-|banner|promo|sidebar|comment", re.I)):
                tag.decompose()

            clean_text = soup.get_text(separator=" ", strip=True)
            # Collapse whitespace
            clean_text = re.sub(r"\s+", " ", clean_text).strip()

            # Skip if too short (likely blocked by JS wall)
            if len(clean_text) < 200:
                self._loaded = False
                return f"WARNING: Page content too short ({len(clean_text)} chars). URL: {url}"

            # Chunk text
            chunks = self._chunk_text(clean_text)
            ids = [f"c{i}" for i in range(len(chunks))]
            self._store.add(chunks, ids)
            self._loaded = True

            return f"Loaded {len(chunks)} chunks ({len(clean_text)} total chars) from {url}"

        except Exception as e:
            self._loaded = False
            return f"Error parsing content from {url}: {type(e).__name__}: {e}"

    def _fetch_via_requests(self, url: str) -> str:
        """Fetch page via simple requests. Returns raw text or error message."""
        try:
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/122.0.0.0 Safari/537.36"
                ),
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            }
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe"]):
                tag.decompose()
            for tag in soup.find_all(class_=re.compile(r"ad-|banner|promo|sidebar|comment", re.I)):
                tag.decompose()
            text = soup.get_text(separator=" ", strip=True)
            return re.sub(r"\s+", " ", text).strip()

        except requests.exceptions.HTTPError as e:
            return f"HTTP Error {e.response.status_code} fetching {url}. Site may be blocking bots."
        except requests.exceptions.Timeout:
            return f"Timeout fetching {url}."
        except Exception as e:
            return f"Error loading {url}: {type(e).__name__}: {e}"

    # ── Internal chunking ────────────────────────────────────
    def _chunk_text(self, text: str) -> list[str]:
        """Split text into overlapping chunks."""
        words = text.split()
        chunks = []
        start = 0
        while start < len(words):
            end = start + self._chunk_size
            chunk = " ".join(words[start:end])
            chunks.append(chunk)
            start = end - self._chunk_overlap
            if start >= len(words):
                break
        return chunks

    # ── Search (called by agent) ─────────────────────────────
    def _run(self, website_url: str, search_query: str = "") -> str:
        """Run the tool. website_url is required; search_query is optional."""
        if not self._loaded or self._current_url != website_url:
            summary = self.load(website_url)
            if not self._loaded:
                return f"Failed to load website: {summary}"

        if not self._store:
            return "No content loaded. Please provide a valid URL."

        if search_query:
            results = self._store.search(search_query, top_k=5)
            if not results:
                return "No relevant content found."

            output = f"=== Relevant passages from {website_url} ===\n\n"
            for i, r in enumerate(results, 1):
                snippet = r["text"].strip()
                if len(snippet) > 500:
                    snippet = snippet[:500] + "..."
                output += f"[{i}] (score={r['score']:.3f}): {snippet}\n\n"
            return output

        # No query - return summary of loaded content
        return f"Loaded {len(self._store._chunks)} chunks from {self._current_url}. Use search_query to query the content."


# =============================================================
# Calculator - improved to handle agent text input gracefully
# =============================================================
import ast
import operator as _operator


class CalculatorToolSchema(BaseModel):
    operation: str = Field(
        ...,
        description=(
            "A valid mathematical expression using ONLY numbers and operators: +, -, *, /, **, %, (). "
            "Example: (25 + 7.18) / 2  or  (27.76 * 2) - 40"
        ),
    )


class CalculatorTool(BaseTool):
    name: str = "Calculator tool"
    description: str = (
        "Useful to perform any mathematical calculations. "
        "IMPORTANT: The operation must contain ONLY numbers and math operators (+ - * / ** % ()) with no words. "
        "Examples of valid input: '(25 + 7.18) / 2', '27.76 * 2 - 40', '123.03 / 2.14' "
        "Examples of INVALID input: 'AMZN P/E ratio', 'AMZN's EPS', 'P/E ratio + EPS'"
    )
    args_schema: type[BaseModel] = CalculatorToolSchema

    def _run(self, operation: str) -> str:
        try:
            # Strip any surrounding backticks or markdown
            operation = operation.strip().strip("`").strip()

            if not operation:
                return "Error: Empty expression."

            # Validate: only numbers, operators, parentheses, spaces, dots
            if not re.match(r"^[0-9+\-*/().%\s]+$", operation):
                # Try to give a helpful error instead of just failing
                raise ValueError(
                    f"Invalid characters in expression. "
                    f"Use only numbers and operators (+, -, *, /, **, %, parentheses). "
                    f"Got: {operation[:80]}"
                )

            tree = ast.parse(operation, mode="eval")

            def _eval_node(node):
                if isinstance(node, ast.Expression):
                    return _eval_node(node.body)
                elif isinstance(node, ast.Constant):
                    return node.value
                elif isinstance(node, ast.Num):
                    return node.n
                elif isinstance(node, ast.BinOp):
                    left = _eval_node(node.left)
                    right = _eval_node(node.right)
                    op_map = {
                        ast.Add: _operator.add,
                        ast.Sub: _operator.sub,
                        ast.Mult: _operator.mul,
                        ast.Div: _operator.truediv,
                        ast.Pow: _operator.pow,
                        ast.Mod: _operator.mod,
                    }
                    fn = op_map.get(type(node.op))
                    if fn is None:
                        raise ValueError(f"Unsupported operator: {type(node.op).__name__}")
                    return fn(left, right)
                elif isinstance(node, ast.UnaryOp):
                    operand = _eval_node(node.operand)
                    op_map = {
                        ast.USub: _operator.neg,
                        ast.UAdd: _operator.pos,
                    }
                    fn = op_map.get(type(node.op))
                    if fn is None:
                        raise ValueError(f"Unsupported operator: {type(node.op).__name__}")
                    return fn(operand)
                else:
                    raise ValueError(f"Unsupported: {type(node).__name__}")

            result = _eval_node(tree)
            return f"Result: {result}"

        except ZeroDivisionError:
            return "Error: Division by zero."
        except (SyntaxError, ValueError) as e:
            return f"Error: {e}"
        except Exception:
            return "Error: Invalid mathematical expression."


# =============================================================
# Browserless Tool - Headless browser scraping via Browserless.io
# =============================================================
import json
import os


class BrowserlessToolSchema(BaseModel):
    website_url: str = Field(
        ...,
        description="Mandatory website URL to scrape content from. Example: https://finance.yahoo.com/quote/AMZN",
    )


class BrowserlessTool(BaseTool):
    name: str = "Browserless Web Scraper"
    description: str = (
        "Scrapes full content from websites that require JavaScript rendering. "
        "Use this when regular HTTP requests fail or return blocked/incomplete content. "
        "Input should be a valid URL."
    )
    args_schema: type[BaseModel] = BrowserlessToolSchema

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._api_key = os.environ.get("BROWSERLESS_API_KEY", "")

    def _run(self, website_url: str) -> str:
        try:
            website_url = website_url.strip()

            # If no API key, fall back to requests
            if not self._api_key:
                return self._fallback_scrape(website_url)

            url = "https://chrome.browserless.io/content"
            headers = {
                "Cache-Control": "no-cache",
                "apikey": self._api_key,
            }
            payload = {
                "url": website_url,
                "waitFor": 3000,
                "elements": [{"selector": "body", "timeout": 15000}],
            }

            response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=30)

            if response.status_code == 200:
                result = response.json()
                text = result.get("data", {}).get("text", "") or str(result.get("data", ""))
                if not text or len(text) < 100:
                    return f"WARNING: Browserless returned thin content ({len(text)} chars). URL: {website_url}"
                return f"[Scraped via Browserless from {website_url}]\n\n{text[:20000]}"
            elif response.status_code == 401:
                return f"Error: Invalid Browserless API key. Falling back to requests. URL: {website_url}"
            elif response.status_code == 402:
                return f"Error: Browserless credits exhausted. Falling back. URL: {website_url}"
            else:
                return f"Browserless error {response.status_code}. Falling back to requests. URL: {website_url}"

        except requests.exceptions.Timeout:
            return f"Timeout via Browserless. Falling back. URL: {website_url}"
        except Exception as e:
            return f"Browserless error: {e}. Falling back. URL: {website_url}"

    def _fallback_scrape(self, url: str) -> str:
        """Simple requests fallback when Browserless is unavailable."""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            }
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()
            text = re.sub(r"\s+", " ", soup.get_text(separator=" ", strip=True)).strip()
            if len(text) < 200:
                return f"WARNING: Thin content ({len(text)} chars). URL: {url}"
            return f"[Scraped via requests from {url}]\n\n{text[:20000]}"
        except Exception as e:
            return f"Both Browserless and requests failed for {url}: {e}"
