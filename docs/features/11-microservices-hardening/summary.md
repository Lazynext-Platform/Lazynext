# 📄 Summary: Microservices Hardening (Feature #11)

> **Status**: 🟢 Complete
> **Branch**: `feature/11-microservices-hardening`
> **Merged on `main`**: 2026-06-30 (`5350820c`)
> **Type**: Retroactive summary

## What Shipped

| Change | File | Detail |
|---|---|---|
| AI-agents generative path | `services/ai-agents/src/generative.ts` | +86 — replaced stub orchestration with real downstream calls. |
| Real video generation | `services/generative-studio/src/services/video_gen.py` | +43 — actual generation service wiring. |
| Pre-processing deps | `services/pre-processing/requirements.txt` | Added missing runtime dependencies. |
| Render-service tracing | `services/render-service/src/tracing.ts`, `index.ts` | OpenTelemetry tracing corrections + boot wiring. |

## Scope

~137 insertions across 5 files. Targeted bug fixes in four services rather than full rewrites.

## Known Follow-ups (depth work)

- Real Kafka analytics pipeline, real collab-server CRDT persistence, and real NeRF extraction remain — tracked under *Remaining Work* in `project-roadmap.md`.
