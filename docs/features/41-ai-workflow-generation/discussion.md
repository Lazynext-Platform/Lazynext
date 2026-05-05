# 💬 Discussion: AI Workflow Generation from Prompt

> **Feature**: `41` — AI Workflow Generation from Prompt
> **Status**: 🟡 IN DISCUSSION
> **Branch**: `feature/41-ai-workflow-generation`
> **Depends On**: #05 Workflow Canvas, #10 LazyMind AI Panel, #18 Template Marketplace (data shape), #40 Public REST API (rate-limit + plan-gate scaffolding)
> **Date Started**: 2026-05-05

---

## Summary

Today, a new Lazynext workspace starts as a blank canvas plus a Templates Marketplace (#18) of six curated graphs. To populate a real workflow the user must either pick a template (limited to the curated six) or hand-build nodes one at a time. **AI Workflow Generation** closes that gap: the user types a freeform prompt — *"Plan our Q3 launch: design review, security audit, marketing kickoff, then ship"* — LazyMind returns a structured node graph (typed nodes + edges + positions), the user previews it on a ghost canvas, accepts or refines, and the graph drops onto the live workspace as new nodes.

This is **not** a new node type, a new chat surface, or a new persistence layer. It's a thin generator that produces the same JSON shape that `/api/v1/templates/[id]/install` already accepts.

---

## Functional Requirements

- As a **new workspace owner**, I want to type a paragraph describing a workflow and get a starting graph, so I don't have to begin from blank.
- As an **experienced user**, I want to generate a sub-workflow inline (e.g., "break this milestone into a launch plan") and have it land near my current viewport, so the AI feels like an extension of the canvas, not a separate tool.
- As a **maintainer**, I want the generator to use the **same data shape** as Template Marketplace install, so adding a new node type to the canvas extends generation for free and we don't fork two graph schemas.
- As a **billing admin**, I want this gated to the same daily AI quota that powers `/api/v1/ai/generate` and `/api/v1/ai/chat`, so a free-tier user can't burn the bill via prompt-spam.
- As a **canvas user**, I want a **preview-then-commit** flow rather than direct insert, so a bad generation doesn't pollute my workspace and my undo stack.

---

## Current State / Reference

### What Exists

- **Canvas + persistence**: [`stores/canvas.store.ts`](../../../stores/canvas.store.ts) plus [`lib/canvas/`](../../../lib/canvas/) helpers. New nodes/edges land via `addNodes`/`addEdges` actions; persisted server-side by the autosave loop.
- **Template install endpoint**: [`app/api/v1/templates/[id]/install/route.ts`](../../../app/api/v1/templates/[id]/install/route.ts) — accepts a curated template id and clones its nodes + edges into the target workspace. The shape it expects is defined by [`lib/data/template-catalog.ts`](../../../lib/data/template-catalog.ts) (`TemplateNode`, `TemplateEdge`, `TemplateNodeType = 'task' | 'doc' | 'decision' | 'thread' | 'pulse' | 'automation' | 'table'`).
- **AI provider abstraction**: [`lib/ai/lazymind.ts`](../../../lib/ai/lazymind.ts) — `callLazyMind(systemPrompt, userMessage, maxTokens)` routes to Groq or Together with a uniform return shape `{content, provider}`. `hasAIKeys()` reports whether either is configured.
- **Free-form generator route**: [`app/api/v1/ai/generate/route.ts`](../../../app/api/v1/ai/generate/route.ts) — already wires plan-gate + per-minute rate-limit + per-day AI quota + `recordAiUsage`. We extend this same pattern, not invent a parallel one.
- **Decision scorer as JSON-mode reference**: [`lib/ai/decision-scorer.ts`](../../../lib/ai/decision-scorer.ts) — already produces a strictly-typed structured output from an LLM via Groq (`response_format: json_object`). The same approach scales to a workflow-graph schema.
- **LazyMind UI**: [`components/lazymind/LazyMindPanel.tsx`](../../../components/lazymind/) — already opens from the canvas TopBar with a textarea + quick actions. The "Generate workflow" entry point belongs here.
- **Plan-gate file**: [`lib/utils/plan-gates.ts`](../../../lib/utils/plan-gates.ts) — `PLAN_FEATURES.aiAccess` already lists which plans get LazyMind. AI workflow generation should ride that flag, not add a new one.

### What Works Well

- The **graph shape is already standardized** (template-catalog `TemplateNode`/`TemplateEdge`). One JSON contract for templates AND AI output means schema bugs surface in a single place.
- The **plan/quota/rate-limit/observability stack is in place** — we don't re-implement any of it.
- The **decision-scorer pattern proves** that strict-JSON LLM outputs work reliably on Groq's `llama-3.3-70b` with `response_format: json_object`.

### What Needs Building

1. A **structured-output generator** — `lib/ai/workflow-generator.ts` — that takes a prompt and returns a validated `{nodes, edges}` object using zod parsing on the LLM's JSON response. Errors fall through to a typed `WorkflowGenerationError`.
2. A **POST endpoint** — `/api/v1/ai/workflow` — symmetric with `/api/v1/ai/generate` (auth, plan, rate-limit, AI quota, `recordAiUsage`) but with the workflow-shaped response.
3. A **preview-then-commit UI flow** — a modal that renders the proposed graph as a read-only ReactFlow miniature, with **Accept**, **Refine prompt**, **Discard** buttons. Accept calls the existing canvas `addNodes`/`addEdges` actions inside one undo group so the user can `⌘Z` the whole graph.
4. A **LazyMind quick-action entry point** — *"Generate a workflow…"* — that opens a prompt textarea and routes to the generator.
5. **Telemetry** — log `(prompt_length, node_count, edge_count, accepted, refined_count)` to the `audit_log` table so we can measure quality post-launch.

### Constraints / Non-Goals

- **No new node types.** Whatever the LLM proposes must validate against `TemplateNodeType`. Anything else is rejected and surfaced as `INVALID_NODE_TYPE` with the offending value.
- **Position layout is the LLM's job, but we re-snap.** The model returns coarse `{x, y}` ints; we run a deterministic auto-layout pass (simple top-down DAG) before commit so accepted graphs always look tidy.
- **No streaming UI** in v1. The generator is one round-trip: prompt → spinner → modal. Streaming a graph is a design rabbit hole and the per-call latency on 700-token JSON outputs is already acceptable (<3s on Groq).
- **No "edit-in-place" of generated nodes**. After Accept, the graph is just regular workspace nodes — edited via the same Node Detail Panels (#09) as anything else.
- **Bearer auth not exposed** in v1 — the route is cookie-only on launch, like `/api/v1/ai/generate`. SDK exposure is a follow-up after we see real usage.

---

## Proposed Approach

Three horizontal layers, each independently testable:

### Layer 1 — Generator (server, pure)

`lib/ai/workflow-generator.ts`

```ts
export interface GeneratedNode {
  tempId: string                 // 'n1', 'n2', … — referenced by edges
  type: TemplateNodeType         // reused from template-catalog
  title: string
  description?: string
  status?: 'todo' | 'in_progress' | 'done'   // tasks only
}
export interface GeneratedEdge {
  source: string                 // tempId
  target: string                 // tempId
  label?: string
}
export interface GeneratedWorkflow {
  nodes: GeneratedNode[]
  edges: GeneratedEdge[]
  rationale: string              // 1-sentence summary surfaced in preview
}
export async function generateWorkflow(args: {
  prompt: string
  workspaceId: string
}): Promise<GeneratedWorkflow>
```

The system prompt instructs the LLM to:
- emit ≤ 12 nodes and ≤ 20 edges (hard cap; we truncate post-parse if exceeded);
- prefer `task`/`decision`/`doc` over `thread`/`pulse`/`automation`/`table`;
- use unique `tempId`s `n1`…`nN`;
- never reference a `tempId` in `edges` that isn't in `nodes`.

zod parses the JSON; structural errors throw `WorkflowGenerationError('SCHEMA_INVALID', details)`. We retry **once** with a corrective system message before giving up.

### Layer 2 — API route

`app/api/v1/ai/workflow/route.ts` mirrors `app/api/v1/ai/generate/route.ts` shape-for-shape:

- `POST` with body `{ prompt: string (1..2000), workspaceId: uuid }`
- 401 / 403 / 402 / 429 / 503 codes identical to `/ai/generate`
- 200 returns `{ data: GeneratedWorkflow, error: null }`
- `recordAiUsage` charges 1 quota unit on success (treat workflow generation as a single AI call, not per-node)

### Layer 3 — UI

`components/lazymind/WorkflowGeneratorModal.tsx` — owns the prompt textarea, the loading state, the read-only ReactFlow preview, and the Accept/Refine/Discard buttons.

Accept path:
1. Run deterministic auto-layout (top-down BFS, 280×120 grid).
2. Translate the graph so its top-left lands at the **current viewport center**, not at world origin.
3. Open a Zustand transaction (`canvasStore.beginTransaction()` — already used by template install) that batches `addNodes` + `addEdges` into one undo entry.
4. Close modal; toast `"Generated 7 nodes and 6 connections — ⌘Z to undo"`.

Refine path:
- Append previous prompt + node titles back into the textarea pre-filled, so the user can iterate without retyping.

LazyMind quick-action entry: add a row in `components/lazymind/QuickActions.tsx` between "Summarize this decision" and "Suggest next steps". Icon: ✨ + lime accent. Triggers the modal.

---

## Open Questions (resolve in `architecture.md`)

1. **Auto-layout algorithm**: top-down BFS is the simplest viable choice. Do we want Sugiyama later? Decide whether to take a `dagre` dependency now or stay zero-dep with a hand-rolled layered layout.
2. **Quota cost**: 1 unit per call (current proposal) vs scaling by node count. Recommend 1 — keeps mental model simple, matches `/ai/generate`.
3. **Model**: stay on `groq:llama-3.3-70b` with `response_format: json_object` (matches decision-scorer) vs experimenting with Together's structured-output API.
4. **Public REST exposure**: ship cookie-only (proposal) vs add bearer + scope on day one. Recommend cookie-only; promote to public REST after 30 days of telemetry.
5. **Refine UX**: free-form textarea vs structured "add/remove a node" controls. Recommend free-form for v1 — simpler, lets the LLM do the work.

---

## Mastery Stage Plan

1. **Discussion** (this file) — ✅ written
2. **Architecture** — define the strict JSON schema, the system prompt verbatim, the zod parser, the auto-layout function signature, the modal state machine. Lock the open questions above.
3. **Tasks** — ~15 checkboxes spanning generator + route + UI + tests + telemetry.
4. **Build** — implement layer-by-layer; tests first per Mastery rules.
5. **Ship** — release as v1.5.0.0 (minor bump — net-new product capability, not a fix).
6. **Reflect** — measure (a) prompts/day, (b) Accept rate, (c) Refine count median, (d) % graphs that ship 0 edits within 24h. Anything below 40% Accept rate triggers a prompt-engineering pass.

---

## Decision

> **Pending architecture review.** No code lands until the architecture document is written and human-approved per AGENTS.md autonomy rules.
