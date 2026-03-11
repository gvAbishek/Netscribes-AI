from __future__ import annotations
import json
import base64

from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from duckduckgo_search import DDGS

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
# Tools / Function Calling
# ---------------------------------------------------------------------------
def internet_search(query: str):
    """
    Search the internet for real-time information using DuckDuckGo.
    Returns (formatted_text, references)
    """
    print(f"Executing DuckDuckGo search for: {query}")
    try:
        results = DDGS().text(query, max_results=5)
        if not results:
             return f"No search results found for '{query}'.", []
        
        formatted_results = [f"- {r['title']}: {r['body']} (Source: {r['href']})" for r in results]
        references = [{"title": r['title'], "url": r['href']} for r in results]
        return f"Search results for '{query}':\n" + "\n".join(formatted_results), references
    except Exception as e:
        print(f"DuckDuckGo search error: {e}")
        return f"Error performing search: {str(e)}", []

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "internet_search",
            "description": """Search the internet for real-time information.

ALWAYS USE THIS TOOL for:
- ANY question about wars, conflicts, attacks, geopolitical events
- News and current events (today, this week, recently, latest)
- ANY question with: latest, update, current, recent, now, today
- Sports scores, stock prices, weather, elections
- Any world event that could have changed since 2024

YOUR TRAINING DATA IS OUTDATED.
When user asks about ANY ongoing situation — SEARCH FIRST.
NEVER answer current events from memory.""",

            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Specific search query. For 'latest iran war update' search 'Iran conflict latest news 2025'"
                    }
                },
                "required": ["query"]
            }
        }
    }
]

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
        "You are NexusAI operating in Agent mode. You have access to an 'internet_search' tool. "
        "When you need up-to-date information, use the tool. Describe what you are doing "
        "using emoji and structured formatting to make it feel like an active agent."
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
class ChatResponse(BaseModel):
    reply: str
    references: list[dict] = []

# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat(
    message: str = Form(...),
    mode: str = Form("llm"),
    history: str = Form("[]"),
    file: UploadFile | None = File(None),
    user: dict = Depends(get_current_user)
):
    """Send a message to the OpenAI model and return the reply."""

    try:
        history_list = json.loads(history)
    except Exception:
        history_list = []

    # 1. Build messages from history
    system_prompt = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["llm"])
    # Tool access is always provided, but system prompt informs the model about its role.
    messages: list[dict] = [{"role": "system", "content": system_prompt}]

    for msg in history_list:
        role = "assistant" if msg.get("role") == "bot" else "user"
        messages.append({"role": role, "content": msg.get("content", "")})

    # 2. Add current message (handle text + image)
    if file:
        file_bytes = await file.read()
        encoded = base64.b64encode(file_bytes).decode("utf-8")
        mime_type = file.content_type or "image/jpeg"
        
        user_content = [
            {"type": "text", "text": message},
            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded}"}}
        ]
        messages.append({"role": "user", "content": user_content})
    else:
        messages.append({"role": "user", "content": message})

    # 3. Call OpenAI with tools enabled for all modes
    completion = client.chat.completions.create(
        model=settings.azure_openai_model,
        messages=messages,
        tools=TOOLS,
        tool_choice="required",
        temperature=0.7,
        max_tokens=8192,
    )

    response_message = completion.choices[0].message
    
    # 4. Handle tool calls loop
    all_references = []
    while response_message.tool_calls:
        messages.append(response_message)
        
        for tool_call in response_message.tool_calls:
            if tool_call.function.name == "internet_search":
                args = json.loads(tool_call.function.arguments)
                tool_result, references = internet_search(args["query"])
                all_references.extend(references)
                
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": "internet_search",
                    "content": tool_result,
                })
        
        # Get next completion after tool results
        completion = client.chat.completions.create(
            model=settings.azure_openai_model,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto"
        )
        response_message = completion.choices[0].message

    reply = response_message.content or ""
    # Remove duplicate references based on URL
    unique_refs = {ref['url']: ref for ref in all_references}.values()
    return ChatResponse(reply=reply, references=list(unique_refs))
