import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from auth import get_current_user
from database import db_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])

class UserSync(BaseModel):
    role: str = "user"

@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """
    Returns the current user's profile including their role from Cosmos DB.
    """
    db = db_manager.get_db()
    if db is None:
        return user # Return Firebase info if DB not connected
    
    users_col = db["users"]
    db_user = await users_col.find_one({"uid": user["uid"]})
    if db_user:
        return {
            "uid": user["uid"],
            "email": db_user.get("email"),
            "name": db_user.get("name"),
            "role": db_user.get("role", "user")
        }
    return user

@router.get("/roles")
async def get_available_roles():
    """
    Returns the list of available roles in the system.
    """
    return ["admin", "finance", "engineering", "user"]

@router.post("/sync")
async def sync_user(body: UserSync = UserSync(), user: dict = Depends(get_current_user)):
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
            {"$set": {"email": email, "name": name, "role": body.role}},
            upsert=True
        )
        logger.info(f"User synced in DB: {email}")
        return {"status": "success", "message": "User synced successfully"}
    except Exception as e:
        logger.error(f"Failed to sync user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to sync user to database")
