import logging
from datetime import datetime
import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from auth import get_current_user
from database import db_manager
from services.blob_service import blob_service
from services.rag_pipeline import rag_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

class DocumentOut(BaseModel):
    id: str
    name: str
    description: str
    blobUrl: str
    uploadedBy: str
    uploadedAt: str
    status: str
    allowedRoles: List[str]

@router.post("/documents")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    description: str = Form(...),
    allowedRoles: str = Form("[]"), # JSON string because of multipart/form-data
    user: dict | None = Depends(lambda: None) # Make auth optional
):
    """
    Admin: Upload a document, save metadata to Cosmos DB, and trigger background indexing.
    """
    # 1. Verify admin privilege (check how roles are stored in your system)
    # For now, we trust the Firebase sync has set the role or based on logic.
    # We should ideally check the DB role here.
    db = db_manager.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    # Temporary: Allow anyone to access for now
    """
    users_col = db["users"]
    db_user = await users_col.find_one({"uid": user["uid"]})
    if not db_user or db_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can upload documents")
    """

    # 2. Upload to Blob Storage
    try:
        content = await file.read()
        # blob_service.upload_document is now sync, so we use to_thread
        blob_url = await asyncio.to_thread(blob_service.upload_document, content, file.filename)
    except Exception as e:
        logger.error(f"Blob upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Blob upload failed: {str(e)}")

    # 3. Save to Cosmos DB (test.rag_documents)
    import json
    try:
        roles_list = json.loads(allowedRoles)
    except:
        roles_list = []

    doc_metadata = {
        "name": file.filename,
        "description": description,
        "blobUrl": blob_url,
        "uploadedBy": "Admin (Public)",
        "uploadedAt": datetime.utcnow().isoformat(),
        "status": "processing",
        "allowedRoles": roles_list
    }

    docs_col = db["rag_documents"]
    result = await docs_col.insert_one(doc_metadata)
    doc_id = str(result.inserted_id)

    # 4. Trigger Background Pipeline
    background_tasks.add_task(rag_pipeline.process_document, doc_id)

    return {"status": "success", "documentId": doc_id, "blobUrl": blob_url}

@router.get("/documents", response_model=List[DocumentOut])
async def list_documents(user: dict | None = Depends(lambda: None)):
    db = db_manager.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    docs_col = db["rag_documents"]
    cursor = docs_col.find()
    documents = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        documents.append(DocumentOut(**doc))
    
    # Sort in memory since Cosmos DB indexing might exclude uploadedAt
    documents.sort(key=lambda x: x.uploadedAt, reverse=True)
    return documents

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict | None = Depends(lambda: None)):
    db = db_manager.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    # Check for admin
    # Temporary: Allow anyone to access for now
    """
    users_col = db["users"]
    db_user = await users_col.find_one({"uid": user["uid"]})
    if not db_user or db_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete documents")
    """

    from bson import ObjectId
    docs_col = db["rag_documents"]
    await docs_col.delete_one({"_id": ObjectId(doc_id)})
    
    # TODO: In later phases, also delete from Azure Search chunks
    return {"status": "success", "message": "Document deleted"}
