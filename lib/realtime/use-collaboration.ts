'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/db/supabase/client'

export interface PresentCollaborator {
  id: string
  name: string
  color: string
  cursor?: { x: number; y: number } // SCREEN coords, ready to render
  selectedNodeId?: string
  isTyping?: boolean
}

interface PresencePayload {
  user_id: string
  name: string
  color: string
  flow_x: number | null
  flow_y: number | null
  selected_node_id: string | null
  is_typing: boolean
}

const COLORS = ['red', 'blue', 'green', 'purple', 'pink', 'amber'] as const

function colorFor(userId: string): string {
  let h = 0
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) - h + userId.charCodeAt(i)) | 0
  }
  return COLORS[Math.abs(h) % COLORS.length]
}

interface UseCollaborationArgs {
  workspaceId: string | null
  selectedNodeId: string | null
  isTyping?: boolean
  enabled?: boolean
}

/**
 * Wires Supabase Realtime presence for the canvas. Each client tracks its own
 * cursor (in flow coordinates so it survives pan/zoom mismatch) plus selected
 * node id, and receives the same from every other member of the workspace
 * channel. Returns the *other* collaborators with their cursors already
 * projected back into screen coordinates for direct rendering.
 *
 * The hook MUST be mounted inside a `<ReactFlow>` (ReactFlowProvider) subtree
 * so `useReactFlow` is available.
 */
export function useCollaboration({
  workspaceId,
  selectedNodeId,
  isTyping = false,
  enabled = true,
}: UseCollaborationArgs): PresentCollaborator[] {
  const rf = useReactFlow()
  const [me, setMe] = useState<{ id: string; name: string } | null>(null)
  const [peers, setPeers] = useState<Map<string, PresencePayload>>(new Map())
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastBroadcastRef = useRef(0)
  const flowCursorRef = useRef<{ x: number; y: number } | null>(null)
  const supabase = useMemo(() => createClient(), [])

  // Fetch current user once.
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>
      const name =
        (typeof meta.full_name === 'string' && meta.full_name) ||
        (typeof meta.name === 'string' && meta.name) ||
        data.user.email?.split('@')[0] ||
        'Member'
      setMe({ id: data.user.id, name })
    })
    return () => {
      cancelled = true
    }
  }, [enabled, supabase])

  // Subscribe to the workspace presence channel.
  useEffect(() => {
    if (!enabled || !workspaceId || !me) return

    const channel = supabase.channel(`presence:workspace:${workspaceId}`, {
      config: { presence: { key: me.id } },
    })
    channelRef.current = channel

    const flush = () => {
      const next = new Map<string, PresencePayload>()
      const state = channel.presenceState<PresencePayload>()
      for (const [key, metas] of Object.entries(state)) {
        if (key === me.id) continue
        const meta = metas[metas.length - 1]
        if (meta) next.set(key, meta)
      }
      setPeers(next)
    }

    channel
      .on('presence', { event: 'sync' }, flush)
      .on('presence', { event: 'join' }, flush)
      .on('presence', { event: 'leave' }, flush)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({
            user_id: me.id,
            name: me.name,
            color: colorFor(me.id),
            flow_x: null,
            flow_y: null,
            selected_node_id: selectedNodeId,
            is_typing: isTyping,
          } satisfies PresencePayload)
        }
      })

    return () => {
      channel.untrack().catch(() => undefined)
      supabase.removeChannel(channel).catch(() => undefined)
      channelRef.current = null
    }
    // selectedNodeId/isTyping are pushed via the second effect so we don't
    // resubscribe on every selection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, workspaceId, me, supabase])

  // Re-track when selection or typing flips. (Throttled cursor updates flow
  // through the mousemove handler below.)
  useEffect(() => {
    if (!channelRef.current || !me) return
    const cur = flowCursorRef.current
    channelRef.current
      .track({
        user_id: me.id,
        name: me.name,
        color: colorFor(me.id),
        flow_x: cur?.x ?? null,
        flow_y: cur?.y ?? null,
        selected_node_id: selectedNodeId,
        is_typing: isTyping,
      } satisfies PresencePayload)
      .catch(() => undefined)
  }, [selectedNodeId, isTyping, me])

  // Mousemove → throttle to ~30Hz → broadcast flow coords.
  useEffect(() => {
    if (!enabled || !me) return
    const handler = (e: MouseEvent) => {
      const flow = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      flowCursorRef.current = flow
      const now = performance.now()
      if (now - lastBroadcastRef.current < 33) return
      lastBroadcastRef.current = now
      channelRef.current
        ?.track({
          user_id: me.id,
          name: me.name,
          color: colorFor(me.id),
          flow_x: flow.x,
          flow_y: flow.y,
          selected_node_id: selectedNodeId,
          is_typing: isTyping,
        } satisfies PresencePayload)
        .catch(() => undefined)
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, me])

  // Project peer cursors back to screen coordinates for rendering.
  // Recompute on every render so panning/zooming locally moves remote cursors
  // with the canvas.
  const collaborators = useMemo<PresentCollaborator[]>(() => {
    const out: PresentCollaborator[] = []
    for (const p of peers.values()) {
      const entry: PresentCollaborator = {
        id: p.user_id,
        name: p.name,
        color: p.color,
        selectedNodeId: p.selected_node_id ?? undefined,
        isTyping: p.is_typing,
      }
      if (p.flow_x !== null && p.flow_y !== null) {
        try {
          const screen = rf.flowToScreenPosition({ x: p.flow_x, y: p.flow_y })
          entry.cursor = { x: screen.x, y: screen.y }
        } catch {
          // viewport not ready yet
        }
      }
      out.push(entry)
    }
    return out
    // The peers map drives this; viewport changes also re-render the parent
    // (ReactFlow emits onMove) so cursors track pan/zoom.
  }, [peers, rf])

  return collaborators
}
