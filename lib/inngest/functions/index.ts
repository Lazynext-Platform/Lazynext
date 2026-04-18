import { inngest, EVENTS } from '../client'
import { Resend } from 'resend'
import { WorkspaceInviteEmail, TaskAssignmentEmail, WeeklyDigestEmail, OutcomeReminderEmail } from '@/lib/email/templates/index'
import { db } from '@/lib/db/client'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { scoreDecision } from '@/lib/ai/decision-scorer'
import { callLazyMind, hasAIKeys } from '@/lib/ai/lazymind'

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

// 3. Score decision quality after logging (4-dimension AI scorer)
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

    const result = await scoreDecision({
      question: decision.question,
      resolution: decision.resolution ?? '',
      rationale: decision.rationale ?? '',
      optionsConsidered: (decision.options_considered as string[]) ?? [],
      decisionType: decision.decision_type ?? 'reversible',
    })

    await db
      .from('decisions')
      .update({
        quality_score: result.overall,
        score_breakdown: result.breakdown,
        score_rationale: result.rationale,
        score_model_version: result.modelVersion,
        quality_scored_at: new Date().toISOString(),
      })
      .eq('id', decisionId)

    return { scored: true, overall: result.overall, source: result.source }
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

// 5. Weekly digest cron job — decision intelligence edition
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

    const now = new Date()
    const weekAgoIso = new Date(now.getTime() - 7 * 86400000).toISOString()

    // Pull the decisions from the last 7 days
    const { data: weekDecisions } = await db
      .from('decisions')
      .select('id, question, resolution, quality_score, outcome, decision_type, created_at')
      .eq('workspace_id', workspaceId)
      .gte('created_at', weekAgoIso)
      .order('created_at', { ascending: false })

    const decisionsLogged = weekDecisions?.length ?? 0

    // Outcomes recorded this week (tagged_at within week)
    const { count: outcomesRecordedCount } = await db
      .from('decisions')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('outcome_tagged_at', weekAgoIso)
      .neq('outcome', 'pending')

    // Pending outcome reminders queue (decided but outcome still pending, expected_by in past or <7d)
    const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString()
    const { data: overdue } = await db
      .from('decisions')
      .select('id, question, quality_score, outcome, decision_type, expected_by')
      .eq('workspace_id', workspaceId)
      .eq('outcome', 'pending')
      .eq('status', 'decided')
      .not('expected_by', 'is', null)
      .lte('expected_by', in7Days)
      .order('expected_by', { ascending: true })
      .limit(10)

    // Avg quality over the whole workspace (not just this week)
    const { data: scoredDecisions } = await db
      .from('decisions')
      .select('quality_score')
      .eq('workspace_id', workspaceId)
      .not('quality_score', 'is', null)

    const avgQuality = scoredDecisions?.length
      ? Math.round(scoredDecisions.reduce((sum, d) => sum + (d.quality_score ?? 0), 0) / scoredDecisions.length)
      : 0

    // Top + bottom of this week by quality
    const scoredThisWeek = (weekDecisions ?? []).filter((d) => typeof d.quality_score === 'number') as Array<{
      id: string; question: string; quality_score: number; outcome: string; decision_type: string | null
    }>
    scoredThisWeek.sort((a, b) => (b.quality_score) - (a.quality_score))
    const topDecision = scoredThisWeek[0] ?? null
    const bottomDecision = scoredThisWeek.length > 1 ? scoredThisWeek[scoredThisWeek.length - 1] : null

    // Ask the AI to write a one-line narrative if we have keys
    let narrative: string | null = null
    if (hasAIKeys && decisionsLogged > 0) {
      try {
        const payload = JSON.stringify({
          week_decisions: decisionsLogged,
          outcomes_recorded: outcomesRecordedCount ?? 0,
          avg_quality: avgQuality,
          overdue: overdue?.length ?? 0,
          top: topDecision ? { q: topDecision.question, score: topDecision.quality_score } : null,
          bottom: bottomDecision ? { q: bottomDecision.question, score: bottomDecision.quality_score } : null,
        })
        const ai = await callLazyMind(
          'You are a crisp decision-intelligence analyst. In ONE sentence (under 30 words), narrate this workspace\'s decision-making week. Plain, honest, no hype, no emoji. If quality is weak, say so. If the team closed outcome loops well, say so.',
          payload,
          100
        )
        const trimmed = ai.content.trim().replace(/^"|"$/g, '')
        if (trimmed.length > 0 && trimmed.length < 300) narrative = trimmed
      } catch {
        // fine — digest still sends without narrative
      }
    }

    const stats = {
      decisionsLogged,
      outcomesRecorded: outcomesRecordedCount ?? 0,
      avgQuality,
      pendingReminders: overdue?.length ?? 0,
    }

    // Get workspace member user_ids, then resolve emails via auth.admin
    // (email isn't stored on workspace_members — it lives on auth.users).
    const { data: memberRows } = await db
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)

    const memberEmails: string[] = []
    for (const m of memberRows ?? []) {
      try {
        const { data } = await db.auth.admin.getUserById(m.user_id)
        if (data?.user?.email) memberEmails.push(data.user.email)
      } catch {
        // skip
      }
    }
    const members = memberEmails.map((email) => ({ email }))

    if (!members.length) return { skipped: true, reason: 'no_members' }

    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    const weekOf = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const digestUrl = `${appUrl}/workspace/${workspace.slug}/decisions`
    const outcomesUrl = `${appUrl}/workspace/${workspace.slug}/decisions/outcomes`

    const results = await Promise.allSettled(
      members.map((m) =>
        resend.emails.send({
          from: 'Lazynext <noreply@lazynext.com>',
          to: m.email,
          subject: `Decision Digest — ${weekOf}`,
          react: WeeklyDigestEmail({
            weekOf,
            stats,
            topDecision: topDecision
              ? { question: topDecision.question, quality: topDecision.quality_score, outcome: topDecision.outcome as 'good' | 'bad' | 'neutral' | 'pending', type: topDecision.decision_type }
              : null,
            bottomDecision: bottomDecision
              ? { question: bottomDecision.question, quality: bottomDecision.quality_score, outcome: bottomDecision.outcome as 'good' | 'bad' | 'neutral' | 'pending', type: bottomDecision.decision_type }
              : null,
            overdueOutcomes: (overdue ?? []).map((d) => ({
              question: d.question,
              quality: d.quality_score,
              outcome: d.outcome as 'good' | 'bad' | 'neutral' | 'pending',
              type: d.decision_type,
            })),
            narrative,
            digestUrl,
            outcomesUrl,
          }),
        })
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    return { processed: true, stats, sent, total: members.length }
  }
)

