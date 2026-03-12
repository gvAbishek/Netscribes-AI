from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Azure OpenAI Chat
    azure_openai_chat_endpoint: str = ""
    azure_openai_chat_key: str = ""
    azure_openai_chat_model: str = "gpt-4o"
    
    # Azure OpenAI Embedding
    azure_openai_embedding_endpoint: str = ""
    azure_openai_embedding_key: str = ""
    azure_openai_embedding_model: str = "text-embedding-3-large"
    
    # Common
    azure_openai_api_version: str = "2024-02-01"

    # Azure Services
    azure_storage_connection_string: str = ""
    azure_di_endpoint: str = ""
    azure_di_key: str = ""
    azure_search_endpoint: str = ""
    azure_search_key: str = ""

    # Cosmos DB
    cosmos_db_url: str = ""
    cosmos_db_name: str = "test"

    # Firebase
    firebase_project_id: str = "teamtokencartel"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

settings = Settings()
print(f"DEBUG: Config Loaded. DI_KEY presence: {bool(settings.azure_di_key)}, SEARCH_KEY presence: {bool(settings.azure_search_key)}")
