# Feature: {Title}

<!--
  Lazynext Feature Request Template
  Use this for new capabilities, enhancements, and architectural changes.
-->

## Problem Statement

<!--
  What problem does this feature solve?  Who is the user?
  Describe the current pain point.  Use user stories where possible:
  "As a {role}, I want {goal} so that {reason}."
-->

As a **{role}**, I want **{goal}** so that **{reason}**.

## Proposed Solution

<!--
  High-level description of what we will build.  Include:
  - UX flow (how the user interacts with it)
  - API / data model changes (if any)
  - New Rust crates or services (if any)
-->

## Scope

### In Scope

- [ ]
- [ ]

### Out of Scope (for this iteration)

- [ ]

## Affected Components

<!-- Check all that this feature touches -->

### Rust

- [ ] `rust/core` — NLE engine
- [ ] `rust/crates/state` — CRDT / keyframes
- [ ] `rust/crates/compositor` — GPU compositor
- [ ] `rust/crates/audio` — DSP / VST
- [ ] `rust/crates/export` — FFMPEG encoding
- [ ] `rust/crates/neural_engine` — AI / clip tagging
- [ ] `rust/wasm` — WASM bridge
- [ ] `rust/api-gateway` — REST gateway
- [ ] `rust/cli` — Headless CLI
- [ ] `rust/mcp-server` — MCP protocol
- [ ] `rust/p2p-sync` — P2P collaboration
- [ ] `rust/provenance` — Content authenticity
- [ ] `rust/plugin-api` — Plugin SDK
- [ ] New Rust crate needed?  Name: `{crate_name}`

### Apps

- [ ] `apps/web` — Next.js frontend
- [ ] `apps/desktop` — GPUI desktop
- [ ] `apps/mobile` — React Native
- [ ] `apps/browser-extension` — Chrome extension

### Services

- [ ] `services/pre-processing` — Whisper / SAM2
- [ ] `services/generative-studio` — Diffusion / dubbing
- [ ] `services/ai-agents` — Chronos Copilot
- [ ] `services/render-service` — FFMPEG farm
- [ ] `services/analytics-service` — Analytics
- [ ] `services/collab-server` — CRDT sync
- [ ] New microservice?  Name: `{service_name}`

### Infrastructure

- [ ] Terraform (Azure IaC)
- [ ] Kubernetes manifests
- [ ] Docker images
- [ ] CI/CD pipelines
- [ ] Database schema / migrations
- [ ] Observability (monitoring, logging, tracing)

## Technical Design

<!--
  Architecture decisions, data flow, API contracts.
  Link to a design doc or RFC if one exists.
-->

### Data Model Changes

```sql
-- New tables, columns, or migrations (Drizzle)
```

### API Changes

```
POST /api/v1/{new-endpoint}
GET  /api/v1/{new-endpoint}
```

### Rust Interface (if applicable)

```rust
// New trait / struct / function signatures
```

## Dependencies

<!--
  Upstream work that must be completed first.
  Link to blocking issues or PRs.
-->

- [ ] Blocks on: #{issue}

## Acceptance Criteria

<!--
  Verifiable outcomes.  Write them so a tester can check them off
  without knowing implementation details.
-->

- [ ] {AC 1}
- [ ] {AC 2}
- [ ] {AC 3}
- [ ] Unit tests pass with >80% coverage on new code
- [ ] E2E test(s) cover the happy path
- [ ] Documentation updated (CLAUDE.md, API docs, user-facing help)
- [ ] Feature flag added (if gradual rollout)
- [ ] Performance regression test passes (if applicable)

## Rollout Plan

<!--
  How do we ship this safely?
  Feature flag?  Canary deploy?  Staged rollout?
-->

- [ ] Behind feature flag (`FEATURE_{NAME}`)
- [ ] Canary to 5% of users
- [ ] Monitor for 24 hours before full rollout

## Metrics & Success

<!--
  How will we know this is successful?
  e.g. "90th percentile render time drops below 2s",
  "P0 crash rate remains below 0.01%"
-->

- Metric: {metric name}
- Baseline: {current value}
- Target: {desired value}

---

/label ~feature ~enhancement
/estimate {S|M|L|XL}
