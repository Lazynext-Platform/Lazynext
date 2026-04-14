'use client'

import { useState, useCallback } from 'react'
import { Filter, ArrowUpDown, Layers, EyeOff, Download, Plus, GripVertical, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Column {
  id: string
  label: string
  type: 'text' | 'status' | 'priority' | 'person' | 'date' | 'number'
  width: number
}

interface Row {
  id: string
  cells: Record<string, string>
}

const defaultColumns: Column[] = [
  { id: 'name', label: 'Name', type: 'text', width: 180 },
  { id: 'status', label: 'Status', type: 'status', width: 110 },
  { id: 'priority', label: 'Priority', type: 'priority', width: 100 },
  { id: 'assignee', label: 'Assignee', type: 'person', width: 120 },
  { id: 'due', label: 'Due Date', type: 'date', width: 110 },
  { id: 'effort', label: 'Effort', type: 'number', width: 80 },
  { id: 'tags', label: 'Tags', type: 'text', width: 120 },
  { id: 'notes', label: 'Notes', type: 'text', width: 160 },
]

const defaultRows: Row[] = [
  { id: '1', cells: { name: 'Setup auth provider', status: 'Done', priority: 'High', assignee: 'Avas', due: 'Apr 2', effort: '3', tags: 'auth', notes: 'Supabase Auth integration done' } },
  { id: '2', cells: { name: 'Design canvas nodes', status: 'In Progress', priority: 'High', assignee: 'Priya', due: 'Apr 5', effort: '5', tags: 'design, canvas', notes: '' } },
  { id: '3', cells: { name: 'Build API routes', status: 'In Progress', priority: 'Medium', assignee: 'Rahul', due: 'Apr 7', effort: '8', tags: 'api', notes: 'REST + tRPC' } },
  { id: '4', cells: { name: 'Write unit tests', status: 'Todo', priority: 'Medium', assignee: 'Sana', due: 'Apr 10', effort: '4', tags: 'testing', notes: '' } },
  { id: '5', cells: { name: 'Deploy staging', status: 'Todo', priority: 'Low', assignee: 'Avas', due: 'Apr 12', effort: '2', tags: 'devops', notes: 'Vercel preview' } },
]

const statusColors: Record<string, string> = {
  'Done': 'bg-emerald-500/20 text-emerald-400',
  'In Progress': 'bg-blue-500/20 text-blue-400',
  'Todo': 'bg-slate-500/20 text-slate-400',
  'Blocked': 'bg-red-500/20 text-red-400',
}

const priorityColors: Record<string, string> = {
  'High': 'bg-red-500/20 text-red-400',
  'Medium': 'bg-amber-500/20 text-amber-400',
  'Low': 'bg-slate-500/20 text-slate-400',
}

interface TablePanelProps {
  onClose?: () => void
}

export default function TablePanel({ onClose }: TablePanelProps) {
  const [columns] = useState(defaultColumns)
  const [rows, setRows] = useState(defaultRows)

  const updateCell = useCallback((rowId: string, colId: string, value: string) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r))
  }, [])

  const totalEffort = rows.reduce((sum, r) => sum + (parseInt(r.cells.effort) || 0), 0)
  const doneCount = rows.filter(r => r.cells.status === 'Done').length

  return (
    <div className="flex h-full flex-col rounded-xl border-2 border-teal-500/30 bg-slate-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-teal-800/30 bg-teal-900/10 px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm font-semibold text-teal-300">Sprint Tasks</span>
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs text-slate-400 hover:bg-slate-800"><Filter className="h-3 w-3" /> Filter</button>
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs text-slate-400 hover:bg-slate-800"><ArrowUpDown className="h-3 w-3" /> Sort</button>
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs text-slate-400 hover:bg-slate-800"><Layers className="h-3 w-3" /> Group</button>
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs text-slate-400 hover:bg-slate-800"><EyeOff className="h-3 w-3" /> Hide</button>
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs text-slate-400 hover:bg-slate-800"><Download className="h-3 w-3" /> Export</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-slate-500">{rows.length} rows</span>
          {onClose && <button onClick={onClose} aria-label="Close table panel" className="rounded-md p-1 text-slate-400 hover:bg-slate-800"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm" aria-label="Table node data">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800/80 text-2xs font-medium uppercase tracking-wider text-slate-500">
              <th scope="col" className="w-8 px-2 py-2"><GripVertical className="h-3 w-3 text-slate-700" /></th>
              {columns.map(col => (
                <th key={col.id} scope="col" className="px-3 py-2 text-left whitespace-nowrap cursor-col-resize" style={{ minWidth: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="px-2 py-2 text-center"><GripVertical className="h-3 w-3 text-slate-700 cursor-grab" /></td>
                {columns.map(col => {
                  const val = row.cells[col.id] || ''
                  if (col.type === 'status') {
                    return (
                      <td key={col.id} className="px-3 py-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-2xs font-medium', statusColors[val] || 'bg-slate-700 text-slate-300')}>{val}</span>
                      </td>
                    )
                  }
                  if (col.type === 'priority') {
                    return (
                      <td key={col.id} className="px-3 py-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-2xs font-medium', priorityColors[val] || 'bg-slate-700 text-slate-300')}>{val}</span>
                      </td>
                    )
                  }
                  if (col.type === 'person') {
                    return (
                      <td key={col.id} className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-4xs font-bold text-white">
                            {val.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-slate-300">{val}</span>
                        </div>
                      </td>
                    )
                  }
                  return (
                    <td key={col.id} className="px-3 py-2">
                      <span contentEditable suppressContentEditableWarning
                        onBlur={e => updateCell(row.id, col.id, e.currentTarget.textContent || '')}
                        className="block rounded px-1 py-0.5 text-slate-300 outline-none focus:bg-slate-800 focus:ring-1 focus:ring-teal-500/50 min-w-[20px]">
                        {val}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0">
            <tr className="bg-slate-800/80 border-t border-teal-800/30">
              <td className="px-2 py-2" />
              <td className="px-3 py-2 text-xs font-medium text-teal-400">Total: {rows.length} items</td>
              <td className="px-3 py-2 text-xs text-slate-500">{doneCount}/{rows.length} done</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2" />
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-xs font-medium text-teal-400">{totalEffort}pts</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add row */}
      <button className="flex w-full items-center gap-1.5 border-t border-slate-800 px-4 py-2 text-xs text-slate-500 hover:bg-slate-800/50 hover:text-slate-300">
        <Plus className="h-3 w-3" /> Add row
      </button>
    </div>
  )
}
