"""
General chat LangGraph workflow.

Single-node pipeline for conversational messages that don't need structured analysis.
No portfolio suggestions, no metrics -- just natural responses.
"""

import logging
from typing import Any, Dict

from langgraph.graph import StateGraph, END

from src.fin_agents.graphs.workflow.general_chat.prompts import (
    GENERAL_CHAT_SYSTEM_EN,
    GENERAL_CHAT_SYSTEM_VI,
)
from src.fin_agents.graphs.workflow.general_chat.routing import route_after_chat
from src.fin_agents.graphs.workflow.general_chat.state import GeneralChatState
from src.fin_agents.agents.agent_loader import get_shared_llm

logger = logging.getLogger(__name__)


def chat_node(state: GeneralChatState) -> Dict[str, Any]:
    """
    Single node: generate a conversational response using LLM.

    Uses conversation history + personalization context to generate
    a natural, non-pushy response.
    """
    lang = state.get("lang", "en")
    system_prompt = GENERAL_CHAT_SYSTEM_VI if lang == "vi" else GENERAL_CHAT_SYSTEM_EN

    history = state.get("conversation_history", [])
    personalization = state.get("personalization_context", {})
    current_message = state.get("message", "")

    from langchain_core.messages import HumanMessage, AIMessage

    messages = []
    messages.append(("system", system_prompt))

    for msg in history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "user":
            messages.append(("human", content))
        elif role == "assistant":
            messages.append(("ai", content))

    personalization_text = ""
    if personalization.get("has_context"):
        personalization_text = (
            f"\n\n[Personalization Context from uploaded files]: "
            f"{personalization.get('summary', '')}\n"
            f"Combined context:\n{personalization.get('combined_text_context', '')}"
        )

    final_message = current_message + personalization_text
    messages.append(("human", final_message))

    try:
        llm = get_shared_llm()
        response = llm.invoke(messages)
        response_text = getattr(response, "content", str(response))
        logger.info(f"General chat response generated ({len(response_text)} chars)")
        return {"response": response_text}
    except Exception as e:
        logger.error(f"General chat LLM call failed: {e}")
        return {
            "response": (
                "I'm sorry, I encountered an error generating a response. "
                "Please try again."
            )
        }


def build_general_chat_graph() -> StateGraph:
    """Build and return the general chat StateGraph."""
    workflow = StateGraph(GeneralChatState)
    workflow.add_node("chat", chat_node)
    workflow.set_entry_point("chat")
    workflow.add_conditional_edges("chat", route_after_chat, {"END": END})
    return workflow


def compile_general_chat_graph():
    """Build and compile the general chat graph."""
    return build_general_chat_graph().compile()
