import { NextResponse } from 'next/server'
import { buildOpenApiSpec } from '@/lib/utils/openapi'

// GET /api/v1/openapi.json — OpenAPI 3.1 spec for the public REST surface.
//
// This is the machine-readable counterpart to /docs/api. It is hand-written
// (not generated from runtime introspection) for two reasons:
//   1. Next.js route handlers don't expose a schema worth introspecting.
//   2. Hand-written specs stay honest — they document what we actually
//      promise, not whatever a generator decides to expose.
//
// The spec is public (no auth) so SDK generators, Postman, and IDE
// plugins can fetch it. It is cached at the edge for 5 minutes — long
// enough to absorb a burst, short enough that a deploy is reflected
// almost immediately.

export const runtime = 'nodejs'
export const dynamic = 'force-static'

export async function GET() {
  const spec = buildOpenApiSpec()
  return NextResponse.json(spec, {
    headers: {
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}
