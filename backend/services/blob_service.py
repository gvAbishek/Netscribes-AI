import logging
from datetime import datetime, timedelta, timezone
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from azure.core.exceptions import ResourceNotFoundError
import certifi
from config import settings

logger = logging.getLogger(__name__)

class BlobService:
    def __init__(self):
        self.connection_string = settings.azure_storage_connection_string
        if not self.connection_string:
            logger.warning("AZURE_STORAGE_CONNECTION_STRING not set. Blob operations will fail.")
        # Parse account name and key from connection string for SAS generation
        self.account_name = None
        self.account_key = None
        if self.connection_string:
            parts = dict(part.split("=", 1) for part in self.connection_string.split(";") if "=" in part)
            self.account_name = parts.get("AccountName")
            self.account_key = parts.get("AccountKey")

    def _get_client(self):
        return BlobServiceClient.from_connection_string(
            self.connection_string,
            connection_verify=certifi.where()
        )

    def upload_document(self, file_content: bytes, filename: str, container_name: str = "abishek-rag-documents") -> str:
        if not self.connection_string:
            raise ValueError("Azure Blob Storage connection string is not set")

        client = self._get_client()
        container_client = client.get_container_client(container_name)
        
        try:
            logger.info(f"Uploading {filename} to {container_name} (Sync)")
            blob_client = container_client.get_blob_client(filename)
            blob_client.upload_blob(file_content, overwrite=True)
            logger.info(f"Upload successful: {blob_client.url}")
            return blob_client.url
        except ResourceNotFoundError:
            logger.info(f"Container {container_name} not found. Creating...")
            container_client.create_container()
            blob_client = container_client.get_blob_client(filename)
            blob_client.upload_blob(file_content, overwrite=True)
            return blob_client.url
        except Exception as e:
            logger.error(f"Blob upload failed: {e}")
            raise

    def get_sas_url(self, filename: str, container_name: str = "abishek-rag-documents", expiry_minutes: int = 15) -> str:
        """Generate a temporary SAS URL for a blob so Azure services can access it directly."""
        if not self.account_name or not self.account_key:
            raise ValueError("Cannot generate SAS URL: account name or key not available")
        
        sas_token = generate_blob_sas(
            account_name=self.account_name,
            container_name=container_name,
            blob_name=filename,
            account_key=self.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)
        )
        sas_url = f"https://{self.account_name}.blob.core.windows.net/{container_name}/{filename}?{sas_token}"
        logger.info(f"Generated SAS URL for {filename} (expires in {expiry_minutes} min)")
        return sas_url

    def download_blob(self, filename: str, container_name: str = "abishek-rag-documents") -> bytes:
        if not self.connection_string:
            raise ValueError("Azure Blob Storage connection string is not set")
        
        client = self._get_client()
        container_client = client.get_container_client(container_name)
        blob_client = container_client.get_blob_client(filename)
        try:
            logger.info(f"Downloading blob: {filename} (Sync)")
            return blob_client.download_blob().readall()
        except Exception as e:
            logger.error(f"Blob download failed: {e}")
            raise

blob_service = BlobService()
