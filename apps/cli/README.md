# CLI (`@lazynext/cli`)

Command-line tool for orchestrating autonomous video edits through the Lazynext API Gateway.

## Commands

```bash
# Execute an autonomous edit with a natural language prompt
lazynext edit --prompt "remove silences and add music"

# Agentic workflow (multi-step orchestration)
lazynext prompt "make a 60-second recap video"
```

## Architecture

- Built with [Commander](https://github.com/tj/commander.js).
- Sends POST requests to the API Gateway at `http://localhost:8005/v1/execute`.
- Polls job status every second until completion or failure.
- Agentic mode includes a `"mode": "agentic"` flag in the request payload for multi-step AI workflows.

## Usage

```bash
bun run dev                     # Run directly with Bun
bun run build && node dist/index.js edit --prompt "..."
```
