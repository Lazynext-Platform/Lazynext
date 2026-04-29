// ─────────────────────────────────────────────────────────────
// Sentry instrumentation for /api/v1 route handlers.
//
// Background: every public-API route handler swallowed errors
// behind `if (process.env.NODE_ENV === 'development') console.error(...)`.
// In production those errors disappeared — we returned a JSON
// envelope with a 500 status and never told Sentry. The framework
// `onRequestError` hook (wired in `instrumentation.ts`) only fires
// on UNcaught throws; it never sees these handler-caught errors.
//
// `reportApiError` fills the gap. Every catch site that used to
// dev-log should call it instead. Behavior:
//   - Always invokes `Sentry.captureException(err, ...)` with the
//     tags below. Sentry is a no-op when no DSN is configured
//     (see `sentry.server.config.ts`), so this is safe to call in
//     local dev / CI without leaking events.
//   - In dev, ALSO writes to `console.error` so the existing
//     workflow (read terminal output to debug) is preserved.
//   - Returns nothing — caller still constructs the response.
//
// Tags (low-cardinality, indexable in Sentry):
//   - `route`       — `/api/v1/...` path (literal segment, params
//                      reduced to placeholders by caller)
//   - `method`      — HTTP verb
//   - `surface`     — always `api/v1` so all public-API events can
//                      be filtered by a single tag
// Extras (high-cardinality, searchable but not indexed):
//   - `requestId`   — propagates the `X-Request-Id` header value
//   - `workspaceId` — optional, when the route resolved one
//   - `userId`      — optional, when the route resolved one
// ─────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/nextjs'

export interface ApiErrorContext {
  /**
   * Route literal with dynamic segments reduced to placeholders, e.g.
   * `/api/v1/workflows/[id]`. Stable across requests so it groups
   * cleanly in Sentry. Required.
   */
  route: string
  /** HTTP method. Required. */
  method: string
  /** Stable request identifier from `X-Request-Id`. Optional but strongly preferred. */
  requestId?: string | null
  /** Workspace id when one was resolved before the throw. Optional. */
  workspaceId?: string | null
  /** User id when one was resolved before the throw. Optional. */
  userId?: string | null
  /**
   * Free-form extras for the specific call site. Avoid putting
   * request bodies in here — they may contain user data.
   */
  extra?: Record<string, unknown>
}

/**
 * Report an error caught inside an `/api/v1/*` route handler. The
 * handler still owns the response — this is fire-and-forget.
 *
 * Safe to call when no Sentry DSN is configured (Sentry init is a
 * no-op in that case; see `sentry.server.config.ts`).
 */
export function reportApiError(err: unknown, ctx: ApiErrorContext): void {
  // Always attempt to forward to Sentry. The SDK silently no-ops
  // when not initialized, so this is cheap.
  try {
    Sentry.withScope((scope) => {
      scope.setTag('surface', 'api/v1')
      scope.setTag('route', ctx.route)
      scope.setTag('method', ctx.method)
      if (ctx.requestId) scope.setTag('request_id', ctx.requestId)
      if (ctx.workspaceId) scope.setTag('workspace_id', ctx.workspaceId)
      if (ctx.userId) scope.setTag('user_id', ctx.userId)
      if (ctx.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) {
          scope.setExtra(k, v)
        }
      }
      Sentry.captureException(err)
    })
  } catch {
    // If Sentry itself throws (e.g. malformed scope payload),
    // swallow — never let observability break the request path.
  }

  // In dev, also write to the terminal so the existing debug
  // workflow is preserved verbatim.
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(`[api/v1] ${ctx.method} ${ctx.route}`, err, ctx.extra ?? {})
  }
}
