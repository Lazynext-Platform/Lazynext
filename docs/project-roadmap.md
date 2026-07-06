# 🗺️ Project Roadmap

> **Project**: Lazynext
> **Current Milestone**: v1.0 (First Production Release)
> **Last Updated**: 2026-06-30

---

## Progress Overview

| Metric | Count |
|---|---|
| Total Features | 19 |
| 🟢 Complete | 17 |
| ⏸️ On Hold | 2 |
| 🔴 Not Started | 0 |
| 🟡 In Progress | 0 |

**Overall Progress**: ████████░░ ~80-85% (all planned hardening features shipped; remaining work is depth/full-implementation, see *Remaining Work* below)

---

## Feature List

| # | Feature | Status | Depends On | Branch | Notes |
|---|---|---|---|---|---|
| 01 | Rust Core Engine & Crates | 🟢 Complete (retroactive) | — | — | CRDT state, GPU compositor, effects, audio, export, time types. ~75% complete. |
| 02 | Web App Shell | 🟢 Complete (retroactive) | #01 | — | Next.js editor, timeline, canvas, auth, storage, commands. ~85% complete. |
| 03 | API Gateway | 🟢 Complete (retroactive) | #01 | — | Axum REST server, 14 routes, JWT middleware. ~80% complete. |
| 04 | CLI Renderer | 🟢 Complete (retroactive) | #01 | — | Clap-based headless renderer. ~75% complete. |
| 05 | MCP Server | 🟢 Complete (retroactive) | #01 | — | MCP protocol server (14 tools, 4 resources, 4 prompts). ~75% complete. |
| 06 | Infrastructure & CI/CD | 🟢 Complete (retroactive) | — | — | Terraform, Docker, GitHub Actions, K8s, monitoring. ~80% complete. |
| 07 | Desktop App | ⏸️ On Hold (retroactive) | #01, #12 | — | GPUI app scaffolded + hardened. Full editor implementation deferred (see *Remaining Work*). |
| 08 | Mobile App | ⏸️ On Hold (retroactive) | #01, #13 | — | React Native shell + Android Kotlin native module. Full UniFFI editor deferred (see *Remaining Work*). |
| 09 | Production Hardening — Web App | 🟢 Complete | #01, #02, #03, #06 | `feature/09-production-hardening-web` | DB consolidation (Kysely → Drizzle), mock removal, cleanup, verified auth/compositor/CRDT/export. |
| 10 | Production Hardening — Rust Core | 🟢 Complete | #01 | `feature/10-rust-core-hardening` | Fixed temporal-versioning merge bug, completed CRDT conflict resolution, added tests (gpu/masks/temporal/mcp/cli/wasm), wired SAM2 ONNX + VST3 libloading + C2PA signing. |
| 11 | Production Hardening — Microservices | 🟢 Complete | #01, #06 | `feature/11-microservices-hardening` | Fixed 4 services' critical bugs, wired real video-gen path, render-service tracing. |
| 12 | Desktop App — Hardening | 🟢 Complete | #07, #10 | `feature/12-desktop-app-hardening` | Wired AI Copilot Run Command; small scope — full GPUI editor still deferred. |
| 13 | Mobile App — Hardening | 🟢 Complete | #08, #10 | `feature/13-mobile-app-hardening` | Added Android Kotlin native module + real web bridge; full UniFFI editor still deferred. |
| 14 | Browser Extension — Completion | 🟢 Complete | #02 | `feature/14-browser-extension-completion` | Replaced mock project list with real API fetch, hardened capture overlay. |
| 15 | AI Editor — Real API Wiring | 🟢 Complete | #02, #10 | `feature/15-ai-editor-real-api` | Wired web editor AI chat to real API + desktop AI + MCP tests + mobile tests. |
| 16 | Final Gaps — SDK / External Deps | 🟢 Complete | #10, #11 | `feature/16-final-gaps` | Wired UniFFI, SAM2 ONNX, VST3 libloading, E2E integration tests. |
| 17 | Platform-wide Mock Removal + Audit Fixes | 🟢 Complete | #15, #16 | (squash merges on main) | Zero mocks in production code; comprehensive CI/CD, infra, and monitoring audit fixes. |
| 18 | AI-Driven Editing — End-to-End Chronos Pipeline | 🟢 Complete | #01, #02, #10, #15 | `feature/18-ai-driven-editing` | Make NL commands produce real CRDT timeline mutations end-to-end. Audit the 50+ orchestrator tools for reality. |
| 19 | GPU Rendering & WASM Integration Hardening | 🟢 Complete | #01, #02, #10 | `feature/19-webgpu-and-wasm-port` | Verified GPU pipeline is real (not stub), updated PLATFORM_ASSESSMENT.md, cross-checked architecture ↔ code. |

---

## Remaining Work (not yet scheduled — pending human prioritization)

These items are **not** roadmap features yet. They represent the depth work that remains after the hardening pass, as documented in `PLATFORM_ASSESSMENT.md`:

- **Desktop — Full Editor** (#07 depth): Complete GPUI Dashboard + Editor windows, wire native compositor + DeckLink I/O.
- **Mobile — Full Editor** (#08 depth): Complete UniFFI bridge end-to-end, build AI Copilot + timeline screens.
- **Backend depth**: Real Kafka analytics pipeline, real collab-server CRDT persistence, real P2P libp2p mesh.
- **Cross-cutting**: OpenTelemetry instrumentation across services, end-to-end integration test (ingest → transcribe → edit → render).

---

## Session Note — 2026-06-30 (Feature #18 kickoff)

- **Who**: AI Agent (opencode)
- **Worked On**: Opened Feature #18 — AI-Driven Editing: End-to-End Chronos Pipeline. Created discussion.md (Mastery Stage 1).
- **Key finding during exploration**: `syncTimelineFromEngine()` in `crdt-sync.ts` is ALREADY implemented (not empty as PLATFORM_ASSESSMENT claimed) — it reads the WASM entity graph, hydrates scenes, and updates React via `EditorCore`. The orchestrator has 50+ named tools. The real gap is auditing which are real vs. LLM-described stubs.
- **Stopped At**: Stage 1 (Discuss) — discussion.md marked COMPLETE. Next: Stage 2 (Architecture), starting with the per-tool reality audit.
- **Blockers**: None. Stage 4 (Approve) will need human signoff before any build.
- **Next Steps**: Read the 1593-line orchestrator + all microservice routes to map each tool → implementation status → `architecture.md`.`[]`

## Session Note — 2026-06-30 (Roadmap sync)

- **Who**: AI Agent (opencode)
- **Worked On**: Documentation sync — the roadmap lagged behind `main`. Features 10-14 were merged (06:35) but still marked 🔴 Not Started; features 15-17 (AI editor wiring, final SDK/external-dep gaps, platform-wide mock removal + audit fixes) were not represented at all.
- **Changes**: Flipped 10-14 to 🟢 Complete, added 15-17, refreshed counts (15 complete / 2 on hold / 0 not started), added *Remaining Work* section for deferred depth. Cross-checked against `git log` and `git show --stat` of each merge commit.
- **Blockers**: `docs/project-context.md` still states "~60-65% of AI microservice endpoints are stubs or mocks" and lists desktop/mobile full impl as out-of-scope v1.0 — both now stale. Editing `project-context.md` requires human approval per the Mastery autonomy table; flagged, not edited.
