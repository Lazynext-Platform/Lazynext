# Lazynext CLI

A command-line interface for Lazynext — talk to your local (or remote) Lazynext
server from the terminal. The CLI uses the [API Gateway](../docs/api-gateway.md)
(`/api/v1`) and works for developers, scripting, and power users.

## Install

```bash
# From the repo (builds the CLI to cli/dist)
npm run cli:build

# Link globally so `lazynext` is on your PATH
npm link
```

Or run without building via tsx: `npm run cli:dev -- <command>`.

## Configure

```bash
lazynext config set --url http://localhost:5199 --key <LAZYNEXT_API_KEY>
lazynext config show
```

Configuration precedence: `--url`/`--key` flags > `LAZYNEXT_URL`/`LAZYNEXT_API_KEY`
env > `~/.lazynext/cli.json` > defaults. The API key is the same value configured
for the gateway (`LAZYNEXT_API_KEY` in the server's `.env`).

## Commands

| Command | Description |
|---|---|
| `status` | Server status and capabilities |
| `projects list` | List projects (`--include-deleted`) |
| `projects create` | Create a project (`--name`, `--description`, `--fps`, `--width`, `--height`) |
| `projects get <id>` | Print a project document |
| `projects delete <id>` | Delete a project (`--purge` to remove the document) |
| `media list` | List uploaded media |
| `media upload <file>` | Upload a media file |
| `media download <name>` | Download media (`--out <path>`) |
| `search <query>` | Full-text search (`--project`, `--limit`) |
| `agent tools` | List MCP agent tools |
| `agent mcp` | MCP endpoint discovery info |
| `config set` / `config show` | Manage CLI configuration |
| `open [project-id]` | Open the editor in your browser |
| `version` / `help` | Version / help |

Add `--json` to any command for raw JSON output (pipe to `jq` for scripting).

## Examples

```bash
# Create a project and capture its id
ID=$(lazynext projects create --name "Demo" --json | jq -r .id)

# Upload a clip and open the project
lazynext media upload ./clip.mp4
lazynext open $ID

# List agent tools available to MCP clients
lazynext agent tools
```

## Programmatic agent editing

The CLI exposes discovery (`agent tools`, `agent mcp`) for the MCP surface.
For full agent-driven editing (begin edit session, edit timeline, review),
connect an MCP client to the endpoint shown by `lazynext agent mcp` using the
MCP bearer token from **Settings → External agents (MCP)** in the editor.
