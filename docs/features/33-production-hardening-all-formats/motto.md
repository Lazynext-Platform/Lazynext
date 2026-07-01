# 🧭 Motto: Production Hardening — All 7 Formats

> **Feature**: `33` — Production Hardening — All 7 Formats
> **Branch**: `feature/33-production-hardening-all-formats`
> **Last Updated**: 2026-07-01

---

## North Star

Every one of the 7 delivery formats must complete the full ingest → AI-edit → render → output loop independently.

---

## DO ✅

- Wire existing infrastructure — don't build new pipelines
- Fix Desktop and CLI first (they share the native Rust compositor)
- Verify before coding — read the actual source, don't trust assessments
- Add graceful degradation — every format falls back to local processing when services are down
- Test every format with real media, not test patterns

## DON'T ❌

- Don't build new rendering pipelines — the GPU compositor exists and works
- Don't change the CRDT data model — it's correct, gaps are in transport/wiring
- Don't add new crates or dependencies without human approval
- Don't refactor files outside the files listed in architecture.md
- Don't touch the 12k-line EditorClient.tsx unless absolutely necessary

## Boundaries 🚧

- Only modify files listed in architecture.md
- No new dependencies without approval
- Mobile native module verification only — don't rewrite the mobile app
- Browser extension: generate icons and add preview only — don't rebuild extension

## Success Looks Like 🎯

- Desktop app plays timeline with real frames, exports .mp4
- CLI renders real video that passes ffprobe validation
- Mobile shows real project data, not placeholder text
- MCP server responds via SSE, exports real content
- API Gateway handles SIGTERM gracefully, dispatches renders
- All 16 test cases pass
- `cargo check` and `bun typecheck` pass
