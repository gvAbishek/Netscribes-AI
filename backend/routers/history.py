"""
Chat history router — in-memory store keyed by user UID.

Endpoints:
  GET    /api/history          — list all sessions for the current user
  POST   /api/history          — create a new session
  GET    /api/history/{id}     — get all messages in a session
  DELETE /api/history/{id}     — delete a session
  POST   /api/history/{id}/messages — append a message to a session
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth import get_current_user

router = APIRouter(prefix="/api", tags=["history"])

# ---------------------------------------------------------------------------
# In-memory store  (swap out for a DB later)
# ---------------------------------------------------------------------------
# Structure:  { user_uid: { session_id: SessionData } }
_store: dict[str, dict[str, dict]] = {}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str


class SessionOut(BaseModel):
    id: str
    title: str
    last_message: str
    created_at: str
    messages: list[MessageOut] = []


class SessionCreate(BaseModel):
    title: str = "New Chat"


class MessageCreate(BaseModel):
    role: str
    content: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _user_store(uid: str) -> dict[str, dict]:
    if uid not in _store:
        _store[uid] = {}
    return _store[uid]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/history", response_model=list[SessionOut])
async def list_sessions(user: dict = Depends(get_current_user)):
    store = _user_store(user["uid"])
    sessions = []
    for sid, data in store.items():
        msgs = data.get("messages", [])
        sessions.append(
            SessionOut(
                id=sid,
                title=data["title"],
                last_message=msgs[-1]["content"] if msgs else "",
                created_at=data["created_at"],
            )
        )
    # Most recent first
    sessions.sort(key=lambda s: s.created_at, reverse=True)
    return sessions


@router.post("/history", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(body: SessionCreate, user: dict = Depends(get_current_user)):
    store = _user_store(user["uid"])
    sid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    store[sid] = {"title": body.title, "created_at": now, "messages": []}
    return SessionOut(id=sid, title=body.title, last_message="", created_at=now)


@router.get("/history/{session_id}", response_model=SessionOut)
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    store = _user_store(user["uid"])
    data = store.get(session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    msgs = [MessageOut(**m) for m in data["messages"]]
    return SessionOut(
        id=session_id,
        title=data["title"],
        last_message=msgs[-1].content if msgs else "",
        created_at=data["created_at"],
        messages=msgs,
    )


@router.delete("/history/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    store = _user_store(user["uid"])
    if session_id not in store:
        raise HTTPException(status_code=404, detail="Session not found")
    del store[session_id]


@router.post("/history/{session_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def add_message(session_id: str, body: MessageCreate, user: dict = Depends(get_current_user)):
    store = _user_store(user["uid"])
    data = store.get(session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    msg = {
        "id": str(uuid.uuid4()),
        "role": body.role,
        "content": body.content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    data["messages"].append(msg)
    return MessageOut(**msg)
