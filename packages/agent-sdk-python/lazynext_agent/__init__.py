"""
Lazynext AI Agent Agent Python SDK

Programmatic access to the Lazynext AI Agent agent loop for NLE timeline
operations. Natural language prompts are translated into CRDT
timeline mutations via the Lazynext API Gateway.

## Quick Start

```python
import asyncio
from lazynext_agent import Lazynext AI AgentAgent

async def main():
    agent = Lazynext AI AgentAgent(api_endpoint="http://localhost:8005", mode="auto_execute")

    async for event in agent.query("Add captions and remove silences"):
        print(f"[{event.type}]", event.data)

asyncio.run(main())
```
"""

from __future__ import annotations

import json
from typing import AsyncIterator

import httpx

from .memory import MemoryManager  # noqa: F401 — re-exported
from .models import (  # noqa: F401 — re-exported
    AgentEvent,
    AgentOptions,
    AgentSuggestion,
    AuditFinding,
    AuditSuggestion,
    CommandResult,
    ConversationMemory,
    MemoryTurn,
    RuleConfig,
    SearchResult,
    TimelineAudit,
)
from .tools import (  # noqa: F401 — re-exported
    ToolCategory,
    ToolDefinition,
    get_available_tools,
    get_tools_by_category,
)


class Lazynext AI AgentAgent:
    """Primary entry point for the Lazynext AI Agent agent.

    Communicates with the Lazynext API Gateway to translate natural
    language into CRDT timeline operations.
    """

    def __init__(self, api_endpoint: str, **kwargs: object) -> None:
        options = AgentOptions(api_endpoint=api_endpoint, **kwargs)
        self._api_endpoint: str = options.api_endpoint.rstrip("/")
        self._api_key: str | None = options.api_key
        self._mode: str = options.mode
        self._allowed_tools: list[str] = options.allowed_tools
        self._rules: list[RuleConfig] = options.rules

    # ── HTTP helpers ──────────────────────────────────────────────────

    def _headers(self) -> dict[str, str]:
        h: dict[str, str] = {"Content-Type": "application/json"}
        if self._api_key:
            h["Authorization"] = f"Bearer {self._api_key}"
        return h

    async def _get(self, path: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self._api_endpoint}{path}",
                headers=self._headers(),
            )
        if resp.status_code != 200:
            raise RuntimeError(
                f"Lazynext AI Agent API error {resp.status_code} on GET {path}: {resp.text}"
            )
        return resp.json()

    async def _post(self, path: str, body: dict) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._api_endpoint}{path}",
                headers=self._headers(),
                json=body,
            )
        if resp.status_code != 200:
            raise RuntimeError(
                f"Lazynext AI Agent API error {resp.status_code} on POST {path}: {resp.text}"
            )
        return resp.json()

    async def _post_stream(self, path: str, body: dict) -> AsyncIterator[AgentEvent]:
        headers = {**self._headers(), "Accept": "text/event-stream"}
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self._api_endpoint}{path}",
                headers=headers,
                json=body,
            ) as resp:
                if resp.status_code != 200:
                    text = await resp.aread()
                    raise RuntimeError(
                        f"Lazynext AI Agent API error {resp.status_code} on POST {path}: {text.decode()}"
                    )
                async for line in resp.aiter_lines():
                    trimmed = line.strip()
                    if trimmed.startswith("data: "):
                        json_str = trimmed[6:]
                        if json_str == "[DONE]":
                            return
                        yield AgentEvent(**json.loads(json_str))

    # ── Public API ────────────────────────────────────────────────────

    async def query(self, prompt: str) -> AsyncIterator[AgentEvent]:
        """Send a natural-language prompt and stream the agent's execution.

        Returns an async iterator of :class:`AgentEvent` objects.
        """
        async for event in self._post_stream(
            "/api/v1/lazynext-ai/stream",
            {"prompt": prompt, "mode": self._mode, "tools": self._allowed_tools},
        ):
            yield event

    async def search(self, query: str) -> list[SearchResult]:
        """Search the current project timeline.

        Returns a list of :class:`SearchResult` objects.
        """
        data = await self._post("/api/v1/lazynext-ai/search", {"query": query})
        return [SearchResult(**item) for item in data]

    async def execute_slash_command(self, command: str) -> CommandResult:
        """Execute a slash command by name (e.g. ``/export``, ``/render``)."""
        data = await self._post("/api/v1/lazynext-ai/slash", {"command": command})
        return CommandResult(**data)

    async def get_memory(self) -> ConversationMemory:
        """Retrieve the agent's conversation memory for the current session."""
        data = await self._get("/api/v1/lazynext-ai/memory")
        return ConversationMemory(**data)

    def add_rule(self, rule: RuleConfig) -> None:
        """Register a custom behavioural rule for the agent loop."""
        self._rules.append(rule)

    async def get_suggestions(self) -> list[AgentSuggestion]:
        """Ask the agent to generate proactive suggestions."""
        data = await self._get("/api/v1/lazynext-ai/suggestions")
        return [AgentSuggestion(**item) for item in data]

    async def apply_suggestion(self, suggestion_id: str) -> bool:
        """Apply a previously-retrieved suggestion by its ``id``."""
        data = await self._post(
            f"/api/v1/lazynext-ai/suggestions/{suggestion_id}/apply", {}
        )
        return bool(data.get("applied", False))

    async def run_audit(self) -> TimelineAudit:
        """Run a full audit of the current timeline."""
        data = await self._post("/api/v1/lazynext-ai/audit", {})
        return TimelineAudit(**data)
