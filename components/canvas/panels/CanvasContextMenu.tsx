'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Plus,
  Clipboard,
  Maximize2,
  Image,
  Pencil,
  Copy,
  Link,
  Repeat,
  Trash2,
  CheckSquare,
  FileText,
  GitBranch,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { NODE_COLORS, type NodeType } from '@/lib/utils/constants'

interface MenuPosition {
  x: number
  y: number
}

const createNodeItems = [
  { type: 'task' as NodeType, icon: CheckSquare, label: 'Task', shortcut: 'T' },
  { type: 'doc' as NodeType, icon: FileText, label: 'Doc', shortcut: 'D' },
  { type: 'decision' as NodeType, icon: GitBranch, label: 'Decision', shortcut: 'Q' },
  { type: 'thread' as NodeType, icon: MessageCircle, label: 'Thread', shortcut: 'H' },
]

export function CanvasContextMenu({
  onCreateNode,
}: {
  onCreateNode: (type: NodeType, position: { x: number; y: number }) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 })
  const [showCreateSub, setShowCreateSub] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = useCallback((e: MouseEvent) => {
    // Only handle if clicking on the canvas background
    const target = e.target as HTMLElement
    if (target.closest('.react-flow__node') || target.closest('.react-flow__controls')) return

    if (target.closest('.react-flow__pane') || target.closest('.react-flow__viewport')) {
      e.preventDefault()
      setPosition({ x: e.clientX, y: e.clientY })
      setIsOpen(true)
      setShowCreateSub(false)
    }
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setShowCreateSub(false)
  }, [])

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('click', handleClose)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('click', handleClose)
    }
  }, [handleContextMenu, handleClose])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-52 animate-scaleIn rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl"
      style={{ left: position.x, top: position.y }}
    >
      {/* Create Node */}
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowCreateSub(!showCreateSub) }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4 text-slate-400" />
          <span className="flex-1 text-left">Create node</span>
          <span className="text-[10px] text-slate-500">▸</span>
        </button>

        {showCreateSub && (
          <div className="absolute left-full top-0 ml-1 w-44 animate-scaleIn rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl">
            {createNodeItems.map((item) => {
              const colors = NODE_COLORS[item.type]
              return (
                <button
                  key={item.type}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateNode(item.type, position)
                    handleClose()
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <span className={cn('h-2 w-2 rounded-full', colors.dot)} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-[9px] text-slate-500">
                    {item.shortcut}
                  </kbd>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
        <Clipboard className="h-4 w-4 text-slate-400" />
        <span className="flex-1 text-left">Paste</span>
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-[9px] text-slate-500">⌘V</kbd>
      </button>

      <div className="my-1 h-px bg-slate-800" />

      <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
        <Maximize2 className="h-4 w-4 text-slate-400" />
        <span className="flex-1 text-left">Fit to view</span>
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-[9px] text-slate-500">⌘1</kbd>
      </button>

      <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
        <Image className="h-4 w-4 text-slate-400" />
        <span className="flex-1 text-left">Export PNG</span>
      </button>
    </div>
  )
}

export function NodeContextMenu({
  nodeId,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  nodeId: string
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  return (
    <div className="w-52 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl animate-scaleIn">
      <button onClick={onEdit} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
        <Pencil className="h-4 w-4 text-slate-400" />
        <span className="flex-1 text-left">Edit</span>
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-[9px] text-slate-500">E</kbd>
      </button>
      <button onClick={onDuplicate} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
        <Copy className="h-4 w-4 text-slate-400" />
        <span className="flex-1 text-left">Duplicate</span>
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-[9px] text-slate-500">⌘D</kbd>
      </button>
      <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
        <Link className="h-4 w-4 text-slate-400" />
        <span className="flex-1 text-left">Connect to…</span>
      </button>
      <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
        <Repeat className="h-4 w-4 text-slate-400" />
        <span className="flex-1 text-left">Change type</span>
      </button>

      <div className="my-1 h-px bg-slate-800" />

      <button onClick={onDelete} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
        <Trash2 className="h-4 w-4" />
        <span className="flex-1 text-left">Delete</span>
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-[9px] text-red-400">⌫</kbd>
      </button>
    </div>
  )
}
