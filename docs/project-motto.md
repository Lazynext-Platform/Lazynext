# 🧭 Project Motto

> **Project**: Lazynext
> **Last Updated**: 2026-07-05

---

## North Star

Build the first AI-native NLE where natural language controls professional-grade video editing across every platform surface, with Rust as the single source of truth.

---

## DO ✅

- Put all business logic in `rust/` — never in `apps/` or `services/`
- Follow the Mastery lifecycle: Discuss → Design → Plan → Approve → Build → Ship → Reflect
- Read existing components before writing new ones — they may already apply classes/styling
- Use Bun for all package management — never npm or yarn
- Gracefully degrade AI features to local processing when API keys are absent
- Test at every checkpoint — cargo test, bun test, pytest
- Log all changes in feature changelogs during build
- Commit on feature branches with Conventional Commits format

## DON'T ❌

- Never duplicate business logic between apps — it goes in `rust/`
- Never ship mock data in production — AI features must degrade, not fake it
- Never merge to main without human approval
- Never delete feature branches — they're historical reference
- Never skip lifecycle stages — every feature follows all 7 stages
- Never use `console.log` in production code — use the structured logger
- Never use `println!` in Rust production code — use `tracing` crate
- Never assume a library is available — check the codebase first

## Boundaries 🚧

- Never modify `docs/mastery.md` — it's read-only across all projects
- Never change `project-context.md` without human approval
- Never add dependencies without human approval
- Never refactor code outside the active feature's scope
- Never commit secrets or API keys to the repository

## Success Looks Like 🎯

- Every commit compiles and passes lint (cargo clippy -- -D warnings, eslint)
- Code matches the architecture doc — deviations are logged in changelog
- Changelog is updated same-session — session notes at handoff
- All task checkboxes are checked before merge
- Feature branches are pushed, merged, and preserved
- Cross-checks performed every ~5 build tasks with zero unfixed gaps
