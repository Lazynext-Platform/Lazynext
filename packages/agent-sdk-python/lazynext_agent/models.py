"""
Pydantic models for the Lazynext AI Agent Agent Python SDK.

Every type shared between the agent and the API Gateway is
defined here using Pydantic v2 for automatic validation and
serialisation.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


# ── Agent Configuration ─────────────────────────────────────────────────

AgentMode = Literal["auto_execute", "plan_only", "suggest"]
RulePriority = Literal["low", "medium", "high", "critical"]


class RuleConfig(BaseModel):
    """Configuration for a single behavioural rule."""

    paths: list[str]
    content: str
    priority: RulePriority = "medium"


class AgentOptions(BaseModel):
    """Options passed to the Lazynext AI AgentAgent constructor."""

    api_endpoint: str
    api_key: str | None = None
    mode: AgentMode = "auto_execute"
    allowed_tools: list[str] = Field(default_factory=list)
    rules: list[RuleConfig] = Field(default_factory=list)


# ── Streaming Events ────────────────────────────────────────────────────

AgentEventType = Literal[
    "thinking",
    "plan",
    "tool_call",
    "tool_result",
    "timeline_snapshot",
    "edit_applied",
    "status",
    "error",
    "done",
]


class AgentEvent(BaseModel):
    """A single event yielded by the streaming agent loop."""

    type: AgentEventType
    data: dict = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ── Search ──────────────────────────────────────────────────────────────

class SearchResultItem(BaseModel):
    """The matched timeline item."""

    id: str
    type: str
    name: str
    start: float
    end: float


class SearchResult(BaseModel):
    """A single search result from agent.search()."""

    score: float
    item: SearchResultItem
    context: str


# ── Slash Commands ──────────────────────────────────────────────────────

class CommandResult(BaseModel):
    """Result of executing a slash command."""

    success: bool
    message: str
    output: dict | None = None


# ── Suggestions ─────────────────────────────────────────────────────────

SuggestionCategory = Literal[
    "optimization", "continuity", "audio", "export", "accessibility"
]
SuggestionRisk = Literal["low", "medium", "high"]


class AgentSuggestion(BaseModel):
    """A proactive agent suggestion."""

    id: str
    title: str
    category: SuggestionCategory
    risk: SuggestionRisk
    reasoning: str


# ── Memory ──────────────────────────────────────────────────────────────

class MemoryTurn(BaseModel):
    """A single turn in the conversation memory."""

    role: Literal["user", "agent", "system"]
    content: str
    timestamp: str


class ConversationMemory(BaseModel):
    """Conversation memory returned by the agent."""

    turns: list[MemoryTurn]
    summary: str


# ── Audit ───────────────────────────────────────────────────────────────

AuditSeverity = Literal["info", "warning", "error"]
AuditEffort = Literal["low", "medium", "high"]


class AuditLocation(BaseModel):
    """Timeline position where an issue was found."""

    start: float
    end: float


class AuditFinding(BaseModel):
    """A single finding from a timeline audit."""

    severity: AuditSeverity
    category: str
    description: str
    location: AuditLocation


class AuditSuggestion(BaseModel):
    """A single recommendation from a timeline audit."""

    category: str
    description: str
    effort: AuditEffort


class TimelineAudit(BaseModel):
    """Full timeline audit."""

    findings: list[AuditFinding]
    suggestions: list[AuditSuggestion]
