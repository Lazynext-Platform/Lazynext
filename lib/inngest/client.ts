import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'lazynext' })

// Event names — used across the app to trigger background jobs
export const EVENTS = {
  WORKSPACE_INVITE_SENT: 'workspace/invite.sent',
  TASK_ASSIGNED: 'workspace/task.assigned',
  DECISION_LOGGED: 'workspace/decision.logged',
  DECISION_OUTCOME_TAGGED: 'workspace/decision.outcome-tagged',
  OUTCOME_REMINDER_CRON: 'cron/outcome-reminder',
  WEEKLY_DIGEST_CRON: 'cron/weekly-digest',
  EXPORT_REQUESTED: 'workspace/export.requested',
  TRIAL_EXPIRY_SCAN: 'cron/trial-expiry-scan',
} as const
