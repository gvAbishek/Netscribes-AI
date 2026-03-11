import logging
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    def connect(cls):
        if not settings.cosmos_db_url:
            logger.warning("No Cosmos DB URL configured. Database will not be initialized.")
            return

        try:
            cls.client = AsyncIOMotorClient(
                settings.cosmos_db_url,
                tlsCAFile=certifi.where()
            )
            cls.db = cls.client[settings.cosmos_db_name]
            logger.info(f"Successfully connected to Cosmos DB: {settings.cosmos_db_name}")
        except Exception as e:
            logger.error(f"Failed to connect to Cosmos DB: {e}")
            raise e

    @classmethod
    def disconnect(cls):
        if cls.client:
            cls.client.close()
            logger.info("Disconnected from Cosmos DB.")

    @classmethod
    def get_db(cls):
        return cls.db

db_manager = DatabaseManager()
