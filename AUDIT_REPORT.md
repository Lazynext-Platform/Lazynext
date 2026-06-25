# LAZYNEXT COMPREHENSIVE AUDIT REPORT

**Date:** 2026-06-25
**Scope:** Entire repository — all apps, Rust crates, microservices, and infrastructure
**Methodology:** 11 parallel exploration agents → deep audit → synthesis

---

## Executive Summary

Lazynext is an **ambitious and architecturally sound** multi-platform video editing ecosystem with a clear guiding principle: Rust owns all business logic, and every app is a dumb rendering shell. The project has impressive breadth — 14 Rust crates, 5 apps, 7 microservices, full observability stack, multi-cloud Terraform, and 4 CI/CD pipelines. The Rust core (CRDT state, GPU compositor, 17 blend modes, 6 effect shaders, export pipeline, audio DSP) is legitimately substantial.

However, the project is in an **early-stage state** where roughly 60-70% of advertised functionality is stubbed, mocked, or returns hardcoded data. Of the 5 apps, only `apps/web` has real implementation; `apps/desktop` is a 25-line stub, `apps/mobile` is a proof-of-concept with a fully mocked bridge, `apps/browser-extension` has critical missing assets, and `apps/visionos` is an empty directory. The microservices have ~65% stub endpoint rate. Several architectural violations exist where business logic is duplicated between Rust and JavaScript. Infrastructure is over-provisioned with 4 overlapping CI/CD systems. Security has critical issues including hardcoded mock auth tokens and no real auth on multiple services.

**Overall health: Early Alpha.** The foundation is solid but the surface area far exceeds the implementation depth.

---

## 1. Project Structure & Organization

### 1.1 Directory Completeness

| Path | Status | Files | Notes |
|------|--------|-------|-------|
| `apps/web` | ✅ Active | 1000+ files | Full Next.js app, the only production-ready shell |
| `apps/desktop` | ❌ Stub | 2 files | 25-line main.rs that prints "I'm a stub" |
| `apps/mobile` | ❌ POC | 3 source files | Fully mocked NativeBridge, missing assets, no tsconfig |
| `apps/browser-extension` | ⚠️ Partial | 9 source files | Missing icons, manifest out of sync, dead code |
| `apps/visionos` | ❌ Empty | 0 files | Empty directory created 2026-06-23, never populated |
| `rust/core` | ⚠️ Partial | 8 files | Core types exist but stubs throughout, dead modules |
| `rust/crates/` (14 crates) | ✅ Solid | 80+ files | Most mature part of the codebase |
| `rust/wasm` | ⚠️ Partial | 15 source files | Multiple scaffold/mock/stub functions |
| `rust/api-gateway` | ⚠️ Stub | 4 files | Mock auth, SQLite not PostgreSQL, no Stripe |
| `rust/cli` | ⚠️ Stub | 2 files | Unsafe code, render is no-op, hardcoded data |
| `rust/mcp-server` | ⚠️ Partial | 3 files | Dockerfile has port mismatch, build context flaw |
| `rust/p2p-sync` | ❌ Stub | 2 files | Zero networking deps despite claiming libp2p |
| `rust/provenance` | ❌ Misleading | 2 files | Claims C2PA compliance, only does bare SHA-256 |
| `rust/temporal-versioning` | ⚠️ Partial | 2 files | Broken merge track matching |
| `rust/plugin-api` | ✅ Solid | 2 files | Clean trait definition |
| `services/pre-processing` | ⚠️ Partial | 9 files | 10/12 endpoints stubs, missing dep |
| `services/generative-studio` | ⚠️ Partial | 7 files | 7/10 endpoints stubs, dead code |
| `services/ai-agents` | ✅ Functional | 7 files | Most functional service, runtime bugs exist |
| `services/render-service` | ⚠️ Partial | 4 files | Hardcoded FFmpeg, C2PA stub |
| `services/analytics-service` | ❌ Stub | 3 files | Entirely mock, no real Kafka |
| `services/collab-server` | ⚠️ Stub | 2 files | Save/load stubs, port conflict |
| `terraform/` (gcp/aws/azure) | ✅ Solid | 16 .tf files | Multi-cloud, well-structured |
| `k8s/` | ✅ Solid | 23 manifests | Comprehensive, production-ready |
| `monitoring/` | ✅ Solid | 14 configs | Full Grafana/Prometheus/Loki/Tempo stack |
| `ansible/` | ✅ Solid | 7 files + 4 roles | Complete node provisioning |
| `scripts/` | ✅ Solid | 25+ scripts | Good operational coverage |
| `docs/` | ⚠️ Thin | 7 files | architecture.md is good, missing API docs |

