import { describe, it, expect, expectTypeOf } from 'vitest'
import type { paths, components, operations } from './types'
import type { Decision, WhoamiResponse } from './client'

// These are TYPE-LEVEL assertions. They run at compile time via tsc;
// the runtime body is just a sanity-checked literal so vitest counts
// the file. If this file ever fails to compile, the type contract has
// drifted and `npm run sdk:generate-types` needs to be re-run.

describe('generated SDK types', () => {
  it('exposes the OpenAPI top-level objects', () => {
    expectTypeOf<paths>().not.toBeNever()
    expectTypeOf<components>().not.toBeNever()
    expectTypeOf<operations>().not.toBeNever()
    expect(true).toBe(true)
  })

  it('paths covers the documented endpoints we ship', () => {
    // If any of these literal keys disappear from the OpenAPI spec,
    // this assertion will fail at compile time. That's the desired
    // behavior — drift surfaces immediately.
    type RequiredPaths = '/decisions' | '/decisions/{id}' | '/whoami'
    expectTypeOf<RequiredPaths>().toMatchTypeOf<keyof paths>()
    expect(true).toBe(true)
  })

  it('hand-typed Decision and WhoamiResponse keep their public shape', () => {
    // Smoke check that the curated surface didn't accidentally
    // change when types.ts was regenerated.
    expectTypeOf<Decision>().toHaveProperty('id')
    expectTypeOf<Decision>().toHaveProperty('quality_score')
    expectTypeOf<WhoamiResponse>().toHaveProperty('authType')
    expectTypeOf<WhoamiResponse>().toHaveProperty('scopes')
    expect(true).toBe(true)
  })
})
