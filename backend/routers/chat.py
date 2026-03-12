from __future__ import annotations
import json
import base64
import logging

from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from duckduckgo_search import DDGS

from auth import get_current_user
from datetime import datetime, timezone

from config import settings
from file_utils import extract_text_from_file
from database import db_manager
from services.rag_pipeline import rag_pipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])

# ---------------------------------------------------------------------------
# Azure AI Foundry OpenAI client
# ---------------------------------------------------------------------------
from openai import AsyncAzureOpenAI

client = AsyncAzureOpenAI(
    azure_endpoint=settings.azure_openai_chat_endpoint,
    api_key=settings.azure_openai_chat_key,
    api_version=settings.azure_openai_api_version
)

# ---------------------------------------------------------------------------
# Tools / Function Calling
# ---------------------------------------------------------------------------
def internet_search(query: str):
    """
    Search the internet for real-time information using DuckDuckGo.
    Returns (formatted_text, references)
    """
    try:
        results = DDGS().text(query, max_results=5)
        if not results:
             return f"No search results found for '{query}'.", []
        
        formatted_results = [f"- {r['title']}: {r['body']} (Source: {r['href']})" for r in results]
        references = [{"title": r['title'], "url": r['href']} for r in results]
        return f"Search results for '{query}':\n" + "\n".join(formatted_results), references
    except Exception as e:
        logger.error(f"DuckDuckGo search error: {e}")
        return f"Error performing search: {str(e)}", []

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "internet_search",
            "description": """Search the internet for real-time information.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Specific search query."
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
        "formatting when it improves readability. You have access to an "
        "'internet_search' tool — use it when you need up-to-date or "
        "real-time information."
    ),
    "agent": (
        "You are NexusAI operating in Agent mode. You have access to an "
        "'internet_search' tool. When you need up-to-date information or "
        "the user asks about current events, news, or real-time data, "
        "use the tool proactively."
    ),
    "rag": (
        "You are NexusAI operating in RAG (Retrieval-Augmented Generation) "
        "mode. Use the retrieved context to answer the user's questions. "
        "You also have access to an 'internet_search' tool — use it when "
        "the retrieved context is insufficient or the user asks about "
        "real-time information."
    ),
}

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class ChatResponse(BaseModel):
    reply: str
    references: list[dict] = []

# ---------------------------------------------------------------------------
# Helper: Handle tool calls
# ---------------------------------------------------------------------------
async def handle_tool_calls(response_message, messages, all_references):
    iteration = 0
    max_iterations = 5

    while response_message.tool_calls and iteration < max_iterations:
        iteration += 1
        messages.append(response_message)
        
        for tool_call in response_message.tool_calls:
            if tool_call.function.name == "internet_search":
                try:
                    args = json.loads(tool_call.function.arguments)
                    tool_result, references = internet_search(args["query"])
                    all_references.extend(references)
                    
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": "internet_search",
                        "content": tool_result,
                    })
                except Exception as e:
                    logger.error(f"Error processing tool call: {e}")
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": "internet_search",
                        "content": f"Error: {str(e)}",
                    })
        
        completion = await client.chat.completions.create(
            model=settings.azure_openai_chat_model,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto"
        )
        response_message = completion.choices[0].message
    
    return response_message

# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat(
    message: str = Form(...),
    mode: str = Form("llm"),
    history: str = Form("[]"),
    conversation_id: str | None = Form(None),
    file: UploadFile | None = File(None),
    user: dict = Depends(get_current_user)
):
    """Send a message to the OpenAI model and return the reply."""

    db = db_manager.get_db()

    try:
        if conversation_id and db is not None:
            msg_doc = await db["messages"].find_one({"conversation_id": conversation_id})
            if msg_doc:
                db_history = msg_doc.get("messages", [])
                history_list = []
                for m in db_history:
                    # Convert backend format to frontend/expected format
                    role = "bot" if m.get("role") == "agent" else "user"
                    history_list.append({"role": role, "content": m.get("content", "")})
            else:
                history_list = json.loads(history)
        else:
            history_list = json.loads(history)
    except Exception:
        history_list = []

    # 1. Fetch User Role for RAG filtering
    user_role = "user"
    if db is not None:
        db_user = await db["users"].find_one({"uid": user["uid"]})
        if db_user:
            user_role = db_user.get("role", "user")

    # 2. RAG Retrieval Logic
    context_text = ""
    all_references = []
    
    if mode == "rag":
        try:
            logger.info(f"RAG mode: performing search for '{message}' with role '{user_role}'")
            results = await rag_pipeline.search(message, user_role)
            
            context_chunks = []
            for result in results:
                context_chunks.append(f"Source: {result['title']}\nContent: {result['content']}")
                all_references.append({
                    "title": result['title'],
                    "url": "#",
                    "document_id": result['document_id']
                })
            
            if context_chunks:
                context_text = "\n\n=== RELEVANT CONTEXT ===\n" + "\n\n".join(context_chunks)
                logger.info(f"Retrieved {len(context_chunks)} chunks for RAG context")
        except Exception as e:
            logger.error(f"RAG Retrieval error: {e}")

    # 3. Build messages
    system_prompt = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["llm"])
    if context_text:
        system_prompt += f"\n\nUse the following internal documentation to answer the user. CONTEXT:\n{context_text}"
    
    messages: list[dict] = [{"role": "system", "content": system_prompt}]

    for msg in history_list:
        role = "assistant" if msg.get("role") == "bot" else "user"
        messages.append({"role": role, "content": msg.get("content", "")})

    # Add current message
    if file:
        image_extensions = ["png", "jpg", "jpeg", "gif", "webp"]
        ext = file.filename.split(".")[-1].lower() if file.filename else ""
        
        if ext in image_extensions:
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
    else:
        messages.append({"role": "user", "content": message})

    # 4. Call OpenAI (Non-streaming for now to fix frontend JSON error)
    try:
        completion = await client.chat.completions.create(
            model=settings.azure_openai_chat_model,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.7,
            max_tokens=4096,
        )
        
        response_message = completion.choices[0].message
        
        # Handle tools
        if response_message.tool_calls:
            response_message = await handle_tool_calls(response_message, messages, all_references)

        reply = response_message.content or ""
        unique_refs = {ref['document_id'] if 'document_id' in ref else ref['url']: ref for ref in all_references}.values()
        
        # 5. Persist to History if conversation_id provided
        if conversation_id and db is not None:
            now = datetime.now(timezone.utc).isoformat()
            user_msg = {"role": "user", "content": message, "timestamp": now}
            bot_msg = {"role": "agent", "content": reply, "timestamp": now}
            
            await db["messages"].update_one(
                {"conversation_id": conversation_id},
                {"$push": {"messages": {"$each": [user_msg, bot_msg]}}},
                upsert=True
            )
            
            conv = await db["conversations"].find_one({"conversation_id": conversation_id})
            if conv:
                update_fields = {"updated_at": now}
                if conv.get("title") == "New Chat":
                    new_title = (message[:27] + "...") if len(message) > 30 else message
                    update_fields["title"] = new_title
                await db["conversations"].update_one({"_id": conv["_id"]}, {"$set": update_fields})
        
        return ChatResponse(reply=reply, references=list(unique_refs))
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/upload", response_model=ChatResponse)
async def chat_upload(
    file: UploadFile = File(...),
    message: str = Form(...),
    mode: str = Form("llm"),
    history: str = Form("[]"),
    conversation_id: str | None = Form(None),
    user: dict = Depends(get_current_user)
):
    """Handles document uploads, extracts text, and chats."""
    
    file_bytes = await file.read()
    extracted_text = extract_text_from_file(file.filename or "file", file_bytes)
    
    if "Error" in extracted_text or "Unsupported" in extracted_text:
        raise HTTPException(status_code=400, detail=extracted_text)

    full_message = f"User Message: {message}\n\nExtracted Content from {file.filename}:\n{extracted_text}"

    db = db_manager.get_db()
    
    try:
        if conversation_id and db is not None:
            msg_doc = await db["messages"].find_one({"conversation_id": conversation_id})
            if msg_doc:
                db_history = msg_doc.get("messages", [])
                history_list = []
                for m in db_history:
                    role = "bot" if m.get("role") == "agent" else "user"
                    history_list.append({"role": role, "content": m.get("content", "")})
            else:
                history_list = json.loads(history)
        else:
            history_list = json.loads(history)
    except Exception:
        history_list = []

    system_prompt = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["llm"])
    messages: list[dict] = [{"role": "system", "content": system_prompt}]

    for msg in history_list:
        role = "assistant" if msg.get("role") == "bot" else "user"
        messages.append({"role": role, "content": msg.get("content", "")})

    messages.append({"role": "user", "content": full_message})

    completion = await client.chat.completions.create(
        model=settings.azure_openai_chat_model,
        messages=messages,
        temperature=0.7,
        max_tokens=4096,
    )

    reply = completion.choices[0].message.content or ""
    
    # 5. Persist to History if conversation_id provided
    if conversation_id and db is not None:
        now = datetime.now(timezone.utc).isoformat()
        user_msg = {"role": "user", "content": full_message, "timestamp": now}
        bot_msg = {"role": "agent", "content": reply, "timestamp": now}
        
        await db["messages"].update_one(
            {"conversation_id": conversation_id},
            {"$push": {"messages": {"$each": [user_msg, bot_msg]}}},
            upsert=True
        )
        
        conv = await db["conversations"].find_one({"conversation_id": conversation_id})
        if conv:
            update_fields = {"updated_at": now}
            if conv.get("title") == "New Chat":
                new_title = (message[:27] + "...") if len(message) > 30 else message
                update_fields["title"] = new_title
            await db["conversations"].update_one({"_id": conv["_id"]}, {"$set": update_fields})
            
    return ChatResponse(reply=reply, references=[])
