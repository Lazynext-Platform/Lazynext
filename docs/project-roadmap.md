# 🗺️ Project Roadmap

> **Project**: Lazynext
> **Current Milestone**: v1.0 (First Production Release)
> **Last Updated**: 2026-06-30

---

## Progress Overview

| Metric | Count |
|---|---|
| Total Features | 14 |
| 🟢 Complete (Retroactive) | 6 |
| ⏸️ On Hold (Retroactive) | 2 |
| 🔴 Not Started | 6 |
| 🟡 In Progress | 0 |

**Overall Progress**: ░░░░░░░░░░ ~45% (based on retroactive work + planned)

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
| 07 | Desktop App | ⏸️ On Hold (retroactive) | #01 | — | GPUI scaffold exists. ~55% stub. Needs full implementation. |
| 08 | Mobile App | ⏸️ On Hold (retroactive) | #01 | — | React Native shell exists. UniFFI not wired. ~55% stub. |
| 09 | Production Hardening — Web App | 🟢 Complete | #01, #02, #03, #06 | `feature/09-production-hardening-web` | DB consolidation, mock removal, cleanup, verified auth/compositor/CRDT/export |
| 10 | Production Hardening — Rust Core | 🔴 Not Started | #01 | — | Wire real compositor rendering, undo, optical flow; remove dead code. |
| 11 | Production Hardening — Microservices | 🔴 Not Started | #01, #06 | — | Implement real SAM2, Demucs, render composition; fix auth and ports. |
| 12 | Desktop App — Full Implementation | 🔴 Not Started | #07, #10 | — | Activate GPUI, build Dashboard + Editor, wire native compositor + DeckLink. |
| 13 | Mobile App — Full Implementation | 🔴 Not Started | #08, #10 | — | Implement UniFFI bridge, build native modules, replace mock bridge. |
| 14 | Browser Extension — Completion | 🔴 Not Started | #02 | — | Wire real timeline import, fix manifest, add tests. |
