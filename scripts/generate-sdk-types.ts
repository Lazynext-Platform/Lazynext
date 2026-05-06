#!/usr/bin/env tsx
/**
 * Generate TypeScript types from the public-API OpenAPI spec.
 *
 * Reads the spec directly from `buildOpenApiSpec()` (no server
 * roundtrip — keeps the script offline-runnable in CI), pipes it
 * through `openapi-typescript`, and writes:
 *
 *   packages/sdk/src/types.ts
 *
 * The hand-typed `client.ts` is intentionally NOT touched. Generated
 * types augment the SDK; they don't replace the curated public
 * surface. Consumers can import either:
 *
 *   import type { Decision } from '@lazynext/sdk'           // hand-typed
 *   import type { paths, components } from '@lazynext/sdk/types'
 *
 * Re-run after any change to `lib/utils/openapi.ts`. CI runs this
 * in --check mode (planned follow-up) so spec drift fails the build.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import openapiTS, { astToString } from 'openapi-typescript'
import { buildOpenApiSpec } from '../lib/utils/openapi'

async function main(): Promise<void> {
  const checkMode = process.argv.includes('--check')
  const spec = buildOpenApiSpec()

  // openapi-typescript v7 accepts the spec as a JS object or a URL.
  // Cast to `unknown` first then to the package's expected document
  // shape — buildOpenApiSpec is typed to our local OpenApiSpec
  // interface, which is structurally compatible but not nominally.
  const ast = await openapiTS(spec as unknown as Parameters<typeof openapiTS>[0])
  const generated = astToString(ast)

  const banner = [
    '/**',
    ' * AUTO-GENERATED. Do not edit by hand.',
    ' *',
    ' * Regenerate with: `npm run sdk:generate-types`',
    ' *',
    ' * Source: lib/utils/openapi.ts → buildOpenApiSpec()',
    ' * Generator: openapi-typescript',
    ' */',
    '',
    '/* eslint-disable */',
    '',
  ].join('\n')

  const out = resolve(__dirname, '..', 'packages/sdk/src/types.ts')
  const fresh = banner + generated

  if (checkMode) {
    // CI path. Fail the build if the committed file would drift on
    // regeneration. This makes the OpenAPI spec the single source of
    // truth: change `lib/utils/openapi.ts` → run codegen → commit.
    const onDisk = existsSync(out) ? readFileSync(out, 'utf-8') : ''
    if (onDisk !== fresh) {
      // eslint-disable-next-line no-console
      console.error(
        '✖ packages/sdk/src/types.ts is out of date.\n' +
          '  Run `npm run sdk:generate-types` and commit the result.',
      )
      process.exit(1)
    }
    // eslint-disable-next-line no-console
    console.log('✓ packages/sdk/src/types.ts is up to date.')
    return
  }

  writeFileSync(out, fresh)
  // eslint-disable-next-line no-console
  console.log(`Wrote ${out} (${generated.length} chars)`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
