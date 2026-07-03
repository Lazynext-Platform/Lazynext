"""
Basic Edit — Lazynext AI Agent Agent Python SDK

Demonstrates the streaming agent loop: a natural-language prompt is
sent to the Lazynext AI Agent agent, which translates it into CRDT timeline
operations and yields events as they occur.

## Running the Example

```bash
cd packages/agent-sdk-python
python examples/basic-edit.py
```
"""

import asyncio
import os

from lazynext_agent import Lazynext AI AgentAgent

AGENT_ENDPOINT = os.environ.get("LAZYNEXT_API_URL", "http://localhost:8005")


async def main() -> None:
    agent = Lazynext AI AgentAgent(
        api_endpoint=AGENT_ENDPOINT,
        mode="auto_execute",
    )

    prompt = (
        "Add auto-generated captions to the first video track, "
        "then remove any silent segments longer than 1 second."
    )

    print(f"\n  Prompt: {prompt}\n")

    try:
        async for event in agent.query(prompt):
            event_type = event.type
            data = event.data

            if event_type == "thinking":
                print(f"  [thinking] {data.get('thought', '')}")
            elif event_type == "plan":
                print("  [plan] Generated execution plan")
            elif event_type == "tool_call":
                print(f"  [tool_call] {data.get('tool', '')}")
            elif event_type == "tool_result":
                print("  [tool_result] Tool executed")
            elif event_type == "edit_applied":
                print("  [edit_applied] Mutation applied to timeline")
            elif event_type == "status":
                print(f"  [status] {data.get('message', '')}")
            elif event_type == "error":
                print(f"  [error] {data.get('message', '')}")
            elif event_type == "done":
                print(f"\n  Complete: {data.get('summary', '')}")
            else:
                print(f"  [{event_type}] {data}")
    except Exception as exc:
        print(f"Agent query failed: {exc}")
        raise SystemExit(1) from exc


if __name__ == "__main__":
    asyncio.run(main())