### 1.2 Orphaned / Misplaced Files

| File | Issue |
|------|-------|
| `db.json` (root) | Checked-in database dump, should be in `.gitignore` (added after the fact) |
| `web.json` (root) | Unknown purpose, in `.gitignore` now but exists on disk |
| `env.yaml` (root) | Sensitive config, in `.gitignore` but exists on disk |
| `db-inspect-payload.js` (root) | One-off script, should be in `scripts/` |
| `test_create_project.js`, `test_db.js` (root) | Ad-hoc test files, should be in proper test suites |
| `cloud-sql-proxy` (root) | 32MB binary checked into repo — should be fetched at runtime |
| `Lazynext_Final_Logo.png`, `Lazynext_Logo.png` (root) | 1.8MB of duplicate logos, already in `apps/web/public/logos/` |
| `direct_signin_loaded.png` (root) | 107KB screenshot — doesn't belong in repo |
| `rust/core/src/big_bang.rs` | Dead code, not declared in lib.rs, satirical/experimental |
| `rust/core/src/singularity.rs` | Dead code, not declared in lib.rs, satirical/experimental |
| `services/generative-studio/src/lipsync_worker.py` | Not imported by any route, dead code |

### 1.3 What's Documented vs What Exists

- CLAUDE.md documents `services/collab-server` as port 8002 (duplicate of ai-agents port)
- CLAUDE.md documents `apps/desktop` as "GPUI calling Rust natively with wgpu rendering" — reality is 25-line stub
- CLAUDE.md documents `apps/mobile` as "React Native with UniFFI-generated native bindings" — reality is fully mocked
- README.md lists 5 services in Docker Compose but docker-compose.yml actually starts 14 containers
- No documentation for `apps/visionos` anywhere in the codebase
- `services/analytics-service` not mentioned in README or CLAUDE.md architecture section

---

## 2. Architecture Compliance

### 2.1 Stated Architecture

> "Rust owns all business logic. Every app under `apps/` is a dumb rendering shell that calls into Rust. Logic is never duplicated between apps."

### 2.2 Violations Found

**CRITICAL: Business logic duplicated between Rust and JavaScript**

The `apps/web/src/` directory contains significant business logic that should live in Rust:

| JS Location | Duplicated Logic | Rust Equivalent |
|-------------|-----------------|-----------------|
| `apps/web/src/animation/` (15 files) | Keyframe interpolation, easing, bezier curves, property channels, animation resolution | `rust/crates/state/src/keyframe.rs` |
| `apps/web/src/commands/` (30+ files) | Full command pattern for undo/redo, batch commands | `rust/core/src/nle_state.rs` (undo is stub) |
| `apps/web/src/ripple/` (4 files) | Ripple editing, shift, diff | None in Rust |
| `apps/web/src/selection/` (12 files) | Selection state, hit testing, scope | None in Rust |
| `apps/web/src/effects/` (4 files) | Effect definitions, registry | `rust/crates/effects/` (shaders only) |
| `apps/web/src/masks/` (17 files) | Mask geometry, feather, handle positions | `rust/crates/masks/` (GPU pipeline only) |
| `apps/web/src/export/` (3 files) | Export defaults, mime types | `rust/crates/export/` (CLI args only) |
| `apps/web/src/subtitles/` (6 files) | SRT/ASS parsing, subtitle insertion | None in Rust |
| `apps/web/src/retime/` (6 files) | Speed ramping, audio stretch, rate presets | None in Rust |

**Assessment:** The JS side has evolved a rich feature set independently of the Rust migration. This is the single largest architectural debt in the project. The command pattern, animation system, and mask system should be ported to Rust.

### 2.3 CRDT Architecture Issues

- Two competing WebSocket sync implementations: `services/ai-agents/src/sync.ts` (Socket.IO) and `services/collab-server/src/main.rs` (Axum raw WebSocket). Different protocols, no clear authority.
- `ProjectData` and `CRDTTimeline` in `rust/crates/state/` are separate types that don't integrate.
- CRDT `ClipMove`, `ClipSplit`, `TrackInsert`, `TrackDelete` operations are acknowledged but not applied in `apply_operation()`.
- Yjs `y-sync` crate is declared as dependency in collab-server but never used.

