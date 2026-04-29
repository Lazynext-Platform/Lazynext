'use client'

// Scalar requires a client component — it mounts an interactive
// OpenAPI explorer that reads the runtime spec.
//
// We point it at the live `/api/v1/openapi.json` URL (not an
// inlined object) so:
//   - The same Scalar render is used in dev, staging, and prod —
//     no special-case bundling.
//   - The Edge cache (s-maxage=300) cuts down on repeated fetches.
//   - Spec drift fixes propagate without a frontend deploy.
//
// The Lazynext theme picks slate text + indigo accent to match
// the rest of /docs/api/* without overriding Scalar's internal CSS.

import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'

export function ApiReferenceClient() {
  return (
    <ApiReferenceReact
      configuration={{
        // Same-origin URL; works in dev, staging, prod.
        url: '/api/v1/openapi.json',
        // Hide Scalar's "powered by" footer — we credit them in
        // /docs/api/changelog under the Tooling section instead.
        hideClientButton: false,
        // Match site palette without overriding component-level CSS.
        theme: 'default',
        // Sidebar takes screen space we'd rather give to the body
        // on narrow viewports. Layout still responsive.
        layout: 'modern',
        defaultHttpClient: {
          targetKey: 'shell',
          clientKey: 'curl',
        },
      }}
    />
  )
}
