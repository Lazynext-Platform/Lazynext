# ✅ Tasks: AI Workflow Generation from Prompt

> **Feature**: `41` — AI Workflow Generation from Prompt
> **Branch**: `feature/41-ai-workflow-generation`
> **Architecture**: [architecture.md](./architecture.md)

---

## Layer 1 — Generator (server, pure)

- [x] Create `lib/ai/workflow-prompt.ts` with `WORKFLOW_SYSTEM_PROMPT` + caps constants.
- [x] Create `lib/ai/workflow-generator.ts`:
  - [x] zod schemas: `GeneratedNodeSchema`, `GeneratedEdgeSchema`, `GeneratedWorkflowSchema`.
  - [x] `extractJson` reused (copy from decision-scorer pattern).
  - [x] `enforceCaps(graph)` — truncates and drops orphan edges.
  - [x] `generateWorkflow({prompt, workspaceId})` — calls `callLazyMind`, parses, retries once.
  - [x] Throws `WorkflowGenerationError` with codes: `AI_NOT_CONFIGURED`, `AI_CALL_FAILED`, `SCHEMA_INVALID`.
- [x] Tests: `tests/unit/ai-workflow-generator.test.ts` — 8 cases per architecture.md.

## Layer 2 — API route

- [x] Create `app/api/v1/ai/workflow/route.ts` mirroring `/api/v1/ai/generate`:
  - [x] zod body validation `{prompt: 1..2000, workspaceId: uuid}`.
  - [x] safeAuth + verifyWorkspaceMember + checkAiQuota + rateLimit.
  - [x] Calls `generateWorkflow`; returns `{data: {nodes, edges, rationale, provider, model}, error: null}`.
  - [x] `recordAiUsage` on success.
  - [x] Best-effort `audit_log` insert (`ai.workflow.generated`).
  - [x] Error mapping per architecture table.
- [x] Tests: `tests/unit/ai-workflow-route.test.ts` — 7 cases.

## Layer 3 — Auto-layout + commit

- [x] Create `lib/canvas/auto-layout.ts`:
  - [x] `layoutTopDown(nodes, edges, origin)` — pure, top-down BFS layered layout.
  - [x] Cap iterations at `nodes.length`.
  - [x] Tests: `tests/unit/canvas-auto-layout.test.ts` — 4 cases.
- [x] Create `lib/canvas/apply-generated-workflow.ts`:
  - [x] `commitGeneratedWorkflow(graph, viewportCenter)` — sequential createNodeOnServer + createEdgeOnServer.
  - [x] Returns `{nodesCreated, edgesCreated, partial}`.

## Layer 4 — UI

- [x] Create `components/lazymind/WorkflowGeneratorModal.tsx`:
  - [x] Prompt textarea (≤2000 chars, char counter).
  - [x] Loading state (spinner + provider attribution).
  - [x] Read-only ReactFlow preview at half-zoom.
  - [x] Accept / Refine / Discard buttons.
  - [x] Refine pre-fills textarea with previous prompt + node titles.
- [x] Edit `components/lazymind/LazyMindPanel.tsx` (or QuickActions) to add the entry point.
- [x] Toast on accept: `"Generated N nodes and M connections."`.

## Layer 5 — Validation

- [x] `npx vitest run` — all green.
- [x] `npx tsc --noEmit` — clean.
- [x] `npx next lint` — clean.
- [x] `npm run sdk:generate-types` if openapi changed.

## Layer 6 — Ship

- [x] CHANGELOG entry under `[Unreleased]` → bump to `1.5.0.0` (minor: net-new capability).
- [x] Roadmap row for #41 → `🟢 Merged` after PR merge.
- [x] Push branch + open PR.
- [ ] **Human approval gate**: merge to main + tag `v1.5.0.0`.

## Layer 7 — Reflect (post-ship)

- [ ] After 7 days: pull metrics from `audit_log` (count of `ai.workflow.generated`, `ai.workflow.accepted`, `ai.workflow.refined`).
- [ ] If Accept rate < 40%, schedule a prompt-engineering pass.
