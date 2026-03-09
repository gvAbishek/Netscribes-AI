"""
Pydantic Settings — reads environment variables from backend/.env
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Azure OpenAI
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_model: str = "gpt-4o"
    azure_openai_api_version: str = "2024-12-01-preview"

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

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