### 2.4 Stub-to-Real Ratio

| Area | Real | Stub/Mock | Ratio |
|------|------|-----------|-------|
| Rust crates | ~60% | ~40% | Most mature |
| Rust core | ~35% | ~65% | Heavy stubs |
| WASM bridge | ~50% | ~50% | Half scaffold |
| Microservices | ~30% | ~70% | Most endpoints stubbed |
| Apps (non-web) | ~5% | ~95% | Nearly all stubs |
| **Overall** | **~40%** | **~60%** | |

---

## 3. Code Quality Assessment

### 3.1 Rust Code Quality

**Strengths:**
- Clean module organization across 14 crates
- Proper use of `thiserror` for error types
- WGSL shaders well-structured with `include_str!`
- Good use of workspace path dependencies
- Edition 2024 consistently applied

**Issues:**

| Severity | File | Line | Issue |
|----------|------|------|-------|
| 🔴 Critical | `rust/cli/src/main.rs` | 43-45 | `unsafe { std::env::set_var(...) }` — UB in multi-threaded context, and `set_var` is not unsafe |
| 🔴 Critical | `rust/temporal-versioning/src/lib.rs` | 148 | `\|_t\| true` closure matches first track always — merge is broken |
| 🟡 High | `rust/core/src/nle_state.rs` | undo() | Undo pops stack but never reverses operation — no-op |
| 🟡 High | `rust/core/src/engine.rs` | render_frame() | Returns hardcoded mock RGBA buffer, real compositor not wired |
| 🟡 High | `rust/api-gateway/src/rbac.rs` | multiple | 3 hardcoded tokens (`admin-token-123`, `editor-token-456`, `viewer-token-789`) — no JWT |
| 🟡 High | `rust/mcp-server/Dockerfile` | 10 | Exposes port 5173 but MCP communicates over stdio, not TCP |
| 🟡 High | `rust/mcp-server/Dockerfile` | 15-20 | `COPY Cargo.toml Cargo.lock ./` assumes build context is repo root |
| 🟡 High | `rust/provenance/src/lib.rs` | doc comment | Claims "C2PA-compliant" but only does SHA-256 — misleading |
| 🟡 High | `rust/p2p-sync/src/lib.rs` | multiple | Zero networking dependencies, hardcoded IPs (192.168.1.10-12) |
| 🟠 Medium | `rust/core/Cargo.toml` | deps | `async-trait` declared but never used |
| 🟠 Medium | `rust/core/src/` | `big_bang.rs`, `singularity.rs` | Dead modules not declared in lib.rs — satirical code |
| 🟠 Medium | `rust/provenance/src/lib.rs` | return type | `Result<String, String>` — String error type is anti-pattern |
| 🟠 Medium | `rust/crates/time/Cargo.toml` | deps | Depends on `bridge` (proc-macro crate) but doesn't use `#[export]` |
| 🟠 Medium | `rust/crates/plugin/Cargo.toml` | deps | `compositor` and `time` declared but not used in lib.rs |

### 3.2 TypeScript/JavaScript Code Quality

**Strengths:**
- Strict TypeScript throughout (`tsc --noEmit`)
- Good use of Zod for runtime validation
- Well-organized command pattern with visitor pattern
- Comprehensive ESLint configuration

**Issues:**

| Severity | File | Issue |
|----------|------|-------|
| 🔴 Critical | `services/ai-agents/src/orchestrator.ts` | `GEN_STUDIO_URL` typo — undefined variable, runtime `ReferenceError` |
| 🔴 Critical | `services/ai-agents/src/orchestrator.ts` | Anthropic provider sends to OpenAI endpoint with wrong format |
| 🟡 High | `services/ai-agents/tests/orchestrator.test.ts` | Test expects `generate_broll` tool but orchestrator maps to `auto_fill_broll` |
| 🟡 High | `apps/browser-extension/src/App.tsx:156` | `new URL(src)` crashes on blob/relative/empty URLs |
| 🟡 High | `apps/browser-extension/public/manifest.json` vs `dist/manifest.json` | Out of sync — different permissions, different names |
| 🟡 High | `apps/browser-extension/src/content/content-script.ts` | Injected on every URL but never called — dead weight |
| 🟡 High | `apps/mobile/App.tsx` | `NativeBridge` entirely mocked — no real functionality |
| 🟡 High | `apps/mobile/` | No `tsconfig.json` despite TypeScript being a devDependency |
| 🟡 High | `apps/mobile/app.json` | References `./assets/icon.png` etc. — none exist, build will fail |
| 🟠 Medium | `apps/browser-extension/package.json` | `lazynext-wasm` declared but never imported — dead dependency |
| 🟠 Medium | `apps/browser-extension/vite.config.ts` | `__dirname` in ESM context — fragile Vite shim |
| 🟠 Medium | `apps/browser-extension/src/background/service-worker.ts` | Hardcoded `http://127.0.0.1:8005` URL — no production config |
| 🟠 Medium | `apps/mobile/App.tsx` | `handleProcessIntent` has race condition with un-cancellable setTimeout |
| 🟠 Medium | `apps/mobile/App.tsx` | Apple Pencil detection sets state forever, never cleared |

