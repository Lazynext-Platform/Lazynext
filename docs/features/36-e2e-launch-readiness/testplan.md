# 🧪 Testplan: E2E Launch Readiness

| ID | Case | Type | Pass Criterion | Status |
|---|---|---|---|---|
| TC1 | `cargo test --workspace` | unit | all pass (baseline 490) | ⬚ |
| TC2 | `bun test` (apps/web) | unit | all pass | ⬚ |
| TC3 | CLI `edit`+`render` → MP4 | E2E | ffprobe-valid file | ⬚ |
| TC4 | Gateway `/health` + `/swagger-ui` | smoke | 200 + UI loads | ⬚ |
| TC5 | MCP `initialize`+`tools/list` | protocol | JSON-RPC valid, 47 tools | ⬚ |
| TC6 | Desktop open+play/pause+export | smoke | frame renders, MP4 out | ⬚ |
| TC7 | Web editor + prompt → timeline change | E2E | no console errors, mutation | ⬚ |
| TC8 | Mobile EditorScreen via NativeBridge | smoke | real data, no mock fallback | ⬚ |
| TC9 | Extension capture → POST `/ai/ingest` | smoke | 201 response | ⬚ |
| TC10 | `check_job_status` returns real artifact | regression | no `cdn.lazynext.ai` string | ⬚ |
| TC11 | One sentence → 60s rough cut | value-prop | ffprobe-valid MP4 | ⬚ |
