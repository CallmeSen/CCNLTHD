# 🔌 Backend Integration - Step by Step

## Local Files to Update

### File 1: `Backend/Multi-agents-service/src/fin_agents/api/sessions.py`

**Current Code** (approx. line 1-50):
```python
"""FastAPI routes for SSE-based chat sessions.
Provides streaming agent responses for the web UI chat interface.
...
"""

import asyncio
import json
import logging
# ... other imports ...

from src.fin_agents.api.schemas import MessageCreate
from src.fin_agents.core.orchestrator import OrchestratorService
from src.fin_agents.db.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sessions", tags=["sessions"])
```

**✅ Add After Existing Imports**:
```python
# NEW IMPORT - Add this
from src.fin_agents.graphs.workflow.stock_advisory.prompts_chat import (
    get_chatbot_system_prompt,
    validate_chatbot_response
)
```

---

### File 2: Create New Route in `sessions.py`

**Add This New Endpoint** (complete chat endpoint):

```python
@router.post("/{session_id}/chat")
async def chat_message(
    session_id: str,
    request: MessageCreate,
    db: Session = Depends(get_db)
):
    """
    Chat endpoint that returns AI responses in JSON format.
    
    Spec: Backend/Multi-agents-service/src/fin_agents/graphs/workflow/stock_advisory/prompts_chat.py
    
    Request:
        {
            "message": "user message",
            "lang": "vi"  # or "en"
        }
    
    Response (JSON):
        {
            "summary": "Brief answer",
            "details": "# Markdown content",
            "status": "success|warning|error",
            "metadata": {
                "processingTime": "2.3s",
                "agentsUsed": ["agent1"],
                "confidence": 0.92
            }
        }
    """
    try:
        user_message = request.message
        lang = getattr(request, 'lang', 'en') or 'en'
        
        if not user_message or not user_message.strip():
            return {
                "summary": "Lỗi: Vui lòng cung cấp tin nhắn",
                "details": "# Error\n\nTin nhắn không được để trống",
                "status": "error",
                "metadata": {
                    "processingTime": "0ms",
                    "agentsUsed": [],
                    "confidence": 1.0
                }
            }
        
        # Get system prompt for language
        system_prompt = get_chatbot_system_prompt(lang)
        
        # Call your LLM (OpenAI, Claude, etc.)
        # NOTE: You need to implement this based on your LLM provider
        ai_response = await call_llm_async(
            system_prompt=system_prompt,
            user_message=user_message,
            temperature=0,  # ✅ CRITICAL: Deterministic output
            max_tokens=2000,
            top_p=0.9
        )
        
        # Validate response format
        is_valid, parsed_data, error_msg = validate_chatbot_response(ai_response)
        
        if is_valid and parsed_data:
            # ✅ Return valid JSON response
            return parsed_data
        else:
            # ✅ Return error JSON
            return {
                "summary": f"Format error: {error_msg[:50]}",
                "details": f"# Error\n\nAI response validation failed:\n\n{error_msg}",
                "status": "error",
                "metadata": {
                    "processingTime": "0.5s",
                    "agentsUsed": ["validator"],
                    "confidence": 1.0
                }
            }
    
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return {
            "summary": f"Lỗi xử lý: {str(e)[:50]}",
            "details": f"# Error\n\nAn error occurred:\n\n```\n{str(e)}\n```",
            "status": "error",
            "metadata": {
                "processingTime": "0s",
                "agentsUsed": ["error_handler"],
                "confidence": 0.0
            }
        }
```

---

### File 3: Example LLM Implementation

**Add to `Backend/Multi-agents-service/src/fin_agents/core/llm_config.py`**:

