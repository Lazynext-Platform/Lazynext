'use client'

import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
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
import { useUIStore } from '@/stores/ui.store'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'
import { canCreateNode } from '@/lib/utils/plan-gates'
import { trackBillingEvent } from '@/lib/utils/telemetry'
import { PLAN_LIMITS, type NodeType } from '@/lib/utils/constants'

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

const defaultNodes: Node[] = [
  {
    id: '1',
    type: 'task',
    position: { x: 100, y: 80 },
    data: {
      title: 'Ship onboarding v2',
      status: 'in_progress',
      assignee: 'AP',
      dueDate: 'Apr 10',
      priority: 'high',
    },
  },
  {
    id: '2',
    type: 'task',
    position: { x: 100, y: 280 },
    data: {
      title: 'Fix auth redirect bug',
      status: 'done',
      assignee: 'PK',
      priority: 'urgent',
    },
  },
  {
    id: '3',
    type: 'doc',
    position: { x: 420, y: 80 },
    data: {
      title: 'Product Requirements Doc',
      status: 'draft',
      updatedAt: '2h ago',
      wordCount: '1,240',
    },
  },
  {
    id: '4',
    type: 'decision',
    position: { x: 420, y: 280 },
    data: {
      title: 'Use Supabase for Auth + DB?',
      status: 'decided',
      qualityScore: 84,
      resolution: 'Supabase — unified Auth + PostgreSQL, RLS policies, real-time subscriptions, generous free tier.',
      rationale: 'Supabase provides auth, database, and storage in one platform. RLS policies give row-level security. Real-time subscriptions are built in.',
      options: ['Supabase', 'Firebase', 'PlanetScale'],
      decisionType: 'Irreversible',
      outcome: 'Pending',
    },
  },
  {
    id: '5',
    type: 'decision',
    position: { x: 740, y: 180 },
    data: {
      title: 'Pricing: freemium vs trial?',
      status: 'open',
      qualityScore: 62,
    },
  },
]

const defaultEdges: Edge[] = [
  { id: 'e1-3', source: '1', target: '3', animated: true },
  { id: 'e3-4', source: '3', target: '4' },
  { id: 'e4-5', source: '4', target: '5', style: { strokeDasharray: '6 6' } },
  { id: 'e2-4', source: '2', target: '4', animated: true },
]

export function WorkflowCanvas() {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const onNodesChange = useCanvasStore((s) => s.onNodesChange)
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange)
  const onConnect = useCanvasStore((s) => s.onConnect)
  const selectNode = useCanvasStore((s) => s.selectNode)
  const addNode = useCanvasStore((s) => s.addNode)
  const hydrateCanvas = useCanvasStore((s) => s.hydrateCanvas)
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId)
  const isNodePanelOpen = useCanvasStore((s) => s.isNodePanelOpen)

  const isMobile = useUIStore((s) => s.isMobile)
  const plan = (useWorkspaceStore((s) => s.workspace?.plan) || 'free') as Plan

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
        onConnect={onConnect}
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
          const id = `node-${Date.now()}`
          addNode({
            id,
            type,
            position: { x: pos.x - 200, y: pos.y - 100 },
            data: { title: `New ${type}`, status: type === 'task' ? 'todo' : undefined },
          })
        }}
      />

      {isNodePanelOpen && selectedNodeId && (
        <NodeDetailPanel nodeId={selectedNodeId} />
      )}

      <CollaborationOverlay collaborators={[]} isMobile={false} />
    </div>
  )
}