### 3.3 Python Code Quality

| Severity | File | Issue |
|----------|------|-------|
| 🔴 Critical | `services/pre-processing/main.py` | `from segment_anything import sam_model_registry` — not in requirements.txt |
| 🟡 High | `services/generative-studio/main.py` | `/inpaint` targets `https://api.runwayml.com/v1/inpaint` — not a real endpoint |
| 🟡 High | `services/generative-studio/main.py` | `/nerf-extract` has `Sunset` header but returns 200 instead of 410 |
| 🟡 High | Both Python services | Single-file monoliths (459 and 437 lines) — no module structure |
| 🟠 Medium | `services/generative-studio/requirements.txt` | `replicate` and `elevenlabs` packages installed but code uses HTTP directly |
| 🟠 Medium | `services/generative-studio/requirements.txt` | `diffusers`, `transformers`, `accelerate` installed but only import-checked |
| 🟠 Medium | `services/pre-processing/` | No `__init__.py` or package structure |

---

## 4. Security Audit

### 4.1 Critical Findings

| # | Finding | Location | Details |
|---|---------|----------|---------|
| 🔴 C1 | **Hardcoded auth tokens** | `rust/api-gateway/src/rbac.rs` | Three literal tokens (`admin-token-123`, `editor-token-456`, `viewer-token-789`) used for RBAC. No JWT validation. |
| 🔴 C2 | **Hardcoded user ID** | `rust/api-gateway/src/main.rs` | `handle_get_projects` uses `"mock_user_id"` instead of decoded JWT subject |
| 🔴 C3 | **No authentication on WebSocket** | `services/collab-server/src/main.rs` | WebSocket upgrade has zero auth — anyone can connect and broadcast CRDT ops |
| 🔴 C4 | **No authentication on WebSocket** | `services/ai-agents/src/sync.ts` | Socket.IO connections have no auth — anyone can join any project room |
| 🔴 C5 | **Sensitive files on disk** | Root directory | `env.yaml`, `web.json`, `db.json` contain real config data despite being in `.gitignore` |
| 🔴 C6 | **32MB binary in repo** | `cloud-sql-proxy` (root) | Binary executable checked into git — supply chain risk |

### 4.2 High Severity

| # | Finding | Location |
|---|---------|----------|
| 🟡 H1 | **SQLite in gateway, not PostgreSQL** | `rust/api-gateway/src/db.rs` — in-memory SQLite fallback, no Cloud SQL integration |
| 🟡 H2 | **No Stripe webhook verification** | `rust/api-gateway/src/main.rs` — `handle_stripe_webhook` only prints event type, returns `{"received": true}` |
| 🟡 H3 | **Broadcast channel silent message drops** | `services/collab-server/src/main.rs` — `let _ = tx.send(...)` ignores send errors when channel full |
| 🟡 H4 | **S3 credentials default to mock values** | `services/render-service/src/index.ts` — `mock-key`/`mock-secret` defaults |
| 🟡 H5 | **No shutdown handling** | `services/render-service/src/index.ts` — SIGTERM kills BullMQ worker mid-job |
| 🟡 H6 | **Content script on all URLs** | `apps/browser-extension/dist/manifest.json` — injects script on `<all_urls>` unnecessarily |
| 🟡 H7 | **API Gateway has no rate limiting** | `rust/api-gateway/` — no rate limiter middleware |

### 4.3 Medium Severity

| # | Finding |
|---|---------|
| 🟠 M1 | `host_permissions` in browser extension don't match API target (localhost:3000 vs 127.0.0.1:8005) |
| 🟠 M2 | Redis connection string transformation is fragile (`UPSTASH_REDIS_REST_URL.replace("http", "redis")`) |
| 🟠 M3 | No CSRF protection on API routes |
| 🟠 M4 | Port 8005 exposed for analytics but analytics-service is all mock |

