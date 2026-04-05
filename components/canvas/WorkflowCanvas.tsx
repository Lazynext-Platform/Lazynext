'use client'

import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCanvasStore } from '@/stores/canvas.store'
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
import { useUIStore } from '@/stores/ui.store'
import type { NodeType } from '@/lib/utils/constants'

const nodeTypes = {
  task: TaskNode,
  doc: DocNode,
  decision: DecisionNode,
  thread: ThreadNode,
  pulse: PulseNode,
  automation: AutomationNode,
  table: TableNode,
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
      title: 'Use Neon vs Supabase for DB?',
      status: 'decided',
      qualityScore: 84,
      resolution: 'Neon — serverless Postgres, scales to zero, DB branching per PR, India region available.',
      rationale: 'Supabase Auth was appealing but Clerk handles auth better. Neon\'s serverless model means zero cost at rest.',
      options: ['Neon', 'Supabase', 'PlanetScale'],
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
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    addNode,
    hydrateCanvas,
    selectedNodeId,
    isNodePanelOpen,
  } = useCanvasStore()

  const { isMobile } = useUIStore()

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
    return (
      <div className="px-4 py-6">
        <h2 className="text-lg font-semibold text-slate-50">Workflow Nodes</h2>
        <p className="mt-1 text-sm text-slate-400">Canvas view is available on larger screens.</p>
        <div className="mt-4 space-y-2">
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => selectNode(node.id)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 p-4 text-left hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium uppercase text-slate-500">{node.type}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-200">{(node.data as Record<string, string>).title}</p>
            </button>
          ))}
        </div>
      </div>
    )
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
        fitView
        className="bg-slate-950"
        defaultEdgeOptions={{
          style: { stroke: '#475569', strokeWidth: 2 },
          type: 'smoothstep',
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
    </div>
  )
}
