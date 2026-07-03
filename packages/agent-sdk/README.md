# Lazynext AI Agent Agent SDK

Programmatic SDK for the Lazynext Lazynext AI Agent AI Copilot — a reusable agent loop that translates natural language into CRDT timeline operations. Available in **TypeScript** and **Python**.

## Quick Start

### TypeScript

```bash
cd packages/agent-sdk
```

```ts
import { Lazynext AI AgentAgent } from "@lazynext/agent-sdk";

const agent = new Lazynext AI AgentAgent({
  apiEndpoint: "http://localhost:8005",
  mode: "auto_execute",
});

for await (const event of agent.query("Add captions and remove silences")) {
  console.log(`[${event.type}]`, event.data);
}
```

### Python

```bash
cd packages/agent-sdk-python
pip install -e .
```

```python
import asyncio
from lazynext_agent import Lazynext AI AgentAgent

async def main():
    agent = Lazynext AI AgentAgent(api_endpoint="http://localhost:8005", mode="auto_execute")

    async for event in agent.query("Add captions and remove silences"):
        print(f"[{event.type}]", event.data)

asyncio.run(main())
```

## API Reference

### `Lazynext AI AgentAgent`

| Method | Description |
| --- | --- |
| `query(prompt)` | Stream NL → CRDT timeline operations |
| `search(query)` | Search the timeline for clips/markers |
| `executeSlashCommand(cmd)` | Execute a slash command |
| `getMemory()` | Access conversation memory |
| `addRule(rule)` | Add a behavioural rule |
| `getSuggestions()` | Get proactive suggestions |
| `applySuggestion(id)` | Apply a suggestion |
| `runAudit()` | Run full project audit |

### Agent Modes

| Mode | Behaviour |
| --- | --- |
| `auto_execute` | Plan and execute automatically |
| `plan_only` | Generate a plan, pause for review |
| `suggest` | Propose edits without applying |

### Tools

90 MCP tools across 6 categories: editing, audio, color, export, AI, project.

```ts
import { getAvailableTools, getToolsByCategory, ToolCategory } from "@lazynext/agent-sdk";

const all = getAvailableTools();
const audioTools = getToolsByCategory(ToolCategory.Audio);
```

### Memory

```ts
import { MemoryManager } from "@lazynext/agent-sdk";

const mem = new MemoryManager();
mem.remember("target_lufs", -16);
const lufs = mem.recall<number>("target_lufs");
```

### Rules

```ts
import { RulesManager } from "@lazynext/agent-sdk";

const rules = new RulesManager();
await rules.loadRules([".lazynext/rules/"]);
rules.addRule({ paths: ["audio/**"], content: "Normalize to -16 LUFS", priority: "high" });
```

## Architecture

```
┌─────────────────┐     HTTP/SSE      ┌──────────────────┐
│  Lazynext AI Agent Agent  │ ◄──────────────► │  API Gateway     │
│  SDK (TS / Py)  │                   │  (Axum :8005)    │
└─────────────────┘                   └────────┬─────────┘
                                               │
                                    ┌──────────┴──────────┐
                                    │  Lazynext AI Agent AI Copilot │
                                    │  NL → CRDT Engine   │
                                    └─────────────────────┘
```

Both SDKs communicate with the Lazynext API Gateway via HTTP. Streaming responses use Server-Sent Events (SSE).