### 4.4 Secrets & Credentials Exposure

- `.env.example` contains default password `password123` for PostgreSQL
- `docker-compose.yml` hardcodes `POSTGRES_PASSWORD` default as `password123`
- Terraform `variables.tf` declares all API keys as variables (OpenAI, Anthropic, Stripe, Resend, etc.) — these end up in Terraform state
- Ansible `inventory.ini` is commented-out but the template pattern encourages committing IPs

---

## 5. CI/CD & Infrastructure Audit

### 5.1 Pipeline Comparison

The project has **4 separate CI/CD systems** with significant overlap:

| Feature | GitHub Actions | GitLab CI | Jenkins | Cloud Build |
|---------|---------------|-----------|---------|-------------|
| Rust build/test | ✅ | ✅ | ✅ | ❌ |
| WASM build | ✅ | ✅ | ✅ | ✅ |
| Python tests | ✅ | ✅ | ✅ | ❌ |
| Node tests | ✅ | ✅ | ✅ | ❌ |
| Web build | ✅ | ✅ | ✅ | ❌ |
| Docker build | ✅ | ✅ (main only) | ✅ (main only) | ✅ |
| Docker push | ✅ | ✅ | ✅ | ✅ |
| Cloud Run deploy | ✅ | ❌ | ❌ | ✅ |
| K8s deploy | ❌ | ✅ (kubectl) | ✅ (kubectl) | ❌ |
| CodeQL analysis | ✅ | ❌ | ❌ | ❌ |

**Assessment:** GitHub Actions is the most complete pipeline. GitLab CI and Jenkins are redundant with GitHub Actions. Cloud Build handles what GCP Cloud Run needs. Recommend consolidating to GitHub Actions + Cloud Build only.

### 5.2 Docker Infrastructure

**7 separate docker-compose files:**
- `docker-compose.yml` — Main (14 services)
- `docker-compose.dev.yml` — Development overrides
- `docker-compose.gpu.yml` — GPU services
- `docker-compose.tensorflow.yml` — TF Serving
- `docker-compose.ai-agents.yml` — AI agents standalone
- `docker-compose.generative-studio.yml` — Gen studio standalone
- `docker-compose.pre-processing.yml` — Pre-processing standalone
- `docker-compose.render-service.yml` — Render service standalone

**Issues:**
- Individual service compose files are redundant with the main one
- `docker-bake.hcl` defines 9 targets but `cloudbuild.yaml` builds 6 — `db-migrate` is in bake but not in any CI
- GPU variants exist in bake and compose but no CI builds them
- `Dockerfile.migrate` is referenced in bake but doesn't appear to exist in the repo

### 5.3 Kubernetes Configuration

**Strengths:** 23 well-structured manifests with:
- Proper NetworkPolicies (deny-all default, 14 specific allow rules)
- HPAs on all services with scale-down stabilization
- PDBs on all deployments
- External Secrets via GCP Secret Manager
- Prometheus ServiceMonitors and PrometheusRules
- PostgreSQL backup CronJobs
- GPU node pool support with NVIDIA operators
- PgBouncer connection pooling

**Issues:**
- K8s `services.yaml` lists 3 web replicas in base but production overlay patches it to 3 — redundant
- `init-containers.yaml` adds `db-migrate` init container but the migration image isn't built by CI
- HA Patroni config exists in `k8s/ha/` but isn't referenced by any overlay

### 5.4 Monitoring

**Strengths:** Comprehensive observability stack:
- Prometheus with 10 scrape targets + SLO definitions
- Grafana with pre-built dashboards (lazynext-overview)
- Loki for log aggregation (30-day retention)
- Tempo for distributed tracing
- Alertmanager with alert rules
- Grafana Alloy for telemetry collection

**Gaps:**
- No OpenTelemetry instrumentation in any service code
- Loki config references but Tempo trace-to-log linking may not work without OTel
- Alertmanager has config but no notification receivers configured (no Slack/PagerDuty)
- No synthetic monitoring / blackbox probes

---

## 6. Dependency Health

### 6.1 Rust Dependencies

| Crate | Issue |
|-------|-------|
| `async-trait` (in core) | Declared but never used |
| `bridge` (in time) | Proc-macro dep but `#[export]` attribute not used |
| `compositor` (in plugin) | Declared but not used in lib.rs |
| `y-sync` (in collab-server) | Declared but never imported |
| `boa_engine` 0.21 (in plugin) | Pure-Rust JS engine instead of V8 — limited compatibility |
| `wgpu` 29.0.1 | Current but bleeding-edge — expect API breaks |

