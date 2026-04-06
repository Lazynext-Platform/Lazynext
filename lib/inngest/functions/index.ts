// Background job function stubs
// These define the shape of each Inngest function.
// When `inngest` is installed, convert to real Inngest function definitions.

import { EVENTS } from '../client'

// Stub: Send workspace invite email
export async function handleWorkspaceInvite(data: { email: string; inviterName: string; workspaceName: string; inviteUrl: string }) {
  console.log(`[job:stub] ${EVENTS.WORKSPACE_INVITE_SENT}`, data)
  // When Resend is installed:
  // import { Resend } from 'resend'
  // import { WorkspaceInviteEmail } from '@/lib/email/templates'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({ from: 'Lazynext <noreply@lazynext.com>', to: data.email, subject: `Join ${data.workspaceName}`, react: WorkspaceInviteEmail(data) })
}

// Stub: Send task assignment notification
export async function handleTaskAssigned(data: { assigneeEmail: string; assignerName: string; taskTitle: string; taskUrl: string }) {
  console.log(`[job:stub] ${EVENTS.TASK_ASSIGNED}`, data)
}

// Stub: Process decision quality scoring
export async function handleDecisionLogged(data: { decisionId: string; workspaceId: string }) {
  console.log(`[job:stub] ${EVENTS.DECISION_LOGGED}`, data)
  // When wired up: call lib/ai/decision-quality.ts to score the decision
}

// Stub: Handle outcome tagging — update aggregate metrics
export async function handleOutcomeTagged(data: { decisionId: string; outcome: string }) {
  console.log(`[job:stub] ${EVENTS.DECISION_OUTCOME_TAGGED}`, data)
}

// Stub: Generate and send weekly digest emails
export async function handleWeeklyDigest(data: { workspaceId: string }) {
  console.log(`[job:stub] ${EVENTS.WEEKLY_DIGEST_CRON}`, data)
}

// Stub: Build export file in background
export async function handleExportRequested(data: { workspaceId: string; format: string; userId: string }) {
  console.log(`[job:stub] ${EVENTS.EXPORT_REQUESTED}`, data)
}
