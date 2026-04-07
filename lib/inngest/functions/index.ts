import { inngest, EVENTS } from '../client'
import { Resend } from 'resend'
import { WorkspaceInviteEmail, TaskAssignmentEmail, WeeklyDigestEmail, DecisionDigestEmail } from '@/lib/email/templates/index'
import { db } from '@/lib/db/client'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { decisions, nodes, workflows, workspaces } from '@/lib/db/schema'
import { eq, desc, count } from 'drizzle-orm'
import { computeDecisionQualityScore } from '@/lib/ai/decision-quality'

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

// 1. Send workspace invite email
export const handleWorkspaceInvite = inngest.createFunction(
  { id: 'send-workspace-invite', triggers: [{ event: EVENTS.WORKSPACE_INVITE_SENT }] },
  async ({ event }) => {
    const { email, inviterName, workspaceName, inviteUrl } = event.data as {
      email: string; inviterName: string; workspaceName: string; inviteUrl: string
    }
    const resend = getResend()
    if (!resend) {
      console.log('[inngest] Resend not configured, skipping invite email')
      return { skipped: true }
    }
    const result = await resend.emails.send({
      from: 'Lazynext <noreply@lazynext.com>',
      to: email,
      subject: `Join ${workspaceName} on Lazynext`,
      react: WorkspaceInviteEmail({ inviterName, workspaceName, inviteUrl }),
    })
    return { sent: true, id: result.data?.id }
  }
)

// 2. Send task assignment notification
export const handleTaskAssigned = inngest.createFunction(
  { id: 'send-task-assigned', triggers: [{ event: EVENTS.TASK_ASSIGNED }] },
  async ({ event }) => {
    const { assigneeEmail, assignerName, taskTitle, taskUrl } = event.data as {
      assigneeEmail: string; assignerName: string; taskTitle: string; taskUrl: string
    }
    const resend = getResend()
    if (!resend) return { skipped: true }
    const result = await resend.emails.send({
      from: 'Lazynext <noreply@lazynext.com>',
      to: assigneeEmail,
      subject: `New task: ${taskTitle}`,
      react: TaskAssignmentEmail({ assignerName, taskTitle, taskUrl }),
    })
    return { sent: true, id: result.data?.id }
  }
)

// 3. Score decision quality after logging
export const handleDecisionLogged = inngest.createFunction(
  { id: 'score-decision-quality', triggers: [{ event: EVENTS.DECISION_LOGGED }] },
  async ({ event }) => {
    const { decisionId } = event.data as { decisionId: string; workspaceId: string }
    if (!hasValidDatabaseUrl) return { skipped: true }

    const [decision] = await db.select().from(decisions).where(eq(decisions.id, decisionId)).limit(1)
    if (!decision) return { error: 'Decision not found' }

    const score = computeDecisionQualityScore({
      question: decision.question,
      resolution: decision.resolution ?? '',
      rationale: decision.rationale ?? '',
      optionsConsidered: (decision.optionsConsidered as string[]) ?? [],
      decisionType: decision.decisionType ?? 'reversible',
    })

    await db.update(decisions).set({
      qualityScore: score,
      qualityScoredAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(decisions.id, decisionId))

    return { scored: true, score }
  }
)

// 4. Handle outcome tagging
export const handleOutcomeTagged = inngest.createFunction(
  { id: 'handle-outcome-tagged', triggers: [{ event: EVENTS.DECISION_OUTCOME_TAGGED }] },
  async ({ event }) => {
    const { decisionId, outcome } = event.data as { decisionId: string; outcome: string }
    console.log(`[inngest] Outcome tagged for decision ${decisionId}: ${outcome}`)
    return { processed: true }
  }
)

// 5. Weekly digest cron job
export const handleWeeklyDigest = inngest.createFunction(
  { id: 'send-weekly-digest', triggers: [{ event: EVENTS.WEEKLY_DIGEST_CRON }] },
  async ({ event }) => {
    const { workspaceId } = event.data as { workspaceId: string }
    if (!hasValidDatabaseUrl) return { skipped: true }

    const resend = getResend()
    if (!resend) return { skipped: true }

    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
    if (!workspace) return { error: 'Workspace not found' }

    // Gather stats
    const [nodeCount] = await db.select({ value: count() }).from(nodes).where(eq(nodes.workspaceId, workspaceId))
    const [decisionCount] = await db.select({ value: count() }).from(decisions).where(eq(decisions.workspaceId, workspaceId))

    const stats = {
      tasksCompleted: nodeCount?.value ?? 0,
      decisionsLogged: decisionCount?.value ?? 0,
      avgQuality: 72,
      activeMembers: 3,
    }

    // For now we log; in production, fetch member emails and send to each
    console.log(`[inngest] Weekly digest for workspace ${workspace.name}:`, stats)
    return { processed: true, stats }
  }
)

// 6. Build export file in background
export const handleExportRequested = inngest.createFunction(
  { id: 'handle-export-requested', triggers: [{ event: EVENTS.EXPORT_REQUESTED }] },
  async ({ event }) => {
    const { workspaceId, format, userId } = event.data as { workspaceId: string; format: string; userId: string }
    if (!hasValidDatabaseUrl) return { skipped: true }

    const allWorkflows = await db.select().from(workflows).where(eq(workflows.workspaceId, workspaceId))
    const allNodes = await db.select().from(nodes).where(eq(nodes.workspaceId, workspaceId))
    const allDecisions = await db.select().from(decisions).where(eq(decisions.workspaceId, workspaceId))

    console.log(`[inngest] Export for workspace ${workspaceId}: ${allWorkflows.length} workflows, ${allNodes.length} nodes, ${allDecisions.length} decisions`)
    return { processed: true, format, nodeCount: allNodes.length }
  }
)

// Export all functions for Inngest serve
export const functions = [
  handleWorkspaceInvite,
  handleTaskAssigned,
  handleDecisionLogged,
  handleOutcomeTagged,
  handleWeeklyDigest,
  handleExportRequested,
]
