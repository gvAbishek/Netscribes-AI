"""
Firebase Auth — verifies Firebase ID tokens sent from the frontend.

Uses Google's public certificates + PyJWT to verify tokens.
No service account JSON file needed.
"""

import logging
import jwt
import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Google public keys for Firebase ID token verification
# ---------------------------------------------------------------------------
GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
FIREBASE_ISSUER = f"https://securetoken.google.com/{settings.firebase_project_id}"

_cached_certs: dict | None = None


def _get_google_certs() -> dict:
    """Fetch and cache Google's public certificates."""
    global _cached_certs
    if _cached_certs is None:
        logger.debug("Fetching Google public certs...")
        resp = requests.get(GOOGLE_CERTS_URL, timeout=10)
        resp.raise_for_status()
        _cached_certs = resp.json()
        logger.debug(f"Fetched {len(_cached_certs)} certs")
    return _cached_certs


def _verify_firebase_token(token: str) -> dict:
    """
    Verify a Firebase ID token using Google's public keys.
    Returns the decoded token payload.
    """
    # Get the key ID from the token header
    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.exceptions.DecodeError as exc:
        raise ValueError(f"Invalid token header: {exc}")

    kid = unverified_header.get("kid")
    if not kid:
        raise ValueError("Token header missing 'kid' field")

    # Get Google's public certs
    certs = _get_google_certs()
    cert_pem = certs.get(kid)

    if not cert_pem:
        # Refresh certs in case they rotated
        global _cached_certs
        _cached_certs = None
        certs = _get_google_certs()
        cert_pem = certs.get(kid)

    if not cert_pem:
        raise ValueError(f"No matching certificate found for kid: {kid}")

    # Decode and verify the token
    from cryptography.x509 import load_pem_x509_certificate

    cert_obj = load_pem_x509_certificate(cert_pem.encode())
    public_key = cert_obj.public_key()

    decoded = jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        audience=settings.firebase_project_id,
        issuer=FIREBASE_ISSUER,
    )

    # Additional checks
    if not decoded.get("sub"):
        raise ValueError("Token missing 'sub' claim")

    return decoded


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
_bearer = HTTPBearer()


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """
    Verify the Firebase ID token from the Authorization header and return
    a dict with uid, email, and name.
    """
    token = creds.credentials
    try:
        decoded = _verify_firebase_token(token)
        user_info = {
            "uid": decoded["sub"],
            "email": decoded.get("email", ""),
            "name": decoded.get("name", decoded.get("email", "")),
        }
        logger.info(f"Authenticated user: {user_info['email']}")
        return user_info
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
        )
    except Exception as exc:
        logger.error(f"Token verification failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {exc}",
        )
