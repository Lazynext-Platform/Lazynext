# Merge Request: {Title}

<!--
  Lazynext MR Template
  Fill in every section.  Remove sections that genuinely do not apply,
  but leave a short note explaining why.
-->

## Summary

<!-- Brief description of what this MR does and why. 2-4 sentences. -->

Closes #<ISSUE_NUMBER>

## Type of Change

<!-- Check all that apply with [x] -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)
- [ ] Documentation
- [ ] CI/CD or build improvement
- [ ] Dependency update

### Affected Modules

<!-- Check modules you touched -->

- [ ] Rust core (`rust/core`, `rust/crates/*`)
- [ ] WASM bridge (`rust/wasm`)
- [ ] Web app (`apps/web`)
- [ ] Desktop app (`apps/desktop`)
- [ ] Mobile app (`apps/mobile`)
- [ ] Browser extension (`apps/browser-extension`)
- [ ] Pre-Processing service (`services/pre-processing`)
- [ ] Generative Studio (`services/generative-studio`)
- [ ] AI Agents (`services/ai-agents`)
- [ ] Render Service (`services/render-service`)
- [ ] Analytics Service (`services/analytics-service`)
- [ ] Collab Server (`services/collab-server`)
- [ ] MCP Server (`rust/mcp-server`)
- [ ] Infrastructure (Terraform, K8s, Docker)
- [ ] CI/CD pipelines

## Testing

### Test Plan

<!-- How did you test this?  What scenarios did you cover? -->

- [ ] Unit tests added / updated
- [ ] Integration tests added / updated
- [ ] E2E tests added / updated
- [ ] Manual testing performed
- [ ] Performance benchmarked

### Test Commands (commands reviewer can run)

```bash
# Rust
cargo test --workspace --exclude lazynext_desktop

# Web app
cd apps/web && bun run test

# Web E2E
cd apps/web && bun run test:e2e

# Typecheck
bun run typecheck

# Lint
bun run lint

# Docker
docker compose up --build -d
./smoke-tests.sh
```

## Screenshots / Recordings

<!--
  For UI changes: attach before/after screenshots or a short screen recording.
  For CLI / API changes: paste output demonstrating the change.
  For performance changes: attach before/after benchmarks.
-->

| Before | After |
|--------|-------|
|        |       |

## Checklist

- [ ] My code follows the project style guide (Biome, Rust fmt, ESLint)
- [ ] I have performed a self-review of my own code
- [ ] I have commented hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] New and existing tests pass locally with my changes
- [ ] I have verified the WASM build still works (`./build-wasm.sh`)
- [ ] I have verified Docker images build (`docker compose build`)
- [ ] Any dependent changes have been merged and published downstream

## Additional Notes

<!-- Anything else the reviewer should know: design decisions, trade-offs, follow-up work -->

---

/label ~"needs review"
/assign_reviewer @team
