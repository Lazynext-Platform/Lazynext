// Regression: ISSUE-001 — CSP blocked Sentry replay's blob: Web Worker on every public page
// Found by /qa on 2026-04-26 (live dogfood of https://lazynext.com)
// Symptom: every page logged "Refused to create a worker from 'blob:...' because
//          it violates the following Content Security Policy directive: script-src
//          'self' 'unsafe-inline'. Note that 'worker-src' was not explicitly set,
//          so 'script-src' is used as a fallback."
// Root cause: next.config.js CSP had no worker-src directive, and script-src did
//             not allow blob:. Sentry session replay (replayIntegration in
//             sentry.client.config.ts) bundles its compression logic as a
//             blob: Worker, so it was blocked on every load.
// Fix: add `worker-src 'self' blob:` and add `blob:` to `script-src`.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// We grep the raw config source instead of `require()`-ing it because
// next.config.js loads next-intl/plugin at module-init time, and that
// plugin requires a webpack-style env that vitest doesn't provide.
const cfg = readFileSync(resolve(__dirname, '../../next.config.js'), 'utf8')

function findDirectiveLine(name: string): string | undefined {
  return cfg.split('\n').find((l) => new RegExp(`\\b${name}\\b`).test(l))
}

describe('Content-Security-Policy header (next.config.js)', () => {
  it('declares an explicit worker-src directive (do not let it fall back to script-src)', () => {
    expect(findDirectiveLine('worker-src')).toBeTruthy()
  })

  it('allows blob: workers (Sentry replay, ReactFlow web workers)', () => {
    const line = findDirectiveLine('worker-src')
    expect(line, 'worker-src directive must exist').toBeTruthy()
    expect(line).toContain("'self'")
    expect(line).toContain('blob:')
  })

  it('allows blob: scripts (some libs ship code as blob: URLs)', () => {
    const line = findDirectiveLine('script-src')
    expect(line, 'script-src directive must exist').toBeTruthy()
    expect(line).toContain('blob:')
  })

  it('keeps the rest of the security baseline intact', () => {
    expect(cfg).toContain("default-src 'self'")
    expect(cfg).toContain("object-src 'none'")
    expect(cfg).toContain("frame-ancestors 'none'")
    expect(cfg).toContain("base-uri 'self'")
    expect(cfg).toContain("form-action 'self'")
  })
})