```python
# NEW: Async LLM call wrapper
async def call_llm_async(
    system_prompt: str,
    user_message: str,
    temperature: float = 0,
    max_tokens: int = 2000,
    top_p: float = 0.9
) -> str:
    """
    Call OpenAI API with the given parameters.
    
    Args:
        system_prompt: System prompt from prompts_chat.py
        user_message: User input message
        temperature: Must be 0 for deterministic output
        max_tokens: Maximum response length
        top_p: Nucleus sampling parameter
    
    Returns:
        Raw AI response (should be JSON)
    """
    from openai import AsyncOpenAI
    
    client = AsyncOpenAI()
    
    response = await client.chat.completions.create(
        model="gpt-4-turbo",  # or your model
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_message
            }
        ],
        temperature=temperature,  # ✅ Set to 0
        max_tokens=max_tokens,
        top_p=top_p,
        frequency_penalty=0.1,
        presence_penalty=0.1,
    )
    
    return response.choices[0].message.content
```

---

### File 4: Using Existing OrchestratorService

**If using existing orchestrator** (modify in `sessions.py`):

```python
# Alternative: Use existing workflow
@router.post("/{session_id}/chat-with-agents")
async def chat_with_agents(
    session_id: str,
    request: MessageCreate,
    db: Session = Depends(get_db)
):
    """
    Chat using full agent workflow.
    """
    try:
        lang = getattr(request, 'lang', 'en') or 'en'
        
        # Run orchestrator workflow
        orchestrator = OrchestratorService(db_session=db)
        result = await orchestrator.run_async(
            user_input=request.message,
            lang=lang,
            # ... other params ...
        )
        
        # Transform result to JSON format if needed
        return {
            "summary": result.get("summary", "Processing complete"),
            "details": result.get("details", result.get("content", "")),
            "status": "success" if not result.get("error") else "error",
            "metadata": {
                "processingTime": f"{result.get('elapsed_ms', 0) / 1000:.1f}s",
                "agentsUsed": result.get("agents_used", []),
                "confidence": result.get("confidence", 0.9)
            }
        }
    
    except Exception as e:
        logger.error(f"Orchestrator error: {e}")
        return {
            "summary": "Lỗi xử lý",
            "details": f"# Error\n\n{str(e)}",
            "status": "error",
            "metadata": {
                "processingTime": "0s",
                "agentsUsed": [],
                "confidence": 0.0
            }
        }
```

---

## 📋 Checklist for Backend Integration

### Step 1: Add Imports
- [ ] Add import for `get_chatbot_system_prompt`
- [ ] Add import for `validate_chatbot_response`
- [ ] Location: top of `sessions.py`

### Step 2: Create LLM Call Function
- [ ] Implement `call_llm_async()` function (or use existing)
- [ ] Set `temperature=0` ✅
- [ ] Set `max_tokens=2000`
- [ ] Set `top_p=0.9`
- [ ] Location: `llm_config.py` or in `sessions.py`

### Step 3: Create/Update Chat Endpoint
- [ ] Create new route `/chat` or `/sessions/{id}/chat`
- [ ] Get system prompt: `get_chatbot_system_prompt(lang)`
- [ ] Call LLM with system prompt
- [ ] Validate response: `validate_chatbot_response()`
- [ ] Return JSON or error JSON
- [ ] Add error handling with try-catch

### Step 4: Test
- [ ] Test with English message
- [ ] Test with Vietnamese message
- [ ] Verify JSON response format
- [ ] Verify all 4 required fields present
- [ ] Verify temperature=0 (deterministic output)
- [ ] Test error cases

### Step 5: Logging & Monitoring
- [ ] Add logging for incoming requests
- [ ] Add logging for API responses
- [ ] Log validation results
- [ ] Log errors with full context

---

## 🧪 Testing the Backend Integration

### Test 1: Direct API Call

```bash
curl -X POST http://localhost:8000/sessions/test-session/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Phân tích portfolio 60% VTSAX, 30% VTIAX, 10% BND",
    "lang": "vi"
  }'
```

**Expected Response** (pretty-printed):
```json
{
  "summary": "Portfolio của bạn có phân bổ tốt nhưng nên tăng trái phiếu lên 20-25% cho chân trời 10 năm.",
  "details": "# Phân Tích\n\n## Phân Bổ Hiện Tại\n- VTSAX: 60%\n...",
  "status": "success",
  "metadata": {
    "processingTime": "1.2s",
    "agentsUsed": ["portfolio_analyzer"],
    "confidence": 0.92
  }
}
```

### Test 2: Python Test Script