**Rust toolchain:** 1.96.0 with edition 2024 — appropriate for June 2026.

### 6.2 JavaScript Dependencies

| Package | Location | Issue |
|---------|----------|-------|
| `lazynext-wasm` | `apps/browser-extension/package.json` | Declared but never imported — dead weight |
| `kafkajs` 2.2.4 | `services/analytics-service` | Declared but no real Kafka client instantiated |
| `replicate`, `elevenlabs` (Python) | `services/generative-studio/requirements.txt` | SDKs installed but code calls HTTP APIs directly |
| `diffusers`, `transformers`, `accelerate` (Python) | `services/generative-studio/requirements.txt` | Heavy packages (~2GB) installed but only import-checked |
| `segment-anything` (Python) | `services/pre-processing/main.py` | Imported at runtime but NOT in requirements.txt |
| `typescript` ^6.0.3 | Root + all services | Very new (June 2026), may have ecosystem gaps |
| `expo` ~56.0.12, `react-native` 0.86.0 | `apps/mobile` | Bleeding-edge versions, fragile compatibility |

### 6.3 Version Consistency

- TypeScript: Root uses `^6.0.3`, services use `^6.0.3` or `^5.x` — **inconsistent**
- `bun` types: ai-agents and render-service use `bun-types`, analytics-service doesn't — will miss Bun API types
- Rust workspace uses resolver "2" with path dependencies — correctly configured

---

## 7. Configuration Management

### 7.1 Environment Variable Coverage

| Variable | `.env.example` | `docker-compose.yml` | `k8s/configmap.yaml` | Terraform |
|----------|:---:|:---:|:---:|:---:|
| DATABASE_URL | ✅ | ✅ | ✅ | ✅ |
| BETTER_AUTH_SECRET | ✅ | ✅ | ❌ (ExternalSecret) | ❌ |
| UPSTASH_REDIS_REST_URL | ✅ | ✅ | ❌ | ❌ |
| OPENAI_API_KEY | ✅ | ✅ | ❌ (ExternalSecret) | ✅ |
| ANTHROPIC_API_KEY | ✅ | ✅ | ❌ (ExternalSecret) | ✅ |
| LLM_PROVIDER | ✅ | ❌ | ✅ | ✅ |
| STORAGE_PROVIDER | ✅ | ✅ | ❌ | ❌ |
| MEDIA_BUCKET | ✅ | ✅ | ✅ | ❌ |
| NEXT_PUBLIC_POSTHOG_KEY | ✅ | ✅ | ✅ | ❌ |
| STRIPE_SECRET_KEY | ✅ | ❌ | ❌ (ExternalSecret) | ✅ |
| RESEND_API_KEY | ✅ | ❌ | ❌ (ExternalSecret) | ✅ |
| GEMINI_API_KEY | ✅ | ✅ | ❌ | ✅ |
| ELEVENLABS_API_KEY | ✅ | ✅ | ❌ | ❌ |
| REPLICATE_API_TOKEN | ✅ | ✅ | ❌ | ❌ |
| FREESOUND_CLIENT_ID | ✅ | ❌ | ❌ | ❌ |
| FREESOUND_API_KEY | ✅ | ❌ | ❌ | ❌ |
| MARBLE_WORKSPACE_KEY | ✅ | ❌ | ❌ | ❌ |

**Gaps:** Many variables in `.env.example` are missing from `docker-compose.yml` (Stripe, Resend, Freesound, Marble). The web container won't have these at runtime.

### 7.2 Port Allocation Conflicts

| Port | Service 1 | Service 2 | Conflict |
|------|-----------|-----------|----------|
| 8002 | `services/ai-agents` | `services/collab-server` | ❌ Both claim 8002 |
| 8005 | `rust/api-gateway` | `services/analytics-service` | ❌ Both claim 8005 |

### 7.3 Configuration Drift

- `docker-compose.yml` references `RENDER_SERVICE_URL` but other files use `NEXT_PUBLIC_RENDER_SERVICE_URL` — naming inconsistency
- `cloudbuild.yaml` uses `_ENVIRONMENT` and `_PROJECT_ID` substitutions but no `terraform.tfvars` equivalent for Cloud Build
- `docker-compose.yml` has `POSTGRES_PASSWORD` with fallback `password123` but `.env.example` doesn't document this variable

