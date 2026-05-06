import { describe, it, expect } from 'vitest'
import { layoutTopDown } from '@/lib/canvas/auto-layout'

describe('layoutTopDown', () => {
  it('lays out a single chain n1→n2→n3 in three layers', () => {
    const nodes = [{ tempId: 'n1' }, { tempId: 'n2' }, { tempId: 'n3' }]
    const edges = [
      { source: 'n1', target: 'n2' },
      { source: 'n2', target: 'n3' },
    ]
    const { positions, layers } = layoutTopDown(nodes, edges)
    expect(layers).toBe(3)
    expect(positions.get('n1')!.y).toBeLessThan(positions.get('n2')!.y)
    expect(positions.get('n2')!.y).toBeLessThan(positions.get('n3')!.y)
  })

  it('places siblings horizontally on the same y', () => {
    const nodes = [{ tempId: 'n1' }, { tempId: 'n2' }, { tempId: 'n3' }]
    const edges = [
      { source: 'n1', target: 'n2' },
      { source: 'n1', target: 'n3' },
    ]
    const { positions } = layoutTopDown(nodes, edges)
    expect(positions.get('n2')!.y).toBe(positions.get('n3')!.y)
    expect(positions.get('n2')!.x).not.toBe(positions.get('n3')!.x)
  })

  it('survives a self-cycle without infinite loop', () => {
    const nodes = [{ tempId: 'n1' }, { tempId: 'n2' }]
    // Pure cycle: n1↔n2. No root by parent-rule; layout picks n1.
    const edges = [
      { source: 'n1', target: 'n2' },
      { source: 'n2', target: 'n1' },
    ]
    const { positions } = layoutTopDown(nodes, edges)
    expect(positions.size).toBe(2)
    expect(positions.has('n1')).toBe(true)
    expect(positions.has('n2')).toBe(true)
  })

  it('places isolated nodes at layer 0', () => {
    const nodes = [{ tempId: 'n1' }, { tempId: 'n2' }]
    const edges: Array<{ source: string; target: string }> = []
    const { positions } = layoutTopDown(nodes, edges)
    // Both have no inbound edge → both are roots → both at y=0.
    expect(positions.get('n1')!.y).toBe(positions.get('n2')!.y)
  })

  it('translates by origin', () => {
    const nodes = [{ tempId: 'n1' }]
    const { positions } = layoutTopDown(nodes, [], { x: 1000, y: 500 })
    expect(positions.get('n1')).toEqual({ x: 1000, y: 500 })
  })
})