```python
import requests
import json

def test_chat_endpoint():
    url = "http://localhost:8000/sessions/test-session/chat"
    
    payload = {
        "message": "Backtest 20/50-day MA crossover on AAPL",
        "lang": "en"
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        # Validate response format
        required_fields = ["summary", "details", "status", "metadata"]
        for field in required_fields:
            assert field in data, f"Missing: {field}"
        
        assert data["status"] in ["success", "warning", "error"]
        assert len(data["summary"]) <= 150
        assert isinstance(data["metadata"]["agentsUsed"], list)
        assert 0 <= data["metadata"]["confidence"] <= 1
        
        print("✅ Response format valid!")
        print(f"Summary: {data['summary']}")
        print(f"Status: {data['status']}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_chat_endpoint()
```

### Test 3: Test Multiple Languages

```bash
# English
curl -X POST http://localhost:8000/sessions/test-session/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyze AAPL stock", "lang": "en"}'

# Vietnamese  
curl -X POST http://localhost:8000/sessions/test-session/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Phân tích cổ phiếu AAPL", "lang": "vi"}'
```

---

## 📊 Expected Behavior

### Success Case (status: "success")
```python
{
    "summary": "Clear answer addressing user question",
    "details": "# Well-structured markdown\n\nDetailed analysis with insights",
    "status": "success",
    "metadata": {
        "processingTime": "1.5s",
        "agentsUsed": ["analyzer1", "analyzer2"],
        "confidence": 0.92
    }
}
```

### Warning Case (status: "warning")
```python
{
    "summary": "Partial answer with cautionary note",
    "details": "# Analysis\n\n⚠️ Important considerations...",
    "status": "warning",
    "metadata": {
        "processingTime": "1.2s",
        "agentsUsed": ["risk_checker"],
        "confidence": 0.75
    }
}
```

### Error Case (status: "error")
```python
{
    "summary": "Could not process request: [reason]",
    "details": "# Error Details\n\nReason: Invalid ticker or missing data",
    "status": "error",
    "metadata": {
        "processingTime": "0.3s",
        "agentsUsed": ["validator"],
        "confidence": 1.0
    }
}
```

---

## 🔍 Debugging Tips

### Check 1: Verify System Prompt is Used
```python
# In your endpoint, add:
logger.info(f"System prompt length: {len(system_prompt)}")
logger.info(f"First 100 chars: {system_prompt[:100]}")
```

### Check 2: Log LLM Response
```python
logger.info(f"LLM raw response:\n{ai_response}")
```

### Check 3: Log Validation Result
```python
is_valid, data, error = validate_chatbot_response(ai_response)
logger.info(f"Validation: valid={is_valid}, error={error}")
if data:
    logger.info(f"Response status: {data.get('status')}")
```

### Check 4: Verify Temperature Setting
```python
# Confirm in your LLM call:
logger.info(f"LLM params: temperature=0, max_tokens=2000, top_p=0.9")
```

---

## ✅ Integration Checklist - Final

- [ ] System prompt imported in `sessions.py`
- [ ] Chat endpoint created with JSON response
- [ ] LLM call uses temperature=0
- [ ] Response validated before returning
- [ ] Error handling with JSON fallback
- [ ] Logging added for debugging
- [ ] Tested with English message
- [ ] Tested with Vietnamese message
- [ ] Verified JSON format
- [ ] Verified all 4 required fields
- [ ] Tested error cases
- [ ] Frontend component can parse response
- [ ] Toggle "Xem Chi Tiết" works
- [ ] Production ready

---

## 📞 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| JSON parse error | AI returning non-JSON | Verify system prompt is used |
| Missing fields | Validation not checking | Check validate_chatbot_response() |
| Non-deterministic output | Temperature != 0 | Set temperature=0 in LLM call |
| Text outside JSON | AI ignoring prompt | Add emphasis in system prompt |
| Timeout | Slow LLM | Increase timeout, check max_tokens |

---

**Backend Integration Complete!** ✅

Now the frontend can receive properly formatted JSON responses with:
- Summary visible
- Details collapsible  
- Status badge
- Metadata displayed
- Full error handling