---

## 8. Testing Coverage

### 8.1 Test Summary

| Area | Test Files | Tests | Framework | Notes |
|------|-----------|-------|-----------|-------|
| `rust/` (workspace) | Multiple | Unknown | `cargo test` | CI runs full workspace |
| `apps/web` | 40+ test files | Unknown | Bun + Playwright | Good coverage in commands, animation, masks |
| `apps/desktop` | 0 | 0 | — | No tests |
| `apps/mobile` | 0 | 0 | — | No test runner configured |
| `apps/browser-extension` | 0 | 0 | — | No tests |
| `services/pre-processing` | 1 file | 6 | pytest | Covers 2/12 endpoints |
| `services/generative-studio` | 1 file | 6 | pytest | Covers 3/10 endpoints |
| `services/ai-agents` | 1 file | 5 | Bun | Has broken assertions (tool name mismatch) |
| `services/render-service` | 1 file | 4 | Bun | Basic job queue tests |
| `services/analytics-service` | 0 | 0 | — | No tests directory |
| `services/collab-server` | 0 | 0 | — | No tests |

### 8.2 Testing Gaps

- **No integration tests** across services — no end-to-end test of the "ingest → transcribe → edit → render" pipeline
- **No WebSocket tests** — neither ai-agents Socket.IO nor collab-server raw WebSocket has test coverage
- **No CRDT convergence tests** — critical for collaborative editing correctness
- **No WASM integration tests** — the WASM bridge has 15 modules but no test files
- **Python microservices test only health endpoints** — mock data paths are untested
- **E2E tests exist** (Playwright in `apps/web/e2e/`) but only for the editor, not the full platform

---

## 9. Documentation Audit

### 9.1 Existing Documentation

| Document | Quality | Notes |
|----------|---------|-------|
| `README.md` | Good | Clear architecture overview, quick start, env vars |
| `CLAUDE.md` | Excellent | Comprehensive developer guide, all commands, code style |
| `AGENTS.md` | Thin | 23 lines, mostly redundant with CLAUDE.md |
| `docs/architecture.md` | Unknown | Not read in this audit |
| `docs/COMPLETE_PLATFORM_OVERVIEW.md` | Unknown | Not read |
| `docs/missing_features.md` | Excellent | 98-line comprehensive feature gap analysis |
| `docs/effects-renderer.md` | Unknown | Not read |
| `docs/keyframes.md` | Unknown | Not read |
| `docs/actions.md` | Unknown | Not read |
| `docs/countries-search.md` | Unknown | Not read |

### 9.2 Documentation Gaps

- **No API documentation** — no OpenAPI/Swagger specs for any microservice
- **No architecture decision records (ADRs)** — why CRDT over OT? Why Boa over V8?
- **No deployment runbook** — what happens when Cloud Run deploy fails?
- **No incident response plan**
- **No service level objectives documented** outside of K8s SLO yaml
- **No contributor guide** — how to add a new effect, a new crate, a new microservice
- **`AGENTS.md` should be merged into `CLAUDE.md`** — significant overlap
- **No README files** in any `rust/crates/*/` directory, `rust/wasm/`, or individual services

---

## 10. Consolidated Recommendations

### 🔴 Critical (Must Fix Before Production)

1. **Fix hardcoded auth** — Replace mock tokens in `rust/api-gateway/src/rbac.rs` with real JWT validation
2. **Resolve port conflicts** — ai-agents vs collab-server (both 8002), api-gateway vs analytics-service (both 8005)
3. **Fix `GEN_STUDIO_URL` typo** — `services/ai-agents/src/orchestrator.ts` will crash at runtime
4. **Fix broken merge** — `rust/temporal-versioning/src/lib.rs:148` `|_t| true` matches wrong track
5. **Remove `unsafe` from CLI** — `rust/cli/src/main.rs:43` — unnecessary and dangerous
6. **Add missing browser extension icons** — extension won't load without them
7. **Fix Anthropic API path** — ai-agents sends Anthropic-format requests to OpenAI endpoint
8. **Add WebSocket authentication** — both sync implementations currently allow anonymous CRDT broadcast
9. **Fix mobile app assets** — missing icons will crash Expo build
10. **Add `segment-anything` to pre-processing requirements.txt** — runtime import will fail

### 🟡 High (Should Fix Soon)

