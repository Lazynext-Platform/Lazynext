# Lazynext 2030: Fully Autonomous Agentic NLE

Lazynext 2030 represents a fundamental paradigm shift in video editing. Instead of dragging and dropping clips onto a static timeline, Lazynext is a **Multi-Model AI Agent Platform**. 

You simply give instructions via voice or text ("Cut out the silences and apply a cyberpunk grade"), and our blazing-fast Rust core natively mutates the timeline using deterministic tool schemas.

## Multi-Model Architecture

Lazynext supports native LLM abstractions out of the box, ensuring you are never locked into a single ecosystem. You can dynamically swap the underlying AI engine using environment variables.

### 1. OpenAI (GPT-4o)
```bash
export LAZYNEXT_AI_PROVIDER="openai"
export LAZYNEXT_AI_MODEL="gpt-4o"
export OPENAI_API_KEY="sk-..."
```

### 2. Anthropic (Claude 3.5 Sonnet)
```bash
export LAZYNEXT_AI_PROVIDER="anthropic"
export LAZYNEXT_AI_MODEL="claude-3-5-sonnet-20240620"
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Google (Gemini 1.5 Pro)
```bash
export LAZYNEXT_AI_PROVIDER="gemini"
export LAZYNEXT_AI_MODEL="gemini-1.5-pro"
export GEMINI_API_KEY="AIzaSy..."
```

### 4. Local / Offline (Ollama)
Run Lazynext completely offline and free on your local GPU.
```bash
export LAZYNEXT_AI_PROVIDER="ollama"
export LAZYNEXT_AI_MODEL="llama3"
export OLLAMA_ENDPOINT="http://localhost:11434"
```

## The 5 Agentic Interfaces

Lazynext is built in Rust to be infinitely portable. The same AI Video Engine runs seamlessly across five different formats:

1. **Next.js Web Interface (`apps/web`)**: A beautiful, responsive web dashboard with a live agent chat interface.
2. **GPUI Desktop Engine (`apps/desktop`)**: A native Rust-based desktop application boasting sub-millisecond render times via wgpu.
3. **Headless CLI (`apps/cli`)**: Perfect for CI/CD batch rendering. Type `lazynext-cli prompt "duck the audio"`.
4. **MCP Server (`apps/mcp`)**: Exposes our video editing tools directly to external models via the Model Context Protocol (e.g. Claude Desktop).
5. **Mobile C-API (`apps/mobile`)**: A lightweight compiled library ready to be embedded into iOS (Swift) and Android (Kotlin) for voice-first editing.

## Development

### Prerequisites
- Rust (stable toolchain)
- Bun (latest)
- PostgreSQL (port 5433)

### Setup
```bash
# Install dependencies
cd apps/web && bun install

# Start PostgreSQL (Homebrew)
brew services start postgresql@18

# Push database schema
bun run db:push:local
```

### Running
```bash
# Rust workspace
cargo build --release

# Web app (Next.js + Turbopack)
cd apps/web && bun run dev

# Full test suite
bun test                  # 389 tests (383 pass)
cargo test --workspace    # Rust tests
bun run typecheck         # TypeScript check (0 errors)

# Lint
cargo clippy --workspace  # Rust (5 warnings remaining)
bun run lint              # TypeScript (4 pre-existing errors)
```

## Capabilities
The underlying Agent Schema natively supports:
- `cut_silences`
- `duck_audio`
- `color_grade`
- `add_text_overlay`
- `add_transition`
- `crop_and_pan`
- `generate_subtitles`