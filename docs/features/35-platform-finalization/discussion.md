# 💬 Discussion: Platform Finalization — All 7 Formats to 100%

> **Feature**: `35` — Platform Finalization
> **Status**: 🟡 IN PROGRESS
> **Branch**: `feature/35-platform-finalization` (not yet created)
> **Depends On**: #33, #34
> **Date Started**: 2026-07-01
> **Date Completed**: —

---

## Summary

Close all remaining code gaps across all 7 formats to bring the Lazynext platform from ~99% to 100% code-complete. This is the final feature before operational deployment. The gaps are small, specific, and well-understood — each is a wiring fix, not new architecture.

---

## Lessons from Previous Features

- **From #33**: Desktop AI prompt text wiring and export button were added. Need to verify these actually work end-to-end.
- **From #34**: Real video decode pipeline confirmed at 133fps. The pattern of "write lifecycle docs, then verify against reality" caught assessment errors. We must re-verify every claim against actual code.

---

## Functional Requirements

### F1: Desktop App — Play/Pause Activation
The GPUI desktop editor has a play/pause button that renders UI but only logs to console instead of toggling engine playback. Must wire it to `CoreEngine` state.

### F2: Desktop App — AI Prompt Wiring Verification
Feature #33 claims the AI prompt text input was wired. Must verify the actual code path from GPUI text input → API Gateway → response display.

### F3: Mobile App — Real NativeBridge (UniFFI → Swift/Kotlin)
Mobile NativeBridge currently falls back to hardcoded `MOCK_PROJECT`. Must wire real UniFFI-generated bindings so `getProjectInfo()`, `processIntent()`, `moveClip()` call the real Rust core. This requires:
- Building the Rust core as a native library for iOS (`.a`) and Android (`.so`)
- Linking UniFFI-generated Swift/Kotlin bindings
- Replacing the mock fallback in `NativeBridge.ts` with real calls

### F4: Microservices — Real SAM2 ONNX Model
Pre-processing service uses `rembg` (U²-Net) for rotoscoping, labeled as "SAM2". Must wire the real SAM2 ONNX model path that's already configured but not used.

### F5: Microservices — Local Whisper TF Serving Path
Whisper transcription calls OpenAI API over HTTP. A TF Serving config for `whisper-large-v3` exists but is not wired. Must add a local inference path with graceful fallback.

### F6: MCP Server — Tool Expansion from 1 to 50+
The TypeScript MCP server (`services/mcp-server/`) only exposes a single `autonomous_edit` tool. Must expand to mirror the 50+ tools available in the AI agents orchestrator (`services/ai-agents/src/orchestrator.ts`).

### F7: Analytics Service — Disk Persistence
Events are in-memory only (10k circular buffer). Must add SQLite or file-based persistence so events survive restarts.

### F8: Deployment — Azure Production Stack
All infrastructure code exists (Terraform, K8s, Dockerfiles, Ansible) but the platform has never been deployed to production. Need to:
- Run `terraform apply` to provision Azure resources
- Deploy all 7 microservices
- Run `scripts/full-e2e.sh` against the live stack
- Verify all 7 formats work against production URLs

## Current State / Reference

### What Exists
- 34 merged features, all marked 🟢 Complete
- 7 functional formats, 15 real Rust crates, 7 real microservices
- Full CI/CD pipeline (GitHub Actions)
- Full infrastructure-as-code (Terraform, K8s, Ansible, monitoring)

### What Works Well
- Rust core is 100% real — zero stubs, zero `todo!()`
- Web app is production-grade editor with real WASM compositor
- CLI renders real video at 133fps through GPU compositor → ffmpeg
- API Gateway has real JWT/PostgreSQL/Stripe/OAuth/RBAC/CSRF

### What Needs Improvement
- Mobile app ships with mock data — the final frontier
- Desktop has minor wiring gaps
- Some microservices use proxy implementations (rembg for SAM2)
- Platform has never been deployed to production

## Proposed Approach

This is a **wiring and verification** feature, not a new-build feature. Each gap is:
1. **Read the current code** to verify actual state (don't trust docs)
2. **Make the minimal change** to connect the real path
3. **Test the connection** end-to-end
4. **Log in changelog**

No new architecture. No new dependencies. No new files beyond what's needed.

## Dependencies

| Dependency | Type | Status |
|---|---|---|
| Feature #33 — Production Hardening | Feature | ✅ Complete |
| Feature #34 — Real Video Playback | Feature | ✅ Complete |
| Azure subscription | Infrastructure | 🔴 Needs provisioning |
| SAM2 ONNX model file | External | 🔴 Needs download |
| Whisper TF Serving model | External | 🔴 Needs deployment |

## Research & Prior Art

### Knowledge Gaps
- [ ] Verify actual state of desktop AI prompt — #33 changelog claims it was fixed
- [ ] Verify actual state of desktop play/pause — what engine method to call?
- [ ] Verify UniFFI binding generation pipeline — does it build?
- [ ] Verify SAM2 ONNX runtime availability in pre-processing Dockerfile

### Sources Consulted
| Source | Type | Key Takeaway |
|---|---|---|
| `apps/desktop/src/editor.rs` | Code | Need to re-read to verify actual state |
| `apps/mobile/src/NativeBridge.ts` | Code | Returns MOCK_PROJECT on any error |
| `services/pre-processing/src/cv_models.py` | Code | `sam2_pipeline.py` uses rembg, ONNX path unused |
| `services/mcp-server/src/index.ts` | Code | Single tool only |

## Open Questions

- [ ] Does desktop AI prompt actually work after #33 changes? (Need code verification)
- [ ] Can UniFFI bindings be generated and compiled for mobile? (Need build check)
- [ ] Is SAM2 ONNX model available in the Docker image? (Need Dockerfile check)
- [ ] Do we have Azure credentials for deployment? (User question)

## Decisions Made

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-01 | Feature scope: close 8 remaining gaps across 7 formats | These are the only gaps remaining after 34 features |
| 2026-07-01 | No new architecture, wiring-only | All architecture is complete; gaps are connection problems |
| 2026-07-01 | Verify before fixing — don't trust docs | #33 changelog may claim fixes that aren't real; pattern from #34 |

## Discussion Complete ✅

**Summary**: Close the final 8 gaps — 3 app wiring fixes, 3 microservice depth improvements, 1 MCP expansion, 1 production deployment. All are small, specific wiring tasks. No new architecture needed.

**Completed**: 2026-07-01
**Next**: Create architecture doc → `architecture.md`
