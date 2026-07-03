"""
Memory management for the Lazynext AI Agent Agent Python SDK.

Provides an in-process key-value store with summarisation capabilities,
mirroring the TypeScript MemoryManager API.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Generic, TypeVar

T = TypeVar("T")


class MemoryManager:
    """In-process key-value store with summarisation.

    Useful for:
    - Caching agent preferences across queries
    - Storing intermediate results the agent may re-use
    - Building a working set that can be summarised for the LLM
    """

    def __init__(self) -> None:
        self._store: dict[str, tuple[object, float]] = {}

    def remember(self, key: str, value: object) -> None:
        """Store a value under the given key.

        Overwrites any existing entry with the same key.
        """
        self._store[key] = (value, datetime.now(timezone.utc).timestamp())

    def recall(self, key: str, default: T | None = None) -> T | None:
        """Retrieve a previously stored value.

        Returns *default* when the key does not exist.
        """
        entry = self._store.get(key)
        if entry is None:
            return default
        return entry[0]  # type: ignore[return-value]

    def forget(self, key: str) -> bool:
        """Remove a single key from the store.

        Returns ``True`` if the key existed, ``False`` otherwise.
        """
        if key in self._store:
            del self._store[key]
            return True
        return False

    def has(self, key: str) -> bool:
        """Check whether a key exists in the store."""
        return key in self._store

    def keys(self) -> list[str]:
        """Return all keys currently in the store."""
        return list(self._store.keys())

    def summarize(self) -> str:
        """Generate a human-readable summary of all stored entries."""
        if not self._store:
            return "(empty)"

        lines: list[str] = []
        for key, (value, _ts) in self._store.items():
            val = value if isinstance(value, str) else json.dumps(value)
            lines.append(f"- {key}: {val}")
        return "\n".join(lines)

    def to_dict(self) -> dict[str, dict[str, object]]:
        """Return all entries as a plain dict (suitable for JSON serialisation)."""
        result: dict[str, dict[str, object]] = {}
        for key, (value, ts) in self._store.items():
            result[key] = {
                "value": value,
                "timestamp": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
            }
        return result

    def clear(self) -> None:
        """Remove all entries from the store."""
        self._store.clear()

    @property
    def size(self) -> int:
        """Return the number of entries currently stored."""
        return len(self._store)
