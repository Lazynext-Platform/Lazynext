import { describe, it, expect } from 'vitest'
import { TEMPLATE_CATALOG, TEMPLATE_CATEGORY_LABELS, getTemplate } from '@/lib/data/template-catalog'

describe('template catalog', () => {
  it('every template has at least one node and a label for its category', () => {
    expect(TEMPLATE_CATALOG.length).toBeGreaterThan(0)
    for (const t of TEMPLATE_CATALOG) {
      expect(t.nodes.length).toBeGreaterThan(0)
      expect(TEMPLATE_CATEGORY_LABELS[t.category]).toBeDefined()
      expect(t.id).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('every edge points at a valid seed-node id', () => {
    for (const t of TEMPLATE_CATALOG) {
      const ids = new Set(t.nodes.map((n) => n.id))
      for (const e of t.edges) {
        expect(ids.has(e.source), `${t.id}: edge source "${e.source}"`).toBe(true)
        expect(ids.has(e.target), `${t.id}: edge target "${e.target}"`).toBe(true)
      }
    }
  })

  it('template ids are unique', () => {
    const ids = TEMPLATE_CATALOG.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('getTemplate returns the matching definition or undefined', () => {
    const first = TEMPLATE_CATALOG[0]
    expect(getTemplate(first.id)?.id).toBe(first.id)
    expect(getTemplate('does-not-exist')).toBeUndefined()
  })
})
