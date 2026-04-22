"""
Reproduction script: traces which embedding API WebsiteSearchTool actually calls.
Run from: F:\GitHub\CCNLTHD\Main_Project
"""
import os
import sys

# Add venv to path
venv_path = os.path.join(os.path.dirname(__file__), ".venv", "Lib", "site-packages")
sys.path.insert(0, venv_path)

# Load .env
from dotenv import load_dotenv
load_dotenv()

print("=" * 60)
print("EMBEDDING API TRACE")
print("=" * 60)

# Print env vars that matter
print(f"\n[ENV] OPENAI_API_KEY: {'SET' if os.environ.get('OPENAI_API_KEY') else 'NOT SET'}")
print(f"[ENV] OPENAI_API_BASE: {os.environ.get('OPENAI_API_BASE', 'NOT SET (defaults to api.openai.com)')}")
print(f"[ENV] OLLAMA_BASE_URL: {os.environ.get('OLLAMA_BASE_URL', 'NOT SET')}")

# === Patch 1: Log ChromaDB OpenAIEmbeddingFunction calls ===
import chromadb.utils.embedding_functions.openai_embedding_function as oai_ef
_orig_oai_call = oai_ef.OpenAIEmbeddingFunction.__call__

def _patched_oai_call(self, texts, *args, **kwargs):
    import json
    log_path = os.path.join(os.path.dirname(__file__), "debug-0599e5.log")
    api_base = getattr(self, 'openai_api_base', None) or os.environ.get('OPENAI_API_BASE', 'https://api.openai.com')
    entry = {
        "id": "trace_openai_embed",
        "timestamp": __import__("time").time() * 1000,
        "location": "chromadb:openai_embedding_function",
        "message": "ChromaDB OpenAIEmbeddingFunction called",
        "data": {
            "model": getattr(self, "model_name", "unknown"),
            "api_base": api_base,
            "num_texts": len(texts),
            "first_text_preview": str(texts[0])[:80] if texts else "",
        },
        "sessionId": "0599e5",
        "runId": "repro",
        "hypothesisId": "A",
    }
    with open(log_path, "a") as f:
        f.write(json.dumps(entry) + "\n")
    print(f"\n>>> [TRACE] ChromaDB OpenAIEmbeddingFunction called!")
    print(f"    API Base: {api_base}")
    print(f"    Model: {getattr(self, 'model_name', 'unknown')}")
    print(f"    Num texts: {len(texts)}")
    return _orig_oai_call(self, texts, *args, **kwargs)

oai_ef.OpenAIEmbeddingFunction.__call__ = _patched_oai_call

# === Patch 2: Log ALL HTTP calls to openai/groq APIs ===
import requests
_orig_req_post = requests.Session.post
_orig_req_get = requests.Session.get

def _patched_post(session, url, *args, **kwargs):
    url_str = str(url)
    if any(h in url_str for h in ["openai.com", "groq", "api.together.xyz", "anthropic", "ollama"]):
        import json
        log_path = os.path.join(os.path.dirname(__file__), "debug-0599e5.log")
        entry = {
            "id": "trace_http_post",
            "timestamp": __import__("time").time() * 1000,
            "location": "requests:post",
            "message": "HTTP POST to embedding/LLM API",
            "data": {
                "url": url_str,
                "host": kwargs.get("headers", {}).get("Authorization", "NO_AUTH")[:30] if kwargs.get("headers") else "NO_HEADERS",
            },
            "sessionId": "0599e5",
            "runId": "repro",
            "hypothesisId": "B",
        }
        with open(log_path, "a") as f:
            f.write(json.dumps(entry) + "\n")
        print(f"\n>>> [TRACE] HTTP POST: {url_str[:80]}")
    return _orig_req_post(session, url, *args, **kwargs)

requests.Session.post = _patched_post

print("\n[PATCHES] Installed hooks for:")
print("  - chromadb OpenAIEmbeddingFunction.__call__")
print("  - requests Session.post")
print()

# === Patch 3: Check crewai embeddings factory ===
print("=" * 60)
print("CREWAI EMBEDDING FACTORY CONFIG")
print("=" * 60)
try:
    from crewai.rag.embeddings.factory import build_embedder
    print("\n[CrewAI] build_embedder is available")
    
    # Test with openai provider (default)
    try:
        config = {"provider": "openai", "model": "text-embedding-3-small"}
        embedder = build_embedder(config)
        print(f"  openai provider -> {type(embedder)}")
        print(f"  embedder attrs: {[a for a in dir(embedder) if not a.startswith('_')]}")
    except Exception as e:
        print(f"  openai provider error: {e}")
    
    # Test with ollama provider
    try:
        config = {"provider": "ollama", "model": "nomic-embed-text", "config": {"base_url": "http://localhost:11434"}}
        embedder = build_embedder(config)
        print(f"  ollama provider -> {type(embedder)}")
    except Exception as e:
        print(f"  ollama provider error: {e}")
        
except Exception as e:
    print(f"\n[CrewAI] ERROR: {e}")

print()

# === Test: WebsiteSearchTool ===
print("=" * 60)
print("TESTING WebsiteSearchTool(website='https://example.com')")
print("=" * 60)
try:
    from crewai_tools import WebsiteSearchTool
    tool = WebsiteSearchTool(website="https://example.com")
    print("SUCCESS: WebsiteSearchTool created")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

print("\n[DONE] Check debug-0599e5.log for trace entries")
