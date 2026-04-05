# 💬 Feature Discussion — Workflow Canvas

> **Feature**: 05 — Workflow Canvas
> **Status**: 🟢 COMPLETE
> **Date**: 2026-04-06

---

## What Are We Building?

The core spatial canvas view — the primary working surface of Lazynext. A three-column layout with collapsible sidebar, ReactFlow canvas with typed node cards, and a collapsible detail panel. Features Decision DNA showcase with quality scores, thread comments, and full spatial node-edge relationships.

## Why?

The canvas is the product's core differentiator — making relationships between tasks, documents, and decisions tangible and navigable on a spatial graph, replacing separate tools with a unified workspace.

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Canvas library | ReactFlow (@xyflow/react) | Industry standard, handles panning/zooming/dragging, SSR-safe with dynamic import |
| State management | Zustand (canvas.store + ui.store) | Lightweight, React 18-compatible, perfect for canvas state |
| Node typing | 7 custom node types via nodeTypes map | Each node type has distinct visual identity matching design system colors |
| Demo data approach | Hardcoded default nodes/edges matching Blueprint mockup | Shows the product's capability at first load without needing a backend |

## Discussion Complete ✅
