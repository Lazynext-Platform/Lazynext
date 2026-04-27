# 🏗️ Feature Architecture — Workflow Canvas

> **Feature**: 05 — Workflow Canvas
> **Status**: 🟢 FINALIZED (retroactive — authored during documentation pass)
> **Date**: 2026-04-06
> **Last verified against code**: 2026-04-28

---

## Overview

The spatial canvas is the platform's primary working surface. Three-column app shell: collapsible left sidebar (workspace + workflows nav), center ReactFlow canvas with custom typed nodes and edges, right collapsible detail panel. State is held in `stores/canvas.store.ts` (Zustand). Persistence is server-side via `nodes`, `edges`, and `workflows` Supabase tables; updates are debounced through hook-based persisters in `lib/canvas/`.

## File Structure

```text
app/(app)/workspace/[slug]/canvas/
├── loading.tsx
├── error.tsx
└── [id]/
    ├── page.tsx                        # Canvas route — fetches workflow, renders WorkflowCanvas
    ├── layout.tsx
    ├── loading.tsx
    └── error.tsx

components/canvas/
├── WorkflowCanvas.tsx                  # ReactFlow shell + dynamic SSR import
├── CollaborationOverlay.tsx            # Realtime presence cursors / avatars (see #27)
├── nodes/
│   ├── NodeWrapper.tsx                 # Shared node chrome (selection ring, type accent)
│   ├── TaskNode.tsx                    # blue
│   ├── DocNode.tsx                     # emerald
│   ├── DecisionNode.tsx                # orange
│   ├── ThreadNode.tsx                  # purple
│   ├── PulseNode.tsx                   # cyan
│   ├── AutomationNode.tsx              # amber
│   └── TableNode.tsx                   # teal — see #25
├── edges/
│   └── WorkflowEdge.tsx                # Type-aware edge styling
├── mobile/
│   └── NodeListView.tsx                # Mobile fallback (<640px) — see #06
└── panels/
    ├── CanvasToolbar.tsx               # Zoom + lock + fit (see #33)
    ├── CanvasContextMenu.tsx           # Right-click menu
    ├── NodeDetailPanel.tsx             # Right detail panel shell (see #09)
    ├── TaskDetailPanel.tsx
    ├── DocDetailPanel.tsx
    ├── DecisionDetailPanel.tsx
    ├── ThreadPanel.tsx
    ├── TablePanel.tsx
    ├── WorkflowFormModal.tsx           # Create / rename workflow
    ├── WorkflowPicker.tsx              # Switch active workflow
    └── ShareWorkflowDialog.tsx         # See #35

stores/
├── canvas.store.ts                     # nodes, edges, selection, snapshot history, server context
├── ui.store.ts                         # sidebar/panel/modal open state
├── upgrade-modal.store.ts              # Paywall modal state (see #22)
└── workspace.store.ts                  # active workspace context

lib/canvas/
├── persist-helpers.ts                  # Shared persistence helpers
├── use-canvas-hydration.ts             # Hydrates store from server data on mount
├── use-canvas-position-persist.ts      # Debounced position autosave
└── use-canvas-delete-persist.ts        # Cascading delete (node + incident edges)

app/api/v1/
├── workflows/route.ts                  # List / create
├── workflows/default/route.ts          # Resolve "default" workflow for a workspace
├── workflows/[id]/route.ts             # Get / update / delete
├── workflows/[id]/share/route.ts       # Public share token (#35)
├── nodes/route.ts                      # POST create
├── nodes/positions/route.ts            # Bulk position patch (drag-end batching)
├── nodes/[id]/route.ts                 # PATCH / DELETE single
└── edges/route.ts                      # POST create / DELETE
```

## Data Model

