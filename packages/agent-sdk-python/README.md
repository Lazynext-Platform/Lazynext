# Lazynext Agent SDK (Python)

Python SDK for building AI agents that control the Lazynext NLE via natural language.

## Installation

```bash
pip install lazynext-agent-sdk
```

## Usage

```python
from lazynext_agent_sdk import LazynextClient

client = LazynextClient(api_key="...")
client.send_prompt("Add a cinematic intro with fade-in and bold title")
```
