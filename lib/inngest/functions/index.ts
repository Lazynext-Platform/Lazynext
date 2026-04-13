import { inngest, EVENTS } from '../client'
import { Resend } from 'resend'
import { WorkspaceInviteEmail, TaskAssignmentEmail, WeeklyDigestEmail } from '@/lib/email/templates/index'
import { db } from '@/lib/db/client'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { computeDecisionQualityScore } from '@/lib/ai/decision-quality'

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

// 1. Send workspace invite email
export const handleWorkspaceInvite = inngest.createFunction(
  { id: 'send-workspace-invite', retries: 3, triggers: [{ event: EVENTS.WORKSPACE_INVITE_SENT }] },
  async ({ event }) => {
    const { email, inviterName, workspaceName, inviteUrl } = event.data as {
      email: string; inviterName: string; workspaceName: string; inviteUrl: string
    }
    const resend = getResend()
    if (!resend) {
      return { skipped: true, reason: 'resend_not_configured' }
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
  { id: 'send-task-assigned', retries: 3, triggers: [{ event: EVENTS.TASK_ASSIGNED }] },
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
  { id: 'score-decision-quality', retries: 3, triggers: [{ event: EVENTS.DECISION_LOGGED }] },
  async ({ event }) => {
    const { decisionId } = event.data as { decisionId: string; workspaceId: string }
    if (!hasValidDatabaseUrl) return { skipped: true }

    const { data: decision } = await db
      .from('decisions')
      .select('*')
      .eq('id', decisionId)
      .single()

    if (!decision) return { error: 'Decision not found' }

    const score = computeDecisionQualityScore({
      question: decision.question,
      resolution: decision.resolution ?? '',
      rationale: decision.rationale ?? '',
      optionsConsidered: (decision.options_considered as string[]) ?? [],
      decisionType: decision.decision_type ?? 'reversible',
    })

    await db
      .from('decisions')
      .update({
        quality_score: score,
        quality_scored_at: new Date().toISOString(),
      })
      .eq('id', decisionId)

    return { scored: true, score }
  }
)

// 4. Handle outcome tagging — update the decision with the outcome
export const handleOutcomeTagged = inngest.createFunction(
  { id: 'handle-outcome-tagged', retries: 3, triggers: [{ event: EVENTS.DECISION_OUTCOME_TAGGED }] },
  async ({ event }) => {
    const { decisionId, outcome } = event.data as { decisionId: string; outcome: string }
    if (!hasValidDatabaseUrl) return { skipped: true }

    await db
      .from('decisions')
      .update({
        outcome,
        outcome_tagged_at: new Date().toISOString(),
      })
      .eq('id', decisionId)

    return { processed: true, decisionId, outcome }
  }
)

// 5. Weekly digest cron job
export const handleWeeklyDigest = inngest.createFunction(
  { id: 'send-weekly-digest', retries: 3, triggers: [{ event: EVENTS.WEEKLY_DIGEST_CRON }] },
  async ({ event }) => {
    const { workspaceId } = event.data as { workspaceId: string }
    if (!hasValidDatabaseUrl) return { skipped: true }

    const resend = getResend()
    if (!resend) return { skipped: true }

    const { data: workspace } = await db
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (!workspace) return { error: 'Workspace not found' }

    // Gather stats
    const { count: nodeCount } = await db
      .from('nodes')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    const { count: decisionCount } = await db
      .from('decisions')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    // Compute average decision quality from scored decisions
    const { data: scoredDecisions } = await db
      .from('decisions')
      .select('quality_score')
      .eq('workspace_id', workspaceId)
      .not('quality_score', 'is', null)

    const avgQuality = scoredDecisions?.length
      ? Math.round(scoredDecisions.reduce((sum, d) => sum + (d.quality_score ?? 0), 0) / scoredDecisions.length)
      : 0

    // Count active workspace members
    const { count: memberCount } = await db
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    const stats = {
      tasksCompleted: nodeCount ?? 0,
      decisionsLogged: decisionCount ?? 0,
      avgQuality,
      activeMembers: memberCount ?? 0,
    }

    // Get workspace members' emails for digest
    const { data: members } = await db
      .from('workspace_members')
      .select('email')
      .eq('workspace_id', workspaceId)

    if (!members?.length) return { skipped: true, reason: 'no_members' }

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    const weekOf = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const digestUrl = `${appUrl}/workspace/${workspaceId}/pulse`

    const results = await Promise.allSettled(
      members.map((m) =>
        resend.emails.send({
          from: 'Lazynext <noreply@lazynext.com>',
          to: m.email,
          subject: `Weekly Digest — ${weekOf}`,
          react: WeeklyDigestEmail({ weekOf, stats, digestUrl }),
        })
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    return { processed: true, stats, sent, total: members.length }
  }
)

// 6. Build export file in background
export const handleExportRequested = inngest.createFunction(
  { id: 'handle-export-requested', retries: 3, triggers: [{ event: EVENTS.EXPORT_REQUESTED }] },
  async ({ event }) => {
    const { workspaceId, format, userId: _userId } = event.data as { workspaceId: string; format: string; userId: string }
    if (!hasValidDatabaseUrl) return { skipped: true }

    const { data: allWorkflows } = await db.from('workflows').select('*').eq('workspace_id', workspaceId)
    const { data: allNodes } = await db.from('nodes').select('*').eq('workspace_id', workspaceId)
    const { data: allDecisions } = await db.from('decisions').select('*').eq('workspace_id', workspaceId)

    const exportData = {
      exportedAt: new Date().toISOString(),
      workspaceId,
      workflows: allWorkflows ?? [],
      nodes: allNodes ?? [],
      decisions: allDecisions ?? [],
    }

    let content: string
    if (format === 'csv') {
      const rows = (allNodes ?? []).map((n) =>
        [n.id, n.type, n.label, n.status, n.created_at].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
      )
      content = ['id,type,label,status,created_at', ...rows].join('\n')
    } else {
      content = JSON.stringify(exportData, null, 2)
    }

    // Store the export in the exports table for the user to download
    await db.from('exports').insert({
      workspace_id: workspaceId,
      user_id: _userId,
      format,
      content,
      created_at: new Date().toISOString(),
    })

    return { processed: true, format, nodeCount: (allNodes ?? []).length, workflowCount: (allWorkflows ?? []).length, decisionCount: (allDecisions ?? []).length }
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
