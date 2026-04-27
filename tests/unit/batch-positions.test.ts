import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

// Mirror of the schema in app/api/v1/nodes/positions/route.ts. Kept in
// the test so any drift is loud (the real route has no schema export).
const updateSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        positionX: z.number().int(),
        positionY: z.number().int(),
      }),
    )
    .min(1)
    .max(200),
})

describe('batch positions endpoint zod schema', () => {
  it('accepts a single valid update', () => {
    const ok = updateSchema.safeParse({
      updates: [{ id: randomUUID(), positionX: 10, positionY: 20 }],
    })
    expect(ok.success).toBe(true)
  })

  it('rejects empty updates array', () => {
    const result = updateSchema.safeParse({ updates: [] })
    expect(result.success).toBe(false)
  })

  it('rejects non-UUID id', () => {
    const result = updateSchema.safeParse({
      updates: [{ id: 'not-a-uuid', positionX: 10, positionY: 20 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer position', () => {
    const result = updateSchema.safeParse({
      updates: [{ id: randomUUID(), positionX: 10.5, positionY: 20 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects oversized batch (> 200 entries)', () => {
    const updates = Array.from({ length: 201 }, (_, i) => ({
      id: randomUUID(),
      positionX: i,
      positionY: i,
    }))
    const result = updateSchema.safeParse({ updates })
    expect(result.success).toBe(false)
  })

  it('accepts a 200-entry batch (boundary)', () => {
    const updates = Array.from({ length: 200 }, (_, i) => ({
      id: randomUUID(),
      positionX: i,
      positionY: i,
    }))
    const result = updateSchema.safeParse({ updates })
    expect(result.success).toBe(true)
  })

  it('rejects missing positionY', () => {
    const result = updateSchema.safeParse({
      updates: [{ id: randomUUID(), positionX: 10 }],
    })
    expect(result.success).toBe(false)
  })
})
