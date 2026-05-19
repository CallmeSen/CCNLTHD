"""Routing helpers for the general chat workflow."""

from src.fin_agents.graphs.workflow.general_chat.state import GeneralChatState


def route_after_chat(state: GeneralChatState) -> str:
    """General chat is a single-response workflow."""

    return "END"
