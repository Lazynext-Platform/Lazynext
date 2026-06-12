# Agentic AI Video Editor - Repository Explanation

## 1. High-Level Overview
This repository contains the integration code for the **Levea Agentic AI Video Editor** (also known as the OpenClaw AI Video Editor). It acts as an autonomous agent that takes natural-language prompts (e.g., "Make 3 viral clips, add captions, and export for TikTok") and autonomously plans, executes, verifies, and exports the requested video edits.

Unlike traditional video editors that rely on manual keyframes and timelines, this repository delegates all heavy lifting to the `api.livecore.ai` backend. 

## 2. The Multi-Platform Integrations
This repository is actually a **monorepo** that packages the editor integration into three different formats so it can be consumed by various AI platforms:

1. **OpenClaw Plugin (`index.ts`, `openclaw.plugin.json`)**
   - Integrates directly with the OpenClaw AI ecosystem.
   - It defines a single plugin entry (`ai-video-editor`) that forwards requests to the Levea backend. 
   - `openclaw-shim.d.ts` provides type definitions so the plugin can be built without downloading massive OpenClaw SDK binaries.

2. **MCP Server (`mcp-server/`)**
   - Implements the **Model Context Protocol (MCP)**, allowing AI coding assistants like **Claude Desktop, Cursor, Cline, and Hermes** to use the video editor as a tool via standard I/O (stdio).
   - Built using `@modelcontextprotocol/sdk`. 
   - Exposes one primary tool (`autonomous_edit`) alongside several state-management tools (like `list_caption_templates`, `list_brand_kits`, `check_job_status`).

3. **Hermes Plugin (`hermes-levea/`)**
   - A tiny integration (`hermes.plugin.json`) that tells the Hermes AI framework how to execute the MCP server via `npx -y levea-mcp-server`.

## 3. Core Architectural Philosophy
A fundamental design choice in this repository is the **Single-Tool Approach**. 
Instead of exposing 50 micro-tools to the AI (like `add_captions`, `trim_video`, `export`), it exposes one master tool: `autonomous_edit`. 

**Why?** The backend planner (`api.livecore.ai`) is highly specialized in video-editing logic. If the local AI model (like Claude) were given micro-tools, it might try to guess the execution order and make mistakes. By passing the full intent verbatim to the backend, the specialized planner can decompose the intent, apply safety gates, and execute tasks in the correct order.

## 4. Key Files & Directories Explained

- `README.md`, `AGENTS.md`, `SKILL.md`: Comprehensive documentation. `AGENTS.md` is specifically written as an instruction manual for AI models on how to interact with the API correctly.
- `index.ts`: The main execution script for the OpenClaw plugin. It parses incoming parameters (like `prompt`, `requirePlanApproval`, `flaggedIssues`) and forwards them using `axios.post`.
- `mcp-server/src/index.ts`: The bootstrap file for the MCP server. It maps MCP tool requests to internal dispatcher functions.
- `mcp-server/src/client.ts`: Contains the raw Axios calls to the Livecore backend.
- `package.json`: Manages the build process (`npm run build` runs `tsc`) and defines the metadata for the NPM package.
- `scripts/scan-leaks.sh`: A shell script run before publishing to ensure no hardcoded API keys or sensitive data are accidentally leaked into the repository.

## 5. Security & Safety Mechanisms
The repository incorporates critical safety guardrails:
1. **Authentication**: All requests require a `LEVEA_API_KEY` passed as a Bearer token.
2. **`requirePlanApproval`**: For destructive actions, the AI is instructed to pass this boolean. The backend will plan the edits but pause execution, returning an `awaiting_approval` status. The human user must type "yes" before the video is permanently altered.
3. **Async Job Polling**: Video rendering takes time. The code supports asynchronous processing (`queue_edit` and `check_job_status`). The MCP server can poll the backend and wait for the `jobId` to reach a `completed` state before returning the final `videoUrl`.

## 6. Supported Capabilities
Through this integration, users can achieve:
- **Structural Editing**: Trimming, splitting, multi-cam syncing.
- **Visual Effects**: Chroma key (green screen), procedural VFX (smoke, glitch), cinematic color grading, vertical reframing for TikTok.
- **Audio Processing**: Silence and filler-word removal, auto-ducking music beneath speech, and loudness normalization.
- **AI Generation**: B-roll generation, AI voice cloning, and text-to-speech.
