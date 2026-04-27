'use client'

import { useMemo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TaskNode } from '@/components/canvas/nodes/TaskNode'
import { DocNode } from '@/components/canvas/nodes/DocNode'
import { DecisionNode } from '@/components/canvas/nodes/DecisionNode'
import { ThreadNode } from '@/components/canvas/nodes/ThreadNode'
import { PulseNode } from '@/components/canvas/nodes/PulseNode'
import { AutomationNode } from '@/components/canvas/nodes/AutomationNode'
import { TableNode } from '@/components/canvas/nodes/TableNode'
import { WorkflowEdge } from '@/components/canvas/edges/WorkflowEdge'
import type { SharedCanvasNode, SharedCanvasEdge } from '@/lib/data/shared-canvas'

const nodeTypes = {
  task: TaskNode,
  doc: DocNode,
  decision: DecisionNode,
  thread: ThreadNode,
  pulse: PulseNode,
  automation: AutomationNode,
  table: TableNode,
}

const edgeTypes = { workflow: WorkflowEdge }

interface SharedCanvasViewerProps {
  nodes: SharedCanvasNode[]
  edges: SharedCanvasEdge[]
}

export function SharedCanvasViewer({ nodes, edges }: SharedCanvasViewerProps) {
  const flowNodes = useMemo<Node[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: { x: n.position_x, y: n.position_y },
        data: { ...n.data, title: n.title, status: n.status ?? undefined },
        draggable: false,
        selectable: false,
        connectable: false,
      })),
    [nodes],
  )

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source_id,
        target: e.target_id,
        type: 'workflow',
      })),
    [edges],
  )

  return (
    <ReactFlowProvider>
      <div className="h-[calc(100vh-72px)] w-full">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          className="bg-slate-950"
          defaultEdgeOptions={{
            style: { stroke: '#475569', strokeWidth: 2 },
            type: 'workflow',
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1E293B" />
          <Controls
            showInteractive={false}
            className="!bg-slate-900 !border-slate-700 !rounded-lg [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-700"
          />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  )
}
