# 🏗️ Architecture: Production Hardening — Web App

> **Feature**: `09` — Production Hardening — Web App
> **Discussion**: [`discussion.md`](discussion.md)
> **Status**: 🟢 FINALIZED
> **Date**: 2026-06-30

---

## Overview

Eight-phase hardening of the web app from ~55% production-ready to ~90%+. Each phase is self-contained with clear entry/exit criteria. Phases A-C address immediate correctness issues (auth, DB, mocks). Phases D-F wire the remaining real-time pipeline (compositor, CRDT, export). Phase G adds testing. Phase H cleans up.

## File Structure

### Files to MODIFY

```
# Phase A — Security & Auth
rust/api-gateway/
├── src/auth.rs                  # MODIFY — replace hardcoded tokens with real JWT validation
├── src/routes/dodo.rs         # MODIFY — implement HMAC signature verification
├── src/routes/projects.rs       # MODIFY — decode JWT sub instead of "mock_user_id"
├── src/routes/timeline.rs       # MODIFY — add CSRF protection to state-changing endpoints
└── Cargo.toml                   # MODIFY — add jsonwebtoken dep if not present

# Phase B — Database Consolidation
apps/web/
├── src/db/schema.ts             # MODIFY — merge Kysely tables into Drizzle schema
├── src/db/index.ts              # MODIFY — use Drizzle-only connection
├── src/lib/db/schema.ts         # DELETE — remove Kysely schema
├── src/lib/auth.ts              # MODIFY — switch Better Auth adapter from Kysely to Drizzle
├── src/drizzle/                 # MODIFY — generate new migration for merged schema
│   └── 0002_consolidated_schema.sql
├── package.json                 # MODIFY — remove kysely, @better-auth/kysely-adapter
└── next.config.ts               # MODIFY — remove Kysely serverExternalPackages

# Phase C — Mock Data Removal
apps/web/
├── src/lib/mock-db.ts           # MODIFY — replace mock data with real DB queries
├── src/app/api/mock-db/route.ts # MODIFY — route to real DB data
├── src/app/(app)/admin/         # MODIFY — wire admin pages to PostgreSQL via Drizzle
├── src/app/(app)/super-admin/   # MODIFY — wire super-admin pages to real data
├── src/app/(app)/superadmin/    # MODIFY — wire superadmin pages to real data
└── src/app/actions/admin.ts     # MODIFY — un-stub getRecentUsers()

# Phase D — Compositor & Preview
apps/web/
├── src/preview/gpu-renderer.ts  # CREATE — WebGPU compositor rendering pipeline
├── src/preview/components/      # MODIFY — wire GPU frames to preview viewport
└── src/wasm/compositor.ts       # MODIFY — bridge render_frame_to_texture to canvas
rust/wasm/
└── src/compositor_wasm.rs       # MODIFY — expose compositor texture output as ImageData

# Phase E — CRDT Bidirectional Sync
apps/web/
├── src/collaboration/crdt-sync.ts  # MODIFY — complete bidirectional sync loop
├── src/commands/base-command.ts    # MODIFY — pipe applyOperation to WASM engine
├── src/lib/crdt.ts                 # MODIFY — wire CollaborationSync into real CRDT bus
└── src/editor/editor-core.ts       # MODIFY — subscribe to CRDT state changes

# Phase F — Export Pipeline
apps/web/
├── src/app/api/export/route.ts          # MODIFY — delegate to render-service
├── src/app/api/render/export/route.ts   # MODIFY — wire SSE progress to UI
├── src/components/editor/export/        # MODIFY — progress bar, download link
└── services/render-service/
    └── src/index.ts                     # MODIFY — accept timeline CRDT JSON, produce real video

# Phase G — Testing
apps/web/
├── tests/e2e/editor-full.spec.ts    # CREATE — full auth→edit→export flow
├── tests/e2e/collaboration.spec.ts  # CREATE — multi-user CRDT convergence
├── src/commands/__tests__/          # CREATE — command execution + undo tests
├── src/preview/__tests__/           # CREATE — GPU renderer tests
├── src/collaboration/__tests__/     # CREATE — CRDT sync tests
└── src/db/__tests__/                # CREATE — schema integrity tests
rust/api-gateway/
└── tests/integration_test.rs        # MODIFY — replace 19 fake tests with real ones

# Phase H — Cleanup
apps/web/
├── src/lib/crdt.ts                 # DELETE — legacy stub, replaced by crdt-sync.ts
└── src/app/actions/project.ts      # MODIFY — make RUST_API_GATEWAY_URL configurable
apps/browser-extension/
└── package.json                     # MODIFY — remove dead lazynext-wasm dep
apps/extension/
└── package.json                     # MODIFY — remove dead lazynext-wasm dep
```

## Data Model

### Consolidated Drizzle Schema (merged from Kysely)

