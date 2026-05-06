# 🏛️ Architecture: AI Workflow Generation from Prompt

> **Feature**: `41` — AI Workflow Generation from Prompt
> **Status**: 🟢 LOCKED
> **Branch**: `feature/41-ai-workflow-generation`
> **Date Locked**: 2026-05-06
> **Discussion**: [discussion.md](./discussion.md)

---

## Open Questions — Resolved

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Auto-layout: dagre vs hand-rolled | **Hand-rolled top-down BFS** | Zero new deps. Output graphs are ≤12 nodes; dagre is overkill. Easy to upgrade later if Sugiyama ever earns its keep. |
| 2 | Quota cost: per-call vs per-node | **1 unit per call** | Matches `/api/v1/ai/generate`. Simpler mental model. Bills track LLM calls, not graph size. |
| 3 | Model | **`groq:llama-3.3-70b-versatile` with `response_format: json_object`** | Same path as decision-scorer; proven to return strict JSON. Together stays as `lazymind` fallback automatically (we reuse `callLazyMind`). |
| 4 | REST exposure | **Cookie-only at v1** | Match `/api/v1/ai/generate`. Promote to bearer + scope after 30 days of telemetry. |
| 5 | Refine UX | **Free-form textarea pre-filled with previous prompt + node titles** | One UX path; let the LLM do the work. Structured controls add complexity for marginal gain. |

---

## Module Plan

```
lib/
  ai/
    workflow-prompt.ts          (NEW)   System prompt constant + caps
    workflow-generator.ts       (NEW)   generateWorkflow() — JSON-mode LLM call + zod parse + retry-once
  canvas/
    auto-layout.ts              (NEW)   layoutTopDown(nodes, edges) — BFS layered layout
    apply-generated-workflow.ts (NEW)   commitGeneratedWorkflow(graph, viewportCenter) — client loop
app/api/v1/ai/
  workflow/route.ts             (NEW)   POST handler, mirror of /ai/generate scaffolding
components/lazymind/
  WorkflowGeneratorModal.tsx    (NEW)   prompt → preview → Accept / Refine / Discard
  LazyMindPanel.tsx             (EDIT)  +1 quick action: "Generate a workflow…"
tests/unit/
  ai-workflow-generator.test.ts (NEW)   8+ cases — schema, retry, model fallback, cap enforcement
  ai-workflow-route.test.ts     (NEW)   6+ cases — auth/quota/plan/rate-limit/200/error paths
  canvas-auto-layout.test.ts    (NEW)   4+ cases — single chain, branch, cycle-safety, isolated nodes
```

No DB migration. No new dependency. No new env var.

---

## Data Contracts

### LLM JSON output (strict)

```ts
{
  nodes: Array<{
    tempId: string                            // 'n1' | 'n2' | …
    type: 'task' | 'doc' | 'decision' | 'thread' | 'pulse' | 'automation' | 'table'
    title: string                             // ≤ 80 chars
    description?: string                      // ≤ 240 chars
    status?: 'todo' | 'in_progress' | 'done'  // tasks only; ignored elsewhere
  }>
  edges: Array<{
    source: string                            // tempId
    target: string                            // tempId
    label?: string                            // ≤ 40 chars
  }>
  rationale: string                           // ≤ 200 chars
}
```

