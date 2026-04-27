'use client'

import { create } from 'zustand'
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react'

interface CanvasState {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  isLazyMindOpen: boolean
  isNodePanelOpen: boolean
  history: { nodes: Node[]; edges: Edge[] }[]
  historyIndex: number

  // Server context. Set by `WorkflowCanvas` once the active workflow has
  // been resolved from `/api/v1/workflows/default`. Until both ids are
  // populated, the canvas is a per-session scratchpad — every callsite
  // that wants to persist must check `currentWorkflowId` is non-null.
  currentWorkflowId: string | null
  currentWorkflowName: string | null
  currentWorkspaceId: string | null
  isHydrated: boolean

  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  addNode: (node: Node) => void
  updateNodeData: (id: string, data: Record<string, unknown>) => void
  removeNode: (id: string) => void
  selectNode: (id: string | null) => void
  hydrateCanvas: (nodes: Node[], edges: Edge[]) => void
  setWorkflowContext: (ctx: {
    workflowId: string
    workflowName: string
    workspaceId: string
  }) => void
  setHydrated: (hydrated: boolean) => void
  undo: () => void
  redo: () => void
  toggleLazyMind: () => void
  toggleNodePanel: () => void
}

const MAX_HISTORY = 50

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isLazyMindOpen: false,
  isNodePanelOpen: false,
  history: [],
  historyIndex: -1,

  currentWorkflowId: null,
  currentWorkflowName: null,
  currentWorkspaceId: null,
  isHydrated: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) })
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) })
  },

  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) })
  },

  addNode: (node) => {
    const { nodes, edges, history, historyIndex } = get()
    const newNodes = [...nodes, node]
    const newHistory = [...history.slice(0, historyIndex + 1), { nodes: newNodes, edges }].slice(-MAX_HISTORY)
    set({
      nodes: newNodes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },

  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })
  },

  removeNode: (id) => {
    const newNodes = get().nodes.filter((n) => n.id !== id)
    const newEdges = get().edges.filter((e) => e.source !== id && e.target !== id)
    set({ nodes: newNodes, edges: newEdges })
  },

  selectNode: (id) => {
    set({ selectedNodeId: id, isNodePanelOpen: !!id })
  },

  hydrateCanvas: (nodes, edges) => {
    set({ nodes, edges, history: [{ nodes, edges }], historyIndex: 0 })
  },

  setWorkflowContext: ({ workflowId, workflowName, workspaceId }) =>
    set({
      currentWorkflowId: workflowId,
      currentWorkflowName: workflowName,
      currentWorkspaceId: workspaceId,
    }),

  setHydrated: (hydrated) => set({ isHydrated: hydrated }),

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1]
      set({ nodes: prev.nodes, edges: prev.edges, historyIndex: historyIndex - 1 })
    }
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1]
      set({ nodes: next.nodes, edges: next.edges, historyIndex: historyIndex + 1 })
    }
  },

  toggleLazyMind: () => set((s) => ({ isLazyMindOpen: !s.isLazyMindOpen })),
  toggleNodePanel: () => set((s) => ({ isNodePanelOpen: !s.isNodePanelOpen })),
}))
