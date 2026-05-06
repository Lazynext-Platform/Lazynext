import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

/**
 * Custom `onRequestError` (A.2 — closes the deferred sweep from
 * v1.4.0.0). Wraps Sentry's stock `captureRequestError` to also tag
 * the event with the `X-Request-Id` from the incoming request, so a
 * Sentry issue can be cross-referenced with our access logs and a
 * customer's own request id (which we honour from inbound headers
 * via middleware).
 */
export const onRequestError: typeof Sentry.captureRequestError = (err, request, errorContext) => {
  try {
    const headers = request.headers as Record<string, string | string[] | undefined> | undefined
    const raw = headers?.['x-request-id'] ?? headers?.['X-Request-Id']
    const requestId = Array.isArray(raw) ? raw[0] : raw
    if (requestId) {
      Sentry.getCurrentScope().setTag('request_id', String(requestId))
    }
  } catch {
    // Never let tag enrichment fail an error capture.
  }
  return Sentry.captureRequestError(err, request, errorContext)
}
