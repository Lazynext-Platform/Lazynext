# MCP Server — Model Context Protocol

JSON-RPC 2.0 over stdio MCP protocol server. Exposes 47 video editing tools to MCP clients (Claude Desktop, Cursor, etc.).

## Transport

- **Default**: stdin/stdout (MCP protocol)
- **SSE mode**: `--sse` flag enables HTTP SSE transport on port 9000

## Authentication

Set `LAZYNEXT_MCP_API_KEY` environment variable. Passed as `X-API-Key` header.

## Tools

47 tools covering: core editing, audio, color grading, effects, AI generation, text/captions, reframing, particles, timeline management, export, and media management. See `src/main.rs` for the full tool registry.

## Usage

```bash
# stdio mode (for MCP clients)
cargo run -p lazynext_mcp_server

# SSE mode (for HTTP clients)
cargo run -p lazynext_mcp_server -- --sse
```