```typescript
// apps/web/src/db/schema.ts — additions/merges

// Auth tables (from Better Auth Drizzle adapter — new)
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  role: text("role").notNull().default("user"),
  dodoCustomerId: text("dodo_customer_id"),
  aiCredits: integer("ai_credits").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Project tables (existing Drizzle — merged with Kysely fields)
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  name: text("name").notNull(),
  width: integer("width").notNull().default(1920),
  height: integer("height").notNull().default(1080),
  fps: integer("fps").notNull().default(30),
  data: jsonb("data"),                           // CRDT timeline JSON
  timelineData: text("timeline_data"),           // NEW — merged from Kysely (string for legacy)
  renderStatus: text("render_status").default("idle"), // NEW — merged from Kysely
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Asset table (NEW — merged from Kysely)
export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  userId: text("user_id").notNull().references(() => user.id),
  type: text("type").notNull(),                   // video, audio, image
  url: text("url").notNull(),
  metadata: jsonb("metadata"),                    // duration, dimensions, codec
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

## Component Design

### GPU Renderer (`gpu-renderer.ts`)

**Responsibility**: Receive compositor frames from WASM, render to WebGPU canvas
**Location**: `apps/web/src/preview/gpu-renderer.ts`

```
GPU Renderer:
├── GpuRenderer class
│   ├── constructor(canvas: HTMLCanvasElement)    # Init WebGPU device, swap chain
│   ├── renderFrame(textureData: Uint8Array, width, height)  # Copy WASM texture → canvas
│   ├── resize(width, height)                     # Handle canvas resize
│   └── destroy()                                 # Clean up GPU resources
├── supportsWebGPU(): boolean                     # Feature detection
└── fallback to CpuRenderer if WebGPU unavailable
```

### CRDT Sync Bus (`crdt-sync.ts`)

**Responsibility**: Bidirectional WASM ↔ React state synchronization
**Location**: `apps/web/src/collaboration/crdt-sync.ts`

```
CRDT Sync Bus:
├── syncTimelineFromEngine()     # EXISTING — WASM → React (reads entity graph, hydrates scenes)
├── applyLocalOperation(op)      # NEW — React → WASM (pipes command operations to CRDT engine)
├── subscribeToEngine(callback)  # NEW — listen for remote CRDT patches
├── connect(wsUrl, token)        # NEW — WebSocket connection with JWT auth
└── broadcastCrdtPatch(op)       # NEW — send local patches to remote peers
```

### Export Pipeline

```
Export Flow:
[Export UI] → POST /api/export {timelineState} → [render-service :8003]
  → [render-service] creates BullMQ job
  → [render-service] constructs FFMPEG filtergraph from CRDT timeline
  → [render-service] encodes video
   → [render-service] uploads to local filesystem
  → SSE progress events → [Export UI progress bar]
  → Download URL returned
```

## Data Flow

### Real-Time Preview Pipeline

```
[Timeline State (Rust CRDT)]
  → CoreEngine::render_frame(timestamp)
  → Compositor::render_frame_to_texture()  [GPU, wgpu]
  → WASM bridge: texture → Uint8Array
  → GpuRenderer::renderFrame()  [WebGPU canvas]
  → Preview Viewport (React component)
```

### Bidirectional CRDT Sync

```
[User Action] → Command.execute()
  → buildEntityInsertOp() / buildPropertyUpdateOp()
  → EditorCore → WASM CrdtEngine.apply_operation()
  → [Rust CRDT] state updated
  → syncTimelineFromEngine() → React state updated
  → broadcastCrdtPatch() → WebSocket → remote peers

[Remote Peer] → WebSocket message
  → receiveCrdtPatch() → WASM CrdtEngine.apply_operation()
  → syncTimelineFromEngine() → React state updated
```

## Configuration

| Key | Value/Type | Description |
|---|---|---|
| `RUST_API_GATEWAY_URL` | string | API Gateway URL (default: `http://127.0.0.1:8005`) |
| `RENDER_SERVICE_URL` | string | Render service URL (default: `http://127.0.0.1:8003`) |
| `NEXT_PUBLIC_RENDER_SERVICE_URL` | string | Client-accessible render service URL |
| `BETTER_AUTH_SECRET` | string | JWT signing secret (required, 64 chars) |
| `DODO_WEBHOOK_SECRET` | string | Dodo Payments webhook signing secret |

## Security Considerations

- **API Gateway JWT**: Replace hardcoded tokens with proper HS256 JWT validation using `BETTER_AUTH_SECRET`. Tokens must be verified on every request.
- **Dodo Payments Webhook**: Implement HMAC signature verification using `DODO_WEBHOOK_SECRET`. Reject unverified payloads.
- **CSRF Protection**: Add CSRF tokens on all state-changing endpoints (POST/PUT/DELETE). Verify on server.
- **Rate Limiting**: Add token-bucket rate limiting on API gateway routes. Configurable per-route limits.
- **User ID**: Decode `sub` claim from JWT instead of hardcoded `"mock_user_id"`. Validate user exists in DB.
- **No Secrets**: Remove `env.yaml`, `web.json`, `db.json` from repo. All secrets via environment variables.
- **Graceful Degradation**: Admin dashboards show empty states (not fake data) when DB is unreachable.

## Trade-offs & Alternatives

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Drizzle-only ORM** | Single schema, consistent tooling, Better Auth adapter | Migration effort, Kysely removal | ✅ Selected |
| **Kysely-only ORM** | Less migration effort | Worse TypeScript inference, no migration CLI | ❌ Rejected |
| **Keep dual ORM** | No immediate work | Technical debt, diverging schemas, maintenance burden | ❌ Rejected |
| **WebGPU + CPU fallback** | Maximum compatibility | Two render paths to maintain | ✅ Selected |
| **WebGPU only** | Single render path | Excludes ~30% of browsers | ❌ Rejected |
| **CPU canvas only** | Works everywhere | Significantly slower, no GPU effects | ❌ Rejected |
| **Export via render-service** | Reuses existing infrastructure, async | Network dependency for export | ✅ Selected |
| **Export locally via WASM** | No network dependency | Duplicates FFMPEG logic, large WASM bundle | ❌ Rejected |

## Next

Create tasks doc → `tasks.md`
