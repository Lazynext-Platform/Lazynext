'use client'

import { cn } from '@/lib/utils/cn'

interface Collaborator {
  id: string
  name: string
  color: string
  cursor?: { x: number; y: number }
  selectedNodeId?: string
  isTyping?: boolean
}

interface CollaborationOverlayProps {
  collaborators: Collaborator[]
  isMobile?: boolean
}

const colorMap: Record<string, { bg: string; text: string; ring: string; cursor: string }> = {
  red: { bg: 'bg-red-500', text: 'text-red-100', ring: 'ring-red-500/50', cursor: '#ef4444' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-100', ring: 'ring-blue-500/50', cursor: '#3b82f6' },
  green: { bg: 'bg-emerald-500', text: 'text-emerald-100', ring: 'ring-emerald-500/50', cursor: '#10b981' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-100', ring: 'ring-purple-500/50', cursor: '#a855f7' },
  pink: { bg: 'bg-pink-500', text: 'text-pink-100', ring: 'ring-pink-500/50', cursor: '#ec4899' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-100', ring: 'ring-amber-500/50', cursor: '#f59e0b' },
}

function CursorArrow({ color }: { color: string }) {
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
      <path d="M1 1L6 18L8.5 10.5L15 8L1 1Z" fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function TypingIndicator({ color }: { color: string }) {
  return (
    <div className={cn('flex items-center gap-0.5 rounded-full px-2 py-1', color)}>
      <div className="h-1.5 w-1.5 rounded-full bg-white/80 animate-bounce [animation-delay:0ms]" />
      <div className="h-1.5 w-1.5 rounded-full bg-white/80 animate-bounce [animation-delay:150ms]" />
      <div className="h-1.5 w-1.5 rounded-full bg-white/80 animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

export default function CollaborationOverlay({ collaborators, isMobile = false }: CollaborationOverlayProps) {
  // No cursors on mobile
  if (isMobile) return null

  const activeCollaborators = collaborators.filter(c => c.cursor || c.selectedNodeId)

  return (
    <>
      {/* Cursor overlays */}
      {activeCollaborators.map(collab => {
        const colors = colorMap[collab.color] || colorMap.blue
        return (
          <div key={collab.id}>
            {/* Cursor with name pill */}
            {collab.cursor && (
              <div className="pointer-events-none absolute z-50 transition-all duration-75"
                style={{ left: collab.cursor.x, top: collab.cursor.y }}>
                <CursorArrow color={colors.cursor} />
                <div className={cn('ml-3 -mt-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium shadow-lg whitespace-nowrap', colors.bg, colors.text)}>
                  {collab.name}
                  {collab.isTyping && <TypingIndicator color={colors.bg + '/30'} />}
                </div>
              </div>
            )}

            {/* Node selection ring */}
            {collab.selectedNodeId && (
              <div className={cn('pointer-events-none absolute inset-0 rounded-xl ring-2 motion-safe:animate-pulse', colors.ring)}
                data-node-id={collab.selectedNodeId} />
            )}
          </div>
        )
      })}

      {/* Presence counter (top bar integration) */}
      <div className="fixed top-3 right-20 z-40 flex items-center -space-x-1.5">
        {collaborators.slice(0, 4).map(collab => {
          const colors = colorMap[collab.color] || colorMap.blue
          return (
            <div key={collab.id}
              className={cn('flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 text-3xs font-bold text-white', colors.bg)}
              title={collab.name}>
              {collab.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )
        })}
        {collaborators.length > 4 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-700 text-3xs font-bold text-slate-300">
            +{collaborators.length - 4}
          </div>
        )}
      </div>
    </>
  )
}
