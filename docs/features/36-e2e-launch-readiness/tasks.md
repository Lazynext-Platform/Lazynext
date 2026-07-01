# 📋 Tasks: E2E Launch Readiness — All 7 Formats

> **Feature**: `36` — E2E Launch Readiness
> **Branch**: `feature/36-e2e-launch-readiness`

## Approval ✅
> **Stage 4 signoff** — Owner confirmed "Yes — plan then build" on 2026-07-01.
> Scope: Gemini LLM, Azure target, all 7 formats, execute Phase 0 live after this plan.
> Open item: real `GEMINI_API_KEY` pending (graceful-degrade until provided).
> **Approved by**: Lazynext Owner (via opencode session, 2026-07-01).

---

## Phase 0 — Verification & Triage
- [x] 0.1 Create feature branch `feature/36-e2e-launch-readiness` from latest main ✅
- [x] 0.2 Run `cargo test --workspace`; capture pass/fail counts → **0 failures (210+ tests)** ✅
- [x] 0.3 Web shell typechecks: `tsc --noEmit` → **no errors** ✅ (`bun test` pending)
- [x] 0.4 **CLI live**: `edit` (graceful AI degrade ✅) + `render` → **valid H.264 MP4** (truncates on synthetic clip — bug #1) ✅
- [x] 0.5 **Gateway live**: `/health` ok, `/swagger-ui/` **200**, OpenAPI 3.1.0 valid, graceful DB degrade ✅
- [x] 0.6 **MCP live**: `initialize` handshake ok, **auth enforced** ✅
- [ ] 0.7 **Desktop live**: `cargo run -p lazynext-desktop`; open + play/pause + export *(needs display)*
- [ ] 0.8 **Web live**: `bun run dev` + Playwright *(shell typechecks; full E2E next)*
- [ ] 0.9 **Mobile live**: RN build (android/ios); verify NativeBridge *(needs SDKs)*
- [ ] 0.10 **Extension live**: load unpacked in Chrome; capture → POST `/ai/ingest` *(needs Chrome)*
- [x] 0.11 Triage report: concrete pass/fail per format → changelog ✅

## Phase 1 — Core Value-Prop Hardening (the AI editing loop)
- [ ] 1.1 FIX `autonomous.rs:68` — `check_job_status` returns real render artifact
- [ ] 1.2 FIX `neural_engine/lib.rs:219` — dummy detection → real or documented fallback
- [ ] 1.3 FIX `autonomous.rs:56` — async `process_intent` delegates to real LLM path
- [ ] 1.4 Wire real `GEMINI_API_KEY` (once owner provides); verify NL→CRDT on real clip
- [ ] 1.5 Voice input → Whisper → intent (web + mobile)
- [ ] 1.6 E2E demo: one sentence → 60s rough cut, ffprobe-verified

## Phase 2 — Per-Format Launch Readiness
- [ ] 2.1 Web: deploy + real auth + billing smoke
- [ ] 2.2 Desktop: signed macOS/Windows build, 30fps GPU preview
- [ ] 2.3 Mobile: TestFlight + internal Android
- [ ] 2.4 Extension: Chrome Web Store listing
- [ ] 2.5 CLI: published binary + docs
- [ ] 2.6 Gateway: public URL + rate limits + public Swagger
- [ ] 2.7 MCP: registry entry + auth

## Phase 3 — Operational
- [ ] 3.1 Monitoring dashboards green; alerts routed
- [ ] 3.2 On-call runbook; backups; secret rotation
- [ ] 3.3 Load test; cost monitoring

## Testing Phase
- [ ] T.1 Add regression test: `check_job_status` artifact is resolvable (no fake CDN)
- [ ] T.2 Add CLI E2E: `edit`→`render`→ffprobe on sample clip
- [ ] T.3 Re-run full workspace test suite; all green

## Docs Phase
- [ ] D.1 Update `docs/project-roadmap.md` with Feature #36
- [ ] D.2 Update `Mastery_Docs/agent-work-log.md` per session
- [ ] D.3 Write `review.md` at feature completion
