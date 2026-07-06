"""
JWT Auth Middleware for Lazynext Python services.

Validates Better Auth HS256 JWTs against BETTER_AUTH_SECRET.
Also supports BETTER_AUTH_SECRET_FILE for Docker secret mounting.
Exports a FastAPI dependency for use in route definitions.

Security: No default fallback secret is provided. The service will
raise a RuntimeError on import if no secret is configured, preventing
accidental insecure deployments.
"""

import os
from typing import Optional
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError


def _read_secret(env_var: str, file_var: str) -> str:
    secret = os.environ.get(env_var, "")
    if secret:
        return secret
    file_path = os.environ.get(file_var, "")
    if file_path:
        try:
            with open(file_path, "r") as f:
                content = f.read().strip()
            if content:
                return content
        except OSError:
            pass
        raise RuntimeError(
            f"FATAL: {file_var} is set to '{file_path}' but the file is empty or unreadable."
        )
    raise RuntimeError(
        f"FATAL: Neither {env_var} nor {file_var} is set. "
        f"Set {env_var} to a 64-char random hex string."
    )


SECRET = _read_secret("BETTER_AUTH_SECRET", "BETTER_AUTH_SECRET_FILE")

security = HTTPBearer(auto_error=False)


async def get_auth_claims(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Validate JWT token and return claims. Raises 401 on failure."""
    token = None

    if credentials:
        token = credentials.credentials
    else:
        # Check query parameter as fallback
        token = request.query_params.get("token")

    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    try:
        claims = jwt.decode(token, SECRET, algorithms=["HS256"], options={"verify_exp": True})
        return claims
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def optional_auth(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """Optional auth — returns claims if valid token present, None otherwise."""
    try:
        return await get_auth_claims(request, credentials)
    except HTTPException:
        return None