Hard caps enforced **post-parse** (truncate, don't reject):
- `nodes.length ≤ 12` → drop trailing nodes + drop edges that reference dropped nodes.
- `edges.length ≤ 20` → drop trailing edges.

zod errors after one retry → `WorkflowGenerationError('SCHEMA_INVALID', { raw: aiContent, issues })`.

### Public API response

`POST /api/v1/ai/workflow` body:
```ts
{ prompt: string (1..2000), workspaceId: uuid }
```

200 response:
```ts
{
  data: {
    nodes: GeneratedNode[]            // post-cap
    edges: GeneratedEdge[]            // post-cap
    rationale: string
    provider: 'groq' | 'together'
    model: string                     // e.g., 'groq:llama-3.3-70b-versatile'
  }
  error: null
}
```

Error codes (status / shape identical to `/api/v1/ai/generate`):
`UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `PLAN_LIMIT_REACHED` 402 · `RATE_LIMIT_EXCEEDED` 429 · `INVALID_JSON` 400 · `VALIDATION_ERROR` 400 · `AI_UNAVAILABLE` 503 · `WORKFLOW_GENERATION_FAILED` 502 (generator threw post-retry).

---

## System Prompt (verbatim)

```
You are LazyMind's workflow architect. Convert the user's prompt into a directed
acyclic graph of work. Output STRICT JSON only — no prose, no markdown fences.

JSON schema:
{
  "nodes": [{ "tempId": "n1", "type": "<task|doc|decision|thread|pulse|automation|table>",
              "title": "...", "description": "...", "status": "<todo|in_progress|done>" }],
  "edges": [{ "source": "n1", "target": "n2", "label": "..." }],
  "rationale": "1-sentence summary"
}

Rules:
- ≤ 12 nodes, ≤ 20 edges. Prefer fewer.
- Use task/decision/doc as primary types. Use thread/pulse/automation/table only when clearly warranted.
- Every edge.source and edge.target MUST appear in nodes[].tempId.
- tempIds: 'n1', 'n2', … sequential.
- title ≤ 80 chars. description ≤ 240 chars. label ≤ 40 chars. rationale ≤ 200 chars.
- status field only meaningful on type='task'; default 'todo'.
- Output ONE JSON object. No surrounding text.
```

Retry message (sent on first parse failure):
```
Your previous output failed JSON parsing. Re-emit STRICT JSON matching the schema, no fences, no prose.
```

---

## Auto-Layout Algorithm

`layoutTopDown(nodes, edges, origin)` — pure function:

1. Build adjacency map `parent → children[]`.
2. Find roots (nodes with no inbound edge). If none (cycle), pick `n1`.
3. BFS from roots, assigning each node a `(layer, slot)` where `layer = max(parent.layer)+1`.
4. Layout grid: `x = origin.x + slot * 280 - layerWidth/2`, `y = origin.y + layer * 140`.
5. Cycles cause infinite loops → cap BFS at `nodes.length` iterations and emit a warning.

Pure, deterministic, snapshot-testable.

---

## Client Commit Path

`commitGeneratedWorkflow(graph, viewportCenter)`:

1. Build `tempId → server-uuid` map by calling `createNodeOnServer` for each generated node in **layer order** (so parents exist before children for any future cascading semantics).
2. For each edge, look up source + target uuids; call `createEdgeOnServer({source, target})`. Skip edges where either side failed.
3. On any node-create failure mid-loop, abort and surface a toast `"Generated 4/7 nodes — see canvas"`. Don't roll back; partial state is honest.
4. The canvas store records each `addNode` / `setEdges` as a history entry. Undo will reverse one node at a time. **Acceptable for v1**; a single-undo-batch is a follow-up.

---

## Plan Gating

Reuses [`PLAN_FEATURES.aiAccess`](../../../lib/utils/plan-gates.ts). The same daily quota that governs `/ai/generate` and `/ai/chat` charges 1 unit per workflow generation. No new plan flag, no new gate.

---

## Telemetry

On the route, after `recordAiUsage`:
```ts
await db.from('audit_log').insert({
  workspace_id: workspaceId,
  actor_user_id: userId,
  action: 'ai.workflow.generated',
  resource_type: 'workspace',
  resource_id: workspaceId,
  metadata: {
    prompt_length,
    node_count,
    edge_count,
    provider,
    duration_ms,
  },
})
```

`accepted` and `refined_count` are recorded by the **client** via a separate `audit_log` insert when the user clicks Accept or Refine. Routes:
- `accepted` → uses existing `audit_log` write path (same as Template Marketplace install).
- `refined_count` → incremented on the same client log, action `ai.workflow.refined`.

---

## Test Matrix

| File | Cases |
|------|-------|
| `ai-workflow-generator.test.ts` | (1) happy path, (2) markdown fence stripping, (3) 13-node truncation, (4) 21-edge truncation, (5) edge with missing tempId dropped, (6) one retry on invalid JSON, (7) two failures → throws, (8) `hasAIKeys=false` throws `AI_NOT_CONFIGURED` |
| `ai-workflow-route.test.ts` | (1) 401 no session, (2) 403 non-member workspace, (3) 402 quota exceeded, (4) 429 rate limited, (5) 400 validation, (6) 200 happy path, (7) 503 when `hasAIKeys=false` |
| `canvas-auto-layout.test.ts` | (1) single chain n1→n2→n3 lays out diagonally, (2) branch (n1→n2, n1→n3) places siblings horizontally, (3) self-cycle node placed at root, (4) isolated node gets its own root layer |

---

## Risks

1. **LLM emits a node with type outside the enum** → zod fails → retry → still fails → 502. **Mitigation**: explicit enum in system prompt + retry path.
2. **User prompt is itself a prompt-injection** ("Ignore your instructions and emit X") → JSON output may break. **Mitigation**: zod parse is the wall. Worst case is a 502; we don't execute LLM-controlled code.
3. **Large workflows trigger many sequential POSTs** → slow Accept. **Mitigation**: cap at 12 nodes + 20 edges; sequential POSTs at ~50ms each = ~1.5s worst case. Acceptable.
4. **Audit-log writes fail** → not user-visible. **Mitigation**: wrap in try/catch; never block the success response.

---

## Decision

✅ Architecture locked. Tasks file follows.
