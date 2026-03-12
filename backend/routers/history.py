"""
Chat history router — Cosmos DB backed store keyed by user UID.

Endpoints:
  GET    /api/history/conversations          - list all conversations for the current user
  POST   /api/history/conversations          - create a new conversation
  PATCH  /api/history/conversations/{id}/title - edit conversation title
  DELETE /api/history/conversations/{id}     - delete a conversation and its messages
  GET    /api/history/conversations/{id}/messages - get all messages in a conversation
  POST   /api/history/conversations/{id}/messages - append a message to a conversation
  GET    /api/history/conversations/{id}/share    - get a share token
  GET    /api/history/conversations/{id}/export/pdf - export conversation as PDF
  GET    /api/history/shared/{token}         - get a shared conversation (public)
"""

from __future__ import annotations

import uuid
import tempfile
import os
from datetime import datetime, timezone
from fpdf import FPDF

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional

from auth import get_current_user
from database import db_manager

router = APIRouter(prefix="/api/history", tags=["history"])

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class MessageOut(BaseModel):
    role: str
    content: str
    timestamp: str

class ConversationCreate(BaseModel):
    title: str = "New Chat"

class ConversationTitleUpdate(BaseModel):
    title: str

class ConversationOut(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    share_token: Optional[str] = None

class ConversationWithMessagesOut(ConversationOut):
    messages: list[MessageOut] = []

class MessageCreate(BaseModel):
    role: str
    content: str

class ShareResponse(BaseModel):
    share_token: str
    url: str

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def get_db():
    db = db_manager.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return db

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db["conversations"].find({"uid": user["uid"]})
    
    conversations = []
    async for doc in cursor:
        conversations.append(
            ConversationOut(
                id=doc["conversation_id"],
                title=doc.get("title", "New Chat"),
                created_at=doc.get("created_at", ""),
                updated_at=doc.get("updated_at", ""),
                share_token=doc.get("share_token")
            )
        )
        
    # Sort in-memory to avoid Cosmos DB indexing issues on "updated_at"
    conversations.sort(key=lambda x: x.updated_at, reverse=True)
    return conversations

@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(body: ConversationCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    conversation_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    conv_doc = {
        "uid": user["uid"],
        "conversation_id": conversation_id,
        "title": body.title,
        "created_at": now,
        "updated_at": now,
        "share_token": None
    }
    await db["conversations"].insert_one(conv_doc)
    
    msgs_doc = {
        "conversation_id": conversation_id,
        "messages": []
    }
    await db["messages"].insert_one(msgs_doc)
    
    return ConversationOut(
        id=conversation_id,
        title=body.title,
        created_at=now,
        updated_at=now,
        share_token=None
    )

@router.patch("/conversations/{conversation_id}/title", response_model=ConversationOut)
async def edit_conversation_title(conversation_id: str, body: ConversationTitleUpdate, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db["conversations"].find_one({"uid": user["uid"], "conversation_id": conversation_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    now = datetime.now(timezone.utc).isoformat()
    await db["conversations"].update_one(
        {"_id": doc["_id"]},
        {"$set": {"title": body.title, "updated_at": now}}
    )
    
    return ConversationOut(
        id=conversation_id,
        title=body.title,
        created_at=doc.get("created_at", ""),
        updated_at=now,
        share_token=doc.get("share_token")
    )

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    result = await db["conversations"].delete_one({"uid": user["uid"], "conversation_id": conversation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    await db["messages"].delete_many({"conversation_id": conversation_id})

@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
async def get_messages(conversation_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    # Verify ownership
    doc = await db["conversations"].find_one({"uid": user["uid"], "conversation_id": conversation_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    msg_doc = await db["messages"].find_one({"conversation_id": conversation_id})
    if not msg_doc:
        return []
        
    return [MessageOut(**m) for m in msg_doc.get("messages", [])]

@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def add_message(conversation_id: str, body: MessageCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    # Verify ownership
    doc = await db["conversations"].find_one({"uid": user["uid"], "conversation_id": conversation_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    now = datetime.now(timezone.utc).isoformat()
    msg = {
        "role": body.role,
        "content": body.content,
        "timestamp": now,
    }
    
    await db["messages"].update_one(
        {"conversation_id": conversation_id},
        {"$push": {"messages": msg}},
        upsert=True
    )
    
    await db["conversations"].update_one(
        {"_id": doc["_id"]},
        {"$set": {"updated_at": now}}
    )
    
    return MessageOut(**msg)

@router.get("/conversations/{conversation_id}/share", response_model=ShareResponse)
async def share_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db["conversations"].find_one({"uid": user["uid"], "conversation_id": conversation_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    share_token = doc.get("share_token")
    if not share_token:
        share_token = str(uuid.uuid4())
        await db["conversations"].update_one(
            {"_id": doc["_id"]},
            {"$set": {"share_token": share_token}}
        )
        
    return ShareResponse(share_token=share_token, url=f"/shared/{share_token}")

@router.get("/shared/{token}", response_model=ConversationWithMessagesOut)
async def get_shared_conversation(token: str):
    db = get_db()
    doc = await db["conversations"].find_one({"share_token": token})
    if not doc:
        raise HTTPException(status_code=404, detail="Shared conversation not found")
        
    conversation_id = doc["conversation_id"]
    msg_doc = await db["messages"].find_one({"conversation_id": conversation_id})
    messages = []
    if msg_doc:
        messages = [MessageOut(**m) for m in msg_doc.get("messages", [])]
        
    return ConversationWithMessagesOut(
        id=conversation_id,
        title=doc.get("title", "Shared Chat"),
        created_at=doc.get("created_at", ""),
        updated_at=doc.get("updated_at", ""),
        share_token=token,
        messages=messages
    )

@router.get("/conversations/{conversation_id}/export/pdf")
async def export_conversation_pdf(conversation_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db["conversations"].find_one({"uid": user["uid"], "conversation_id": conversation_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    msg_doc = await db["messages"].find_one({"conversation_id": conversation_id})
    messages = msg_doc.get("messages", []) if msg_doc else []
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Title
    pdf.set_font("helvetica", "B", 16)
    title = doc.get("title", "Conversation Export").encode("latin-1", "replace").decode("latin-1")
    pdf.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(10)
    
    for msg in messages:
        role = "User" if msg.get("role") == "user" else "Agent"
        timestamp = msg.get("timestamp", "")
        # Parse timestamp string for display: '2026-03-13T00:11:08+05:30' -> '2026-03-13 00:11:08'
        try:
            display_time = timestamp[:19].replace("T", " ")
        except:
            display_time = timestamp
            
        pdf.set_font("helvetica", "B", 12)
        if role == "Agent":
            pdf.set_text_color(0, 51, 102)
        else:
            pdf.set_text_color(0, 102, 51)
        pdf.cell(0, 8, f"{role} [{display_time}]", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("helvetica", "", 11)
        pdf.set_text_color(0, 0, 0)
        content = msg.get("content", "").encode('latin-1', 'replace').decode('latin-1') 
        pdf.multi_cell(0, 6, content)
        pdf.ln(5)
        
    temp_dir = tempfile.mkdtemp()
    filepath = os.path.join(temp_dir, f"{conversation_id}.pdf")
    pdf.output(filepath)
    
    return FileResponse(
        filepath, 
        media_type="application/pdf", 
        filename=f"conversation_{conversation_id}.pdf"
    )
