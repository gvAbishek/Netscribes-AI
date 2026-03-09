"""
Chat router — POST /api/chat

Connects to Azure OpenAI and returns a reply. Each of the three
modes (llm / agent / rag) uses a different system prompt so the model
behaves accordingly.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from openai import OpenAI

from auth import get_current_user
from config import settings

router = APIRouter(prefix="/api", tags=["chat"])

# ---------------------------------------------------------------------------
# Azure AI Foundry OpenAI client
# ---------------------------------------------------------------------------
client = OpenAI(
    base_url=settings.azure_openai_endpoint,
    api_key=settings.azure_openai_api_key,
)

# ---------------------------------------------------------------------------
# System prompts per mode
# ---------------------------------------------------------------------------
SYSTEM_PROMPTS: dict[str, str] = {
    "llm": (
        "You are NexusAI, a helpful, accurate, and friendly AI assistant. "
        "Answer the user's questions clearly and concisely. Use markdown "
        "formatting when it improves readability."
    ),
    "agent": (
        "You are NexusAI operating in Agent mode. You have access to tools "
        "and internal systems. When the user asks you to perform an action, "
        "describe the steps you would take, the tools you would invoke, and "
        "the results. Use emoji and structured formatting to make your "
        "responses feel like an active agent executing tasks."
    ),
    "rag": (
        "You are NexusAI operating in RAG (Retrieval-Augmented Generation) "
        "mode. You retrieve relevant documents from the company knowledge "
        "base before answering. Always cite document names when applicable, "
        "and structure your answer with clear references to source material."
    ),
}


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class ChatMessageIn(BaseModel):
    role: str  # "user" or "bot"
    content: str


class ChatRequest(BaseModel):
    message: str
    mode: str = "llm"  # llm | agent | rag
    history: list[ChatMessageIn] = []


class ChatResponse(BaseModel):
    reply: str


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, user: dict = Depends(get_current_user)):
    """Send a message to the OpenAI model and return the reply."""

    system_prompt = SYSTEM_PROMPTS.get(body.mode, SYSTEM_PROMPTS["llm"])

    # Build the messages list
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history
    for msg in body.history:
        role = "assistant" if msg.role == "bot" else "user"
        messages.append({"role": role, "content": msg.content})

    # Add the new user message
    messages.append({"role": "user", "content": body.message})

    # Call Azure OpenAI
    completion = client.chat.completions.create(
        model=settings.azure_openai_model,
        messages=messages,
        temperature=0.7,
        max_tokens=8192,
    )

    reply = completion.choices[0].message.content or ""
    return ChatResponse(reply=reply)
