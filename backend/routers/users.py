import logging
from fastapi import APIRouter, Depends, HTTPException, status
from auth import get_current_user
from database import db_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/sync")
async def sync_user(user: dict = Depends(get_current_user)):
    """
    Syncs the Firebase authenticated user into Cosmos DB.
    """
    db = db_manager.get_db()
    if db is None:
        logger.error("Cosmos DB is not initialized.")
        raise HTTPException(status_code=500, detail="Database not connected")

    users_col = db["users"]
    
    uid = user.get("uid")
    email = user.get("email")
    name = user.get("name")
    
    try:
        await users_col.update_one(
            {"uid": uid},
            {"$set": {"email": email, "name": name}},
            upsert=True
        )
        logger.info(f"User synced in DB: {email}")
        return {"status": "success", "message": "User synced successfully"}
    except Exception as e:
        logger.error(f"Failed to sync user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to sync user to database")
