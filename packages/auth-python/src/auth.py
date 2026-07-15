"""
JWT Auth Middleware for Lazynext Python services.

Validates Better Auth HS256 JWTs against BETTER_AUTH_SECRET.
Also supports BETTER_AUTH_SECRET_FILE for Docker secret mounting.
Exports a FastAPI dependency for use in route definitions.

Security: No default fallback secret is provided. The service will
raise a RuntimeError on import if no secret is configured, preventing
accidental insecure deployments.

Supports tokens from: email/password, Google, Apple, Microsoft OAuth,
Magic Link, Passkeys, SSO/OIDC, and MFA-verified sessions.
"""

import os
from typing import Optional, Dict, Any
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


class AuthClaims:
    """Parsed JWT claims from a better-auth token."""

    def __init__(self, claims: Dict[str, Any]):
        self.sub: str = claims.get("sub", "")
        self.email: str = claims.get("email", "")
        self.name: Optional[str] = claims.get("name")
        self.role: str = claims.get("role", "user")
        self.email_verified: bool = claims.get("email_verified", False)
        self.provider: Optional[str] = claims.get("provider")
        self.mfa_verified: bool = claims.get("mfa_verified", False)
        self.mfa_enabled: bool = claims.get("mfa_enabled", False)
        self.iat: int = claims.get("iat", 0)
        self.exp: int = claims.get("exp", 0)
        self._claims = claims

    def is_admin(self) -> bool:
        return self.role in ("admin", "superadmin")

    def is_editor(self) -> bool:
        return self.role in ("admin", "superadmin", "editor", "creator", "pro")

    def has_mfa(self) -> bool:
        """Returns True if MFA is either not enabled or verified."""
        return not self.mfa_enabled or self.mfa_verified

    def to_dict(self) -> Dict[str, Any]:
        return {**self._claims}


async def get_auth_claims(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthClaims:
    """Validate the request's JWT and return its decoded claims.

    Accepts the token from the ``Authorization: Bearer`` header or, as a
    fallback, a ``token`` query parameter (for SSE/WebSocket clients).

    Args:
        request: The incoming FastAPI request.
        credentials: Bearer credentials extracted by the security scheme.

    Returns:
        The decoded JWT claims as an ``AuthClaims`` object.

    Raises:
        HTTPException: 401 if the token is missing, expired, or invalid.
    """
    token = None

    if credentials:
        token = credentials.credentials
    else:
        token = request.query_params.get("token")

    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    try:
        claims = jwt.decode(
            token,
            SECRET,
            algorithms=["HS256"],
            options={"verify_exp": True},
        )
        return AuthClaims(claims)
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def optional_auth(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[AuthClaims]:
    """Validate auth if present, without requiring it.

    Args:
        request: The incoming FastAPI request.
        credentials: Bearer credentials extracted by the security scheme.

    Returns:
        The decoded JWT claims if a valid token is present, otherwise ``None``.
    """
    try:
        return await get_auth_claims(request, credentials)
    except HTTPException:
        return None


async def require_mfa(
    claims: AuthClaims = Depends(get_auth_claims),
) -> AuthClaims:
    """Require MFA verification on the session token.

    If the user has MFA enabled but the session is not MFA-verified,
    returns 403 Forbidden.

    Args:
        claims: The decoded JWT claims from ``get_auth_claims``.

    Returns:
        The same ``AuthClaims`` if MFA is satisfied.

    Raises:
        HTTPException: 403 if MFA is enabled but not verified on this session.
    """
    if not claims.has_mfa():
        raise HTTPException(
            status_code=403,
            detail="MFA verification required for this endpoint",
        )
    return claims