11. Port animation/command/mask/ripple logic from `apps/web/src/` to Rust core
12. Implement real undo in `rust/core/src/nle_state.rs`
13. Wire real compositor into `CoreEngine::render_frame` instead of mock buffer
14. Replace SQLite in api-gateway with PostgreSQL
15. Implement real Stripe webhook verification
16. Add proper error handling to browser extension (silent failures)
17. Add `tsconfig.json` to mobile app
18. Fix ai-agents test assertions (tool name mismatches)
19. Add shutdown handling to render-service BullMQ worker
20. Consolidate to one WebSocket sync implementation

### 🟠 Medium (Improve Over Time)

21. Remove dead modules: `big_bang.rs`, `singularity.rs`, `lipsync_worker.py`
22. Remove unused dependencies: `async-trait` (core), `lazynext-wasm` (browser-ext), `replicate`/`elevenlabs` pkgs (generative-studio)
23. Add module structure to Python microservices (break up 459-line main.py)
24. Fix `/nerf-extract` to return 410 instead of 200 with Sunset header
25. Add `__dirname` ESM-safe alternative in browser extension Vite config
26. Remove root-level ad-hoc test files (`test_create_project.js`, `test_db.js`, `db-inspect-payload.js`)
27. Remove `cloud-sql-proxy` binary from repo
28. Remove duplicate logo files from repo root
29. Standardize TypeScript version across all packages
30. Add README files to all Rust crates and services

### 🔵 Low (Nice to Have)

31. Consolidate CI/CD to GitHub Actions + Cloud Build only (remove GitLab CI, Jenkins)
32. Reduce docker-compose files from 7 to 2 (main + dev)
33. Add OpenTelemetry instrumentation to all services
34. Add OpenAPI/Swagger specs to Python microservices
35. Add architecture decision records
36. Add deployment runbook and incident response plan
37. Add contributor guide
38. Configure Alertmanager notification receivers (Slack/PagerDuty)
39. Add end-to-end integration test for full ingest→edit→render pipeline
40. Either populate or delete `apps/visionos/`
41. Add CRDT convergence property tests
42. Standardize env var naming (`RENDER_SERVICE_URL` vs `NEXT_PUBLIC_RENDER_SERVICE_URL`)

---

## Appendix A: File Count Summary

| Area | Source Files | Lines (approx) |
|------|-------------|----------------|
| `apps/web` | 1000+ | 80,000+ |
| `apps/desktop` | 2 | 25 |
| `apps/mobile` | 3 | 500 |
| `apps/browser-extension` | 9 | 800 |
| `apps/visionos` | 0 | 0 |
| `rust/core` | 8 | 1,500 |
| `rust/crates/` (14) | 85 | 12,000 |
| `rust/wasm` | 15 | 2,400 |
| `rust/` (other 7 packages) | 18 | 2,500 |
| `services/` (7 services) | 35 | 5,500 |
| `terraform/` | 16 | 800 |
| `k8s/` | 23 | 2,500 |
| `monitoring/` | 14 | 800 |
| `ansible/` | 11 | 400 |
| `scripts/` | 25 | 1,500 |
| `docs/` | 7 | 1,000 |
| **Total** | **~1,270** | **~111,000** |

## Appendix B: Key Strengths

1. **GPU compositor** (`rust/crates/compositor/`) — 1070-line, 17 blend modes, MSDF text, stereoscopic 3D — genuinely impressive
2. **K8s manifests** — Production-grade with NetworkPolicies, HPAs, PDBs, ExternalSecrets, CronJobs, GPU support
3. **Monitoring stack** — Full Grafana/Prometheus/Loki/Tempo/Alloy with pre-built dashboards and SLOs
4. **Multi-cloud Terraform** — GCP (primary), AWS, Azure all configured with GPU node pools
5. **CRDT foundation** — LWW-Register, vector clocks, tombstones, operation-based CRDTs — correct primitives
6. **CLAUDE.md** — Excellent developer documentation, comprehensive and accurate
7. **Web app scope** — 1000+ files covering editor, canvas, timeline, effects, masks, collaboration, storage migrations
8. **CI/CD thoroughness** — Rust fmt/clippy/test, WASM build, Python tests, Node tests, Docker builds, deploys
9. **Ansible provisioning** — Complete node setup from bare metal to K8s with GPU drivers
10. **Graceful degradation pattern** — Services fall back to local processing when API keys are absent

---

*Audit performed by Claude Code via 11-agent parallel exploration + deep audit. 329 tool calls, 528K tokens consumed across exploration phase.*