// 6a. Outcome reminder cron — scan for decisions whose expected_by is within 3 days
//     and no reminder has been sent yet, then email the author and stamp the row.
export const handleOutcomeReminderScan = inngest.createFunction(
  { id: 'outcome-reminder-scan', retries: 2, triggers: [{ event: EVENTS.OUTCOME_REMINDER_CRON }, { cron: '0 14 * * *' }] },
  async () => {
    if (!hasValidDatabaseUrl) return { skipped: true }

    const now = new Date()
    const threeDaysOut = new Date(now.getTime() + 3 * 86400000).toISOString()

    // Decisions eligible for a nudge:
    //   - outcome is still 'pending'
    //   - expected_by is within the next 3 days (or already past)
    //   - we haven't stamped a reminder yet
    const { data: due, error } = await db
      .from('decisions')
      .select('id, question, resolution, expected_by, created_at, workspace_id, created_by')
      .eq('outcome', 'pending')
      .lte('expected_by', threeDaysOut)
      .is('outcome_reminder_sent_at', null)
      .not('expected_by', 'is', null)
      .limit(100)

    if (error || !due?.length) return { scanned: 0, sent: 0 }

    const resend = getResend()
    if (!resend) {
      // Still stamp so we don't re-scan the same rows every day.
      await db
        .from('decisions')
        .update({ outcome_reminder_sent_at: new Date().toISOString() })
        .in('id', due.map((d) => d.id))
      return { scanned: due.length, sent: 0, reason: 'resend_not_configured' }
    }

    // Fetch author emails (via Supabase auth.admin — email is not stored in
    // workspace_members) + workspace slugs in bulk.
    const authorIds = Array.from(new Set(due.map((d) => d.created_by).filter(Boolean) as string[]))
    const workspaceIds = Array.from(new Set(due.map((d) => d.workspace_id)))

    const emailByUser = new Map<string, string>()
    await Promise.all(
      authorIds.map(async (uid) => {
        try {
          const { data } = await db.auth.admin.getUserById(uid)
          const email = data?.user?.email
          if (email) emailByUser.set(uid, email)
        } catch {
          // skip unknown user
        }
      })
    )

    const { data: workspaces } = await db.from('workspaces').select('id, slug, name').in('id', workspaceIds)
    const workspaceById = new Map((workspaces ?? []).map((w) => [w.id, w]))

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    let sent = 0

    for (const d of due) {
      const to = d.created_by ? emailByUser.get(d.created_by) : undefined
      const ws = workspaceById.get(d.workspace_id)
      if (!to || !ws) continue

      const captureUrl = `${appUrl}/workspace/${ws.slug}/decisions/outcomes?id=${d.id}`
      const loggedOn = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const expectedBy = d.expected_by
        ? new Date(d.expected_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null

      try {
        await resend.emails.send({
          from: 'Lazynext <noreply@lazynext.com>',
          to,
          subject: `How did "${d.question.slice(0, 60)}" play out?`,
          react: OutcomeReminderEmail({
            decisionTitle: d.question,
            resolution: d.resolution,
            loggedOn,
            expectedBy,
            captureUrl,
            workspaceName: ws.name,
          }),
        })
        sent++
      } catch {
        // continue; we still stamp below so we don't hammer on a transient failure
      }
    }

    // Stamp every decision we scanned so it doesn't get re-nudged every day.
    await db
      .from('decisions')
      .update({ outcome_reminder_sent_at: new Date().toISOString() })
      .in('id', due.map((d) => d.id))

    return { scanned: due.length, sent }
  }
)

// 7. Build export file in background
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
  handleOutcomeReminderScan,
  handleExportRequested,
]
