# API Changelog

> Customer-facing public API change log. For internal architectural
> changes see `docs/features/40-public-rest-api/changelog.md`.

Versioning policy: [api-versioning.md](./api-versioning.md). Default
sunset window is 6 months minimum; most deprecations run 9–12 months.

---

## Unreleased

### Added
- All `/api/v1/*` responses now carry `X-Request-Id` and `X-API-Version`
  headers. Quote `X-Request-Id` in support tickets for faster diagnosis.
- Bearer-key requests get a stricter, plan-aware two-tier rate limit
  (per-key bucket + workspace ceiling). Cookie-session requests are
  unchanged.
- `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers now ship
  alongside the existing `X-RateLimit-Reset` and `Retry-After`. Use
  the `Limit` and `Remaining` headers to throttle pre-emptively
  instead of waiting for a 429.

### Changed
- `GET /api/v1/whoami` now returns rate-limit headers on 200 and 429
  responses. The body shape is unchanged.

### Deprecated
- _(none)_

### Removed
- _(none)_

---

## Version log

_(empty — `v1` is the inaugural public version)_
