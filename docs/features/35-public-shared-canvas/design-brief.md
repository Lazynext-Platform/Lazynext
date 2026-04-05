# Design Brief — Public Shared Canvas

> **Feature**: 35 — Public Shared Canvas
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A read-only public view of a shared workflow canvas with branded top bar (workspace name, read-only badge, stats), full node rendering (Task/Decision/Doc/Thread/Pulse with data), share link modal (URL, toggle, view count), Lazynext watermark/CTA footer, and zoom controls.
**Why**: Teams need to share workflows externally with clients, stakeholders, or the public — driving viral distribution while protecting edit access.
**Where**: Public URL (e.g., app.lazynext.com/s/[slug]) accessible without authentication.

---

## Target Users
- **External stakeholders**: Viewing shared project workflows (read-only)
- **Prospective users**: Discovering Lazynext through shared links (conversion funnel)
- **Workspace members**: Generating and managing share links

---

## Requirements

### Must Have
- [x] Top bar: Lazynext logo, workflow name + sharing workspace, read-only badge (amber), node count + last updated, "Sign up free" CTA
- [x] Full canvas render: all node types with data (titles, scores, descriptions, status badges)
- [x] Edges between nodes
- [x] Zoom controls (simplified: +/percentage/-)
- [x] Branded watermark footer: "Built with Lazynext" + "Try it free" CTA

### Nice to Have
- [x] Share link management modal: public URL, copy button, toggle on/off, view count + creation date
- [x] Canvas grid background for spatial context
- [x] All node types represented (Task, Decision, Doc, Thread, Pulse)

### Out of Scope
- Node click/expand interaction (read-only view only)
- Commenting or annotation by viewers
- Password-protected shared links
- Embed/iframe mode

---

## Layout

**Page type**: Public full-screen canvas (no sidebar, no auth)
**Primary layout**: Top bar (h-12) + full canvas area + watermark footer (bottom center)
**Key sections**: Top bar → Canvas with nodes/edges → Zoom controls (bottom-right) → Share modal (top-right, shown for demo) → Watermark (bottom-center)

---

## Responsive Behavior
- **Mobile**: Top bar simplified, nodes scrollable, watermark at bottom
- **Tablet**: Full canvas with zoom
- **Desktop**: Full layout as designed

---

## Constraints
- Must render without authentication
- Read-only — no editing, no node expansion
- Watermark/CTA cannot be removed (viral distribution mechanism)
- Share toggle allows owner to disable public access

---

## References
- Feature 05 (Workflow Canvas) — source canvas being shared
- Feature 27 (Real-time Collaboration) — authenticated multi-user editing (contrast)
- Section 48.4 Distribution Strategy in blueprint — viral loop via shared links
