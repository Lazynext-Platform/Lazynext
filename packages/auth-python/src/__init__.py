"""
Lazynext Auth SDK — Python

Shared JWT authentication utilities for the Lazynext Python microservices
(generative-studio, pre-processing). Validates HS256 tokens issued by the
main auth provider (better-auth), with Docker secret mounting support.

Usage:
    from lazynext_auth import get_auth_claims, optional_auth

    @app.get("/secure")
    async def secure_endpoint(claims: dict = Depends(get_auth_claims)):
        return {"user_id": claims["sub"]}
"""

from lazynext_auth.auth import get_auth_claims, optional_auth

__all__ = ["get_auth_claims", "optional_auth"]
