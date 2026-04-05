# 📋 Tasks — Workflow Canvas

> **Feature**: 05 — Workflow Canvas
> **Branch**: `feature/01-landing-page`
> **Created**: 2026-04-06

---

## Build

- [x] Update default nodes to match Blueprint mockup (5 nodes: 2 tasks, 1 doc, 2 decisions)
- [x] Enhance TaskNode with priority dots and due date display
- [x] Enhance DocNode with updatedAt and wordCount display
- [x] Upgrade NodeDetailPanel with full Decision DNA fields (Resolution, Rationale, Options, Type, Score, Outcome)
- [x] Add sample Thread messages with avatars in detail panel
- [x] Enhance TopBar with breadcrumb, presence avatars, Share, LazyMind AI button
- [x] Enhance Sidebar with Workflows section, Primitives palette (6 types), Workspace section, Upgrade to Pro

## Already Implemented (existing codebase)

- [x] ReactFlow canvas with Background, Controls, MiniMap
- [x] 7 node types (task, doc, decision, thread, pulse, automation, table)
- [x] NodeWrapper with colored borders and type indicators
- [x] CanvasToolbar with floating + button and node creation menu
- [x] Canvas store (Zustand) with undo/redo, node CRUD, selection
- [x] Workspace layout with collapsible sidebar
- [x] Mobile fallback (NodeListView)

## Verification

- [x] Build passes (`npm run build`)
