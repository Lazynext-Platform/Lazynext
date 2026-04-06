// Inngest client — install `inngest` package to enable background jobs
// npm install inngest
//
// Then wire up the serve endpoint in app/api/inngest/route.ts:
// import { serve } from 'inngest/next'
// import { inngest, functions } from '@/lib/inngest/client'
// export const { GET, POST, PUT } = serve({ client: inngest, functions })

// Placeholder client that logs instead of executing when Inngest isn't installed
const INNGEST_AVAILABLE = false

interface EventPayload {
  name: string
  data: Record<string, unknown>
}

export const inngest = {
  send: async (event: EventPayload) => {
    if (!INNGEST_AVAILABLE) {
      console.log(`[inngest:stub] Event "${event.name}" would fire:`, event.data)
      return
    }
    // When inngest is installed:
    // const { Inngest } = await import('inngest')
    // const client = new Inngest({ id: 'lazynext' })
    // await client.send(event)
  },
}

// Event names — used across the app to trigger background jobs
export const EVENTS = {
  WORKSPACE_INVITE_SENT: 'workspace/invite.sent',
  TASK_ASSIGNED: 'workspace/task.assigned',
  DECISION_LOGGED: 'workspace/decision.logged',
  DECISION_OUTCOME_TAGGED: 'workspace/decision.outcome-tagged',
  WEEKLY_DIGEST_CRON: 'cron/weekly-digest',
  EXPORT_REQUESTED: 'workspace/export.requested',
} as const
