# Feature #39 — Doc Cleanup & Test Backfill (Lightweight)

**Status**: 💬 IN PROGRESS
**Type**: Docs + tests (no product surface change)
**Date**: 2026-04-28
**Branch**: `feature/39-doc-cleanup-and-tests`

---

## Summary

Surfaced by the Mastery cross-check audit on 2026-04-28: four small, safe documentation/test gaps where shipped code disagrees with the docs, plus one missing unit-test surface. Fixing them as a single lightweight feature avoids opening four near-empty branches.

This feature is **lightweight-eligible** per [`docs/mastery.md`](../../mastery.md):

1. ✅ No new code logic — docs edits + one unit test that exercises existing behavior. The CSV parser is *extracted* (pure refactor, identical behavior) so it can be unit-tested in isolation.
2. ✅ No architectural decisions — no new files outside `lib/utils/csv-import.ts` (extract) and `tests/unit/import-csv.test.ts` (new test).
3. ✅ Well-understood scope — see "Scope & Approach" below.
4. ✅ Low risk — fails-safe; the parser refactor is byte-for-byte identical, all docs edits are read-only narrative.
5. ✅ Self-contained — no other features in flight.

## Scope & Approach

| File | Change |
|---|---|
| [docs/features/15-import-modal/design-brief.md](../15-import-modal/design-brief.md) | Mark OAuth-wizard requirements as **roadmap (not yet shipped)** instead of `[x]`. Add a "Current Shipping State" section so design-brief stops claiming features that aren't built. |
| [docs/features/30-profile-account-settings/summary.md](../30-profile-account-settings/summary.md) | Correct the 2FA paragraph: code shows "Managed externally" badge, not in-app TOTP enrollment. Strike the false `qrcode` package claim. |
| [CHANGELOG.md](../../../CHANGELOG.md) | Add header link pointing to [`docs/project-changelog.md`](../../project-changelog.md) for full version history (root file only carries the latest 4 versions). |
| [components/ui/ImportModal.tsx](../../../components/ui/ImportModal.tsx) | Replace inline `parseCsv` + `rowsToImportItems` with imports from new `lib/utils/csv-import.ts`. Pure extraction — same code, same behavior. |
| [lib/utils/csv-import.ts](../../../lib/utils/csv-import.ts) | **New.** Holds the extracted `parseCsv` + `rowsToImportItems` so they're unit-testable. |
| [tests/unit/import-csv.test.ts](../../../tests/unit/import-csv.test.ts) | **New.** RFC-4180 parser cases (quoted fields, embedded commas, escaped quotes, CRLF, blank rows) + `rowsToImportItems` mapping cases. |

### Out of scope (deferred — needs human sign-off per autonomy boundaries)

- Roadmap reclassification of features (none required after re-verification — #30 status is correct, summary text was the real issue).
- Backfilling missing version entries (`v1.3.6.0`, `v1.3.7.0`, `v1.3.8.0`, `v1.3.25.0`, `v1.3.27.0`) into [`docs/project-changelog.md`](../../project-changelog.md) — **resolved**: re-verification on 2026-04-28 confirmed all five entries are already present (lines 330, 346, 578, 586, 594). Audit produced a false positive; no work needed.
- Promoting backlog items (REST API, AI workflow gen, PDF export, etc.) into numbered roadmap features — **partially resolved**: drafted [`docs/features/40-public-rest-api/discussion.md`](../40-public-rest-api/discussion.md) as a 🟡 IN PROGRESS draft. Roadmap **not yet updated** — promotion to numbered feature pending human approval.

## Tasks

- [x] Create feature branch `feature/39-doc-cleanup-and-tests`
- [x] Create this `lightweight.md`
- [x] Extract `parseCsv` + `rowsToImportItems` to `lib/utils/csv-import.ts`
- [x] Update `components/ui/ImportModal.tsx` to import the extracted helpers
- [x] Add `tests/unit/import-csv.test.ts` covering RFC-4180 edge cases + mapping
- [x] Update `docs/features/15-import-modal/design-brief.md` to reflect honest empty state
- [x] Update `docs/features/30-profile-account-settings/summary.md` to correct 2FA claim
- [x] Add CHANGELOG.md cross-reference header
- [x] Run `npm run type-check` — must stay clean
- [x] Run `npx vitest run tests/unit/import-csv.test.ts` — must pass
- [x] Run full vitest suite to confirm no regression
- [ ] Commit + push
- [ ] Request human approval to merge

### Verification

- [x] `npm run type-check` exits 0
- [x] New CSV unit test passes (20/20)
- [x] Full vitest suite still passes (318/318, was 298 + 20 new)
- [x] `npm run lint` clean (only pre-existing `global-error.tsx` `<img>` warning, unrelated to this branch)
- [x] `git diff main -- components/ui/ImportModal.tsx` shows only the import re-wire (no behavioral change)

## Changelog

| Date | Entry |
|---|---|
| 2026-04-28 | Branch created. `lightweight.md` drafted. Audit findings recorded. |
| 2026-04-28 | Extracted `parseCsv` + `rowsToImportItems` from `ImportModal.tsx` into `lib/utils/csv-import.ts` (pure refactor). |
| 2026-04-28 | Added `tests/unit/import-csv.test.ts` — 20 cases covering RFC-4180 edges (CRLF, quoted commas, escaped quotes, embedded newlines, blank rows) and the row-to-item mapper (title-header fallbacks, type validation, status surfacing, `data` shape). |
| 2026-04-28 | Test cleanup: documented existing behavior where `status` lands in both top-level field and `data` (only `title`/`type` are excluded from `data`). |
| 2026-04-28 | Updated `docs/features/15-import-modal/design-brief.md` — added shipping-reality note + 🟡 Roadmap markers on requirements not yet built. |
| 2026-04-28 | Corrected `docs/features/30-profile-account-settings/summary.md` — 2FA is "Managed externally", not in-app TOTP. Removed false `qrcode` package claim. |
| 2026-04-28 | Added cross-reference header in `CHANGELOG.md` pointing at `docs/project-changelog.md` for full version history. |
| 2026-04-28 | type-check ✅ — vitest 318/318 ✅ — lint ✅ |
| 2026-04-28 | **Audit follow-up**: re-verified the alleged "missing changelog versions" (v1.3.6.0/7.0/8.0/25.0/27.0). All five entries are in fact present in [`docs/project-changelog.md`](../../project-changelog.md) (lines 330, 346, 578, 586, 594). The original audit grep'd a partial range and produced a false positive. No backfill needed. |
| 2026-04-28 | Drafted [`docs/features/40-public-rest-api/discussion.md`](../40-public-rest-api/discussion.md) (🟡 IN PROGRESS) for the Public REST API & SDK formalization. Roadmap promotion pending human approval. |

## Reflection

_To be filled after merge._
