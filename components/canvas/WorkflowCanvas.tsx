'use client'

import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCanvasStore } from '@/stores/canvas.store'
import { NodeListView } from './mobile/NodeListView'
import { TaskNode } from './nodes/TaskNode'
import { DocNode } from './nodes/DocNode'
import { DecisionNode } from './nodes/DecisionNode'
import { ThreadNode } from './nodes/ThreadNode'
import { PulseNode } from './nodes/PulseNode'
import { AutomationNode } from './nodes/AutomationNode'
import { TableNode } from './nodes/TableNode'
import { CanvasToolbar } from './panels/CanvasToolbar'
import { NodeDetailPanel } from './panels/NodeDetailPanel'
import { CanvasContextMenu } from './panels/CanvasContextMenu'
import { WorkflowEdge } from './edges/WorkflowEdge'
import CollaborationOverlay from './CollaborationOverlay'
import { useCollaboration } from '@/lib/realtime/use-collaboration'
import { useUIStore } from '@/stores/ui.store'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'
import { canCreateNode } from '@/lib/utils/plan-gates'
import { trackBillingEvent } from '@/lib/utils/telemetry'
import { PLAN_LIMITS, type NodeType } from '@/lib/utils/constants'
import { useCanvasHydration } from '@/lib/canvas/use-canvas-hydration'
import { useCanvasPositionPersist } from '@/lib/canvas/use-canvas-position-persist'
import { useCanvasDeletePersist } from '@/lib/canvas/use-canvas-delete-persist'
import { createNodeOnServer, createEdgeOnServer } from '@/lib/canvas/persist-helpers'

type Plan = keyof typeof PLAN_LIMITS

const nodeTypes = {
  task: TaskNode,
  doc: DocNode,
  decision: DecisionNode,
  thread: ThreadNode,
  pulse: PulseNode,
  automation: AutomationNode,
  table: TableNode,
}

const edgeTypes = {
  workflow: WorkflowEdge,
}

// Canvas hydrates from the workspace's default workflow on mount via
// `useCanvasHydration` — see `/api/v1/workflows/default`. Node position
// drags are persisted via debounced PATCH; node create/delete and edge
// create/delete still live only in-memory in this release (a follow-up
// will wire those, see roadmap). Until hydration completes the canvas
// renders the empty arrays below.
const defaultNodes: Node[] = []
const defaultEdges: Edge[] = []

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  )
}

function WorkflowCanvasInner() {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const onNodesChange = useCanvasStore((s) => s.onNodesChange)
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange)
  const selectNode = useCanvasStore((s) => s.selectNode)
  const hydrateCanvas = useCanvasStore((s) => s.hydrateCanvas)
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId)
  const isNodePanelOpen = useCanvasStore((s) => s.isNodePanelOpen)

  const isMobile = useUIStore((s) => s.isMobile)
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id ?? null)
  const plan = (useWorkspaceStore((s) => s.workspace?.plan) || 'free') as Plan

  const collaborators = useCollaboration({
    workspaceId,
    selectedNodeId,
    enabled: !isMobile,
  })

  useCanvasHydration(workspaceId)
  useCanvasPositionPersist()
  useCanvasDeletePersist()

  useEffect(() => {
    if (nodes.length === 0) {
      hydrateCanvas(defaultNodes, defaultEdges)
    }
  }, [hydrateCanvas, nodes.length])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id)
    },
    [selectNode]
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  // Override the store's bare onConnect: we need to POST to /api/v1/edges
  // and persist the server-issued UUID, otherwise edges drawn between
  // hydrated nodes evaporate on refresh. The helper falls back to a
  // client edge id when one endpoint is a scratchpad (non-UUID) node.
  const handleConnect = useCallback(
    (connection: { source: string | null; target: string | null }) => {
      if (!connection.source || !connection.target) return
      void createEdgeOnServer({ source: connection.source, target: connection.target })
    },
    [],
  )

  if (isMobile) {
    return <NodeListView />
  }

  return (
    <div className="relative h-[calc(100vh-48px)] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-slate-950"
        defaultEdgeOptions={{
          style: { stroke: '#475569', strokeWidth: 2 },
          type: 'workflow',
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1E293B" />
        <Controls
          className="!bg-slate-900 !border-slate-700 !rounded-lg [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-700"
        />
        <MiniMap
          className="!bg-slate-900 !border-slate-700 !rounded-lg"
          nodeColor="#334155"
          maskColor="rgba(2, 6, 23, 0.7)"
        />
      </ReactFlow>

      <CanvasToolbar />

      <CanvasContextMenu
        onCreateNode={(type: NodeType, pos) => {
          if (!canCreateNode(plan, nodes.length)) {
            trackBillingEvent('paywall.gate.shown', { variant: 'node-limit', plan, nodeCount: String(nodes.length), surface: 'context-menu' })
            useUpgradeModal.getState().show('node-limit')
            return
          }
          void createNodeOnServer({
            type,
            title: `New ${type}`,
            position: { x: pos.x - 200, y: pos.y - 100 },
            status: type === 'task' ? 'todo' : undefined,
          })
        }}
      />

      {isNodePanelOpen && selectedNodeId && (
        <NodeDetailPanel nodeId={selectedNodeId} />
      )}

      <CollaborationOverlay collaborators={collaborators} isMobile={false} />
    </div>
  )
}
