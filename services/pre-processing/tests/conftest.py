"""Test configuration — bypasses JWT auth for unit tests.

The production ``get_auth_claims`` dependency is overridden via FastAPI's
``dependency_overrides`` so tests can exercise endpoint logic without minting
real Better Auth JWTs. This is test-only and does not weaken production
security in any way.
"""

import pytest

from src.main import app
from src.auth import get_auth_claims


@pytest.fixture(autouse=True)
def bypass_auth():
	"""Override JWT auth dependency for every test."""
	app.dependency_overrides[get_auth_claims] = lambda: {
		"sub": "test-user",
		"email": "test@lazynext.test",
	}
	yield
	app.dependency_overrides.clear()