### `workflows`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK | Workflow id |
| `workspace_id` | uuid | FK | Owning workspace (RLS predicate) |
| `name` | text | not null | Display name |
| `share_token` | text | nullable, unique | Public-share token (#35) |
| `share_enabled` | bool | default false | — |

### `nodes`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK | Node id |
| `workspace_id` | uuid | FK | Owning workspace (RLS predicate) |
| `workflow_id` | uuid | FK | Owning workflow |
| `type` | text | enum | `task` / `doc` / `decision` / `thread` / `pulse` / `automation` / `table` |
| `position` | jsonb | `{x,y}` | Canvas coordinates |
| `data` | jsonb | per-type | Title, description, status, score, etc. |
| `created_at` / `updated_at` | timestamptz | | Audit columns |

### `edges`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK | — |
| `workflow_id` | uuid | FK | — |
| `source` | uuid | FK → nodes | — |
| `target` | uuid | FK → nodes | — |
| `data` | jsonb | nullable | label, kind, etc. |

RLS: every read/write predicates on `workspace_id ∈ (user's memberships)`.

## Component Design

### `WorkflowCanvas` (client)

- **Responsibility**: Mount ReactFlow, register `nodeTypes` + `edgeTypes`, wire ReactFlow's `onNodesChange` / `onEdgesChange` / `onConnect` to `canvas.store`
- **SSR**: dynamically imported with `ssr: false` — ReactFlow needs `window`
- **Server context**: on mount, resolves the active workflow via `GET /api/v1/workflows/default` and writes `currentWorkflowId` / `currentWorkspaceId` into the store. Until both ids exist, the canvas runs as an in-memory scratchpad — persisters short-circuit on null `currentWorkflowId`.
- **Viewport breakpoint**: render `mobile/NodeListView` instead below 640px

### `canvas.store` (Zustand)

```ts
interface CanvasState {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  isLazyMindOpen: boolean
  isNodePanelOpen: boolean

  // Snapshot-based history
  history: { nodes: Node[]; edges: Edge[] }[]
  historyIndex: number

  // Server context (set by WorkflowCanvas after hydration)
  currentWorkflowId: string | null
  currentWorkflowName: string | null
  currentWorkspaceId: string | null
  isHydrated: boolean

  // Mutators
  setNodes, setEdges, onNodesChange, onEdgesChange, onConnect,
  addNode, updateNodeData, removeNode, /* … */
}
```

- **History model**: snapshot-based (each significant mutation pushes `{nodes, edges}`). Simpler than action-based for ReactFlow's diff-style change events; trade-off is memory growth — capped via a sliding window.
- **Autosave**: hook-based subscribers in `lib/canvas/use-canvas-position-persist.ts` and `use-canvas-delete-persist.ts` debounce changes and call the API. Position changes batch through `POST /api/v1/nodes/positions`.

### Nodes (per-type)

Each node component wraps `NodeWrapper` (shared chrome) and renders type-specific content. All seven types follow the same pattern:
- Read data from `props.data` (typed via discriminated union)
- Render type-colored chrome (left border, icon) per `design-system.md`
- Forward selection clicks to `canvas.store` via the selected-node setter

## Data Flow

### Page load
```
canvas/[id]/page.tsx (server)
  → fetches workflow + nodes + edges
  → renders <WorkflowCanvas initialData={…} />
  → use-canvas-hydration.ts seeds the store
  → ReactFlow mounts and renders
```

### Node creation
```
User → NodeCreationFAB (#29) → canvas.store.addNode()
                              → POST /api/v1/nodes
                              → API inserts row, broadcasts via Realtime (#27)
                              → other clients merge insert into their store
```

### Node drag (position update)
```
ReactFlow → onNodesChange → applyNodeChanges → canvas.store.setNodes
                          → use-canvas-position-persist (debounced 800ms)
                          → POST /api/v1/nodes/positions  (bulk patch)
```

### Node edit (panel)
```
NodeDetailPanel → onChange → canvas.store.updateNodeData()
                          → debounced PATCH /api/v1/nodes/[id]
```

### Node delete
```
canvas.store.removeNode() → use-canvas-delete-persist
                          → DELETE /api/v1/nodes/[id]   (API cascades incident edges)
```

## Configuration

No new env vars; reads `NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_SERVICE_ROLE_KEY` (server only).

## Security Considerations

- All mutation routes verify the user's workspace membership via Supabase RLS — enforced at the DB layer, not just the API
- ReactFlow renders user-supplied content (node `data.title`, `data.description`) — properly React-escaped; no `dangerouslySetInnerHTML`
- Free plan capped at 3 concurrent editors per workspace via `lib/wms.ts` (Realtime presence count)

## Trade-offs & Alternatives

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| ReactFlow + Zustand | Mature, SSR-safe, plugin points cover ~95% needs | Bundle size ~80KB | ✅ Selected |
| Snapshot-based history | Trivial to implement against ReactFlow's change events | Memory grows; capped via sliding window | ✅ Selected (over action-based) |
| Per-node PATCH on every drag tick | Simplest | Network spam | ❌ Replaced with debounced bulk `nodes/positions` |
| `tldraw` | Better drawing tools | Overkill for graph-only product | ❌ Rejected |
| Hand-rolled SVG canvas | Full control | Months of pan/zoom/edge math | ❌ Rejected |
| Liveblocks for collab + state | Built-in CRDT | Second auth model + paid SaaS | ❌ Rejected (see #27) |
| CRDT for text fields | True conflict-free editing | Complex; field-level autosave is sufficient at v1.0 scale | ❌ Deferred |

## Architecture Finalized ✅
