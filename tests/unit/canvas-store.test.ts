import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from '@/stores/canvas.store'
import type { Node, Edge } from '@xyflow/react'

const makeNode = (id: string, overrides?: Partial<Node>): Node => ({
  id,
  type: 'task',
  position: { x: 0, y: 0 },
  data: { label: `Node ${id}` },
  ...overrides,
})

const makeEdge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
})

describe('Canvas Store', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isLazyMindOpen: false,
      isNodePanelOpen: false,
      history: [],
      historyIndex: -1,
    })
  })

  it('adds a node and records history', () => {
    const node = makeNode('1')
    useCanvasStore.getState().addNode(node)

    const state = useCanvasStore.getState()
    expect(state.nodes).toHaveLength(1)
    expect(state.nodes[0].id).toBe('1')
    expect(state.history).toHaveLength(1)
    expect(state.historyIndex).toBe(0)
  })

  it('updates node data', () => {
    useCanvasStore.setState({ nodes: [makeNode('1')] })
    useCanvasStore.getState().updateNodeData('1', { label: 'Updated' })
    expect(useCanvasStore.getState().nodes[0].data.label).toBe('Updated')
  })

  it('removes node and connected edges', () => {
    useCanvasStore.setState({
      nodes: [makeNode('1'), makeNode('2'), makeNode('3')],
      edges: [makeEdge('e1', '1', '2'), makeEdge('e2', '2', '3')],
    })
    useCanvasStore.getState().removeNode('2')

    const state = useCanvasStore.getState()
    expect(state.nodes).toHaveLength(2)
    expect(state.edges).toHaveLength(0)
  })

  it('selects a node and opens panel', () => {
    useCanvasStore.getState().selectNode('1')
    const state = useCanvasStore.getState()
    expect(state.selectedNodeId).toBe('1')
    expect(state.isNodePanelOpen).toBe(true)
  })

  it('deselects node and closes panel', () => {
    useCanvasStore.getState().selectNode('1')
    useCanvasStore.getState().selectNode(null)
    const state = useCanvasStore.getState()
    expect(state.selectedNodeId).toBeNull()
    expect(state.isNodePanelOpen).toBe(false)
  })

  it('hydrates canvas with history', () => {
    const nodes = [makeNode('1')]
    const edges = [makeEdge('e1', '1', '2')]
    useCanvasStore.getState().hydrateCanvas(nodes, edges)

    const state = useCanvasStore.getState()
    expect(state.nodes).toEqual(nodes)
    expect(state.edges).toEqual(edges)
    expect(state.history).toHaveLength(1)
    expect(state.historyIndex).toBe(0)
  })

  it('undo/redo works', () => {
    const node1 = makeNode('1')
    const node2 = makeNode('2')

    useCanvasStore.getState().addNode(node1)
    useCanvasStore.getState().addNode(node2)
    expect(useCanvasStore.getState().nodes).toHaveLength(2)

    useCanvasStore.getState().undo()
    expect(useCanvasStore.getState().nodes).toHaveLength(1)

    useCanvasStore.getState().redo()
    expect(useCanvasStore.getState().nodes).toHaveLength(2)
  })

  it('undo at beginning is a no-op', () => {
    useCanvasStore.getState().undo()
    expect(useCanvasStore.getState().historyIndex).toBe(-1)
  })

  it('redo at end is a no-op', () => {
    useCanvasStore.getState().addNode(makeNode('1'))
    useCanvasStore.getState().redo()
    expect(useCanvasStore.getState().historyIndex).toBe(0)
  })

  it('toggles LazyMind', () => {
    useCanvasStore.getState().toggleLazyMind()
    expect(useCanvasStore.getState().isLazyMindOpen).toBe(true)
    useCanvasStore.getState().toggleLazyMind()
    expect(useCanvasStore.getState().isLazyMindOpen).toBe(false)
  })
})
