import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => {
  const eq = vi.fn()
  const maybeSingle = vi.fn()
  const upsert = vi.fn(() => ({ then: (a: () => void) => { a(); return Promise.resolve() } }))
  const select = vi.fn()
  const fromMock = vi.fn()

  return {
    db: {
      from: fromMock,
    },
    hasValidDatabaseUrl: true,
    __mocks: { eq, maybeSingle, upsert, select, fromMock },
  }
})

import { checkAiQuota, getDailyAiUsage, recordAiUsage, getWorkspacePlan } from '@/lib/data/ai-usage'
import * as dbModule from '@/lib/db/client'

type Mocks = {
  eq: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  fromMock: ReturnType<typeof vi.fn>
}
const m = (dbModule as unknown as { __mocks: Mocks }).__mocks

function chainSelect(returnValue: unknown) {
  // Build a chainable: from('x').select('y').eq().eq().eq().maybeSingle()
  const finalMaybeSingle = vi.fn(() => Promise.resolve(returnValue))
  const eq3 = { maybeSingle: finalMaybeSingle }
  const eq2 = { eq: vi.fn(() => eq3) }
  const eq1 = { eq: vi.fn(() => eq2), maybeSingle: finalMaybeSingle }
  const sel = { eq: vi.fn(() => eq1), maybeSingle: finalMaybeSingle }
  m.fromMock.mockReturnValueOnce({ select: vi.fn(() => sel), upsert: m.upsert })
  return finalMaybeSingle
}

describe('ai-usage helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDailyAiUsage', () => {
    it('returns 0 when no row exists for today', async () => {
      chainSelect({ data: null })
      const used = await getDailyAiUsage('user-1', 'ws-1')
      expect(used).toBe(0)
    })

    it('returns the stored count when a row exists', async () => {
      chainSelect({ data: { count: 7 } })
      const used = await getDailyAiUsage('user-1', 'ws-1')
      expect(used).toBe(7)
    })
  })

  describe('getWorkspacePlan', () => {
    it("falls back to 'free' when the workspace row is missing", async () => {
      chainSelect({ data: null })
      const plan = await getWorkspacePlan('ws-1')
      expect(plan).toBe('free')
    })

    it('returns the plan from the row', async () => {
      chainSelect({ data: { plan: 'pro' } })
      const plan = await getWorkspacePlan('ws-1')
      expect(plan).toBe('pro')
    })
  })

  describe('checkAiQuota', () => {
    it('Free at 20 used returns allowed=false', async () => {
      // First call: getWorkspacePlan -> { plan: 'free' }
      chainSelect({ data: { plan: 'free' } })
      // Second call: getDailyAiUsage -> { count: 20 }
      chainSelect({ data: { count: 20 } })
      const q = await checkAiQuota('user-1', 'ws-1')
      expect(q.plan).toBe('free')
      expect(q.used).toBe(20)
      expect(q.limit).toBe(20)
      expect(q.allowed).toBe(false)
    })

    it('Free at 5 used returns allowed=true', async () => {
      chainSelect({ data: { plan: 'free' } })
      chainSelect({ data: { count: 5 } })
      const q = await checkAiQuota('user-1', 'ws-1')
      expect(q.allowed).toBe(true)
    })

    it('Business is unlimited regardless of usage', async () => {
      chainSelect({ data: { plan: 'business' } })
      chainSelect({ data: { count: 999_999 } })
      const q = await checkAiQuota('user-1', 'ws-1')
      expect(q.limit).toBe(-1)
      expect(q.allowed).toBe(true)
    })
  })

  describe('recordAiUsage', () => {
    it('upserts an incremented row and never throws', async () => {
      // First call: select existing row
      chainSelect({ data: { count: 3 } })
      // Second call: upsert
      m.fromMock.mockReturnValueOnce({ upsert: m.upsert })
      await expect(recordAiUsage('user-1', 'ws-1')).resolves.toBeUndefined()
      expect(m.upsert).toHaveBeenCalled()
    })
  })
})
