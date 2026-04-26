import * as React from 'react'

// ========================================
// Lazynext Email Templates
// Light theme — lime header, white body, slate-50 footer
// Header/button text is near-black (#0A0A0A) because lime needs dark
// foreground for WCAG AA contrast. Matches the logo's color pair.
// ========================================

const BRAND_COLOR = '#BEFF66'
const BRAND_FOREGROUND = '#0A0A0A'
const BRAND_NAME = 'Lazynext'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

// Shared layout wrapper
function EmailLayout({ children, preheader }: { children: React.ReactNode; preheader?: string }) {
  return (
    <html>
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width" /></head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f8fafc', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        {preheader && <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>{preheader}</div>}
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#f8fafc' }}>
          <tr>
            <td align="center" style={{ padding: '40px 16px' }}>
              <table width="600" cellPadding={0} cellSpacing={0} style={{ maxWidth: 600, width: '100%' }}>
                {/* Header */}
                <tr>
                  <td style={{ backgroundColor: BRAND_COLOR, borderRadius: '12px 12px 0 0', padding: '24px 32px' }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: BRAND_FOREGROUND, letterSpacing: '-0.5px' }}>{BRAND_NAME}</span>
                  </td>
                </tr>
                {/* Body */}
                <tr>
                  <td style={{ backgroundColor: '#ffffff', padding: '32px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
                    {children}
                  </td>
                </tr>
                {/* Footer */}
                <tr>
                  <td style={{ backgroundColor: '#f1f5f9', borderRadius: '0 0 12px 12px', padding: '20px 32px', textAlign: 'center', border: '1px solid #e2e8f0', borderTop: 'none' }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                      {BRAND_NAME} · Graph-native workflows · <a href={BASE_URL} style={{ color: '#0A0A0A', textDecoration: 'underline' }}>lazynext.com</a>
                    </p>
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8' }}>
                      You received this because you&apos;re part of a {BRAND_NAME} workspace. <a href={`${BASE_URL}/settings`} style={{ color: '#94a3b8' }}>Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}

function Button({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <table cellPadding={0} cellSpacing={0}>
      <tr>
        <td style={{ backgroundColor: BRAND_COLOR, borderRadius: 8, padding: '12px 28px' }}>
          <a href={href} style={{ color: BRAND_FOREGROUND, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>{children}</a>
        </td>
      </tr>
    </table>
  )
}

// ========================================
// 1. Workspace Invite
// ========================================
export function WorkspaceInviteEmail({ inviterName = 'Avas Patel', workspaceName = 'Lazynext', inviteUrl = `${BASE_URL}/invite/abc123` }) {
  return (
    <EmailLayout preheader={`${inviterName} invited you to ${workspaceName}`}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>You&apos;re invited!</h1>
      <p style={{ margin: '0 0 24px', fontSize: 15, color: '#475569', lineHeight: '1.6' }}>
        <strong style={{ color: '#0f172a' }}>{inviterName}</strong> invited you to join the <strong style={{ color: '#0f172a' }}>{workspaceName}</strong> workspace on {BRAND_NAME}.
      </p>
      <Button href={inviteUrl}>Accept Invitation</Button>
      <p style={{ margin: '24px 0 0', fontSize: 12, color: '#94a3b8' }}>
        This invite expires in 7 days. If you don&apos;t recognize this invite, you can safely ignore this email.
      </p>
    </EmailLayout>
  )
}

// ========================================
// 2. Task Assignment
// ========================================
export function TaskAssignmentEmail({
  assignerName = 'Priya Shah',
  taskTitle = 'Fix auth redirect bug',
  priority = 'High',
  dueDate = 'April 5, 2026',
  taskUrl = `${BASE_URL}/workspace/main/tasks/1`,
}) {
  const priorityColor = priority === 'High' ? '#ef4444' : priority === 'Medium' ? '#f59e0b' : '#64748b'
  return (
    <EmailLayout preheader={`${assignerName} assigned you: ${taskTitle}`}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>New task assigned</h1>
      <p style={{ margin: '0 0 20px', fontSize: 15, color: '#475569', lineHeight: '1.6' }}>
        <strong style={{ color: '#0f172a' }}>{assignerName}</strong> assigned you a task:
      </p>
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: `4px solid ${BRAND_COLOR}`, borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{taskTitle}</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          Priority: <span style={{ color: priorityColor, fontWeight: 600 }}>{priority}</span> · Due: <strong>{dueDate}</strong>
        </p>
      </div>
      <Button href={taskUrl}>View Task</Button>
    </EmailLayout>
  )
}

// ========================================
// 3. Weekly Digest — decision-intelligence edition
// ========================================
type DigestDecision = {
  question: string
  quality: number | null
  outcome: 'good' | 'bad' | 'neutral' | 'pending'
  type?: string | null
  url?: string
}

export function WeeklyDigestEmail({
  weekOf = 'March 31 – April 6, 2026',
  stats = { decisionsLogged: 8, outcomesRecorded: 3, avgQuality: 74, pendingReminders: 4 },
  topDecision,
  bottomDecision,
  overdueOutcomes = [],
  narrative,
  digestUrl = `${BASE_URL}/workspace/main/decisions`,
  outcomesUrl = `${BASE_URL}/workspace/main/decisions/outcomes`,
}: {
  weekOf?: string
  stats?: { decisionsLogged: number; outcomesRecorded: number; avgQuality: number; pendingReminders: number }
  topDecision?: DigestDecision | null
  bottomDecision?: DigestDecision | null
  overdueOutcomes?: DigestDecision[]
  narrative?: string | null
  digestUrl?: string
  outcomesUrl?: string
}) {
  const qualityColor = stats.avgQuality >= 70 ? '#10b981' : stats.avgQuality >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <EmailLayout preheader={`Week of ${weekOf} — ${stats.decisionsLogged} decisions logged, ${stats.outcomesRecorded} outcomes recorded`}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Decision Digest</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#94a3b8' }}>Week of {weekOf}</p>

      {/* Narrative callout — AI-generated one-liner */}
      {narrative && (
        <div style={{ backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '14px 18px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: BRAND_COLOR }}>✨ This week in one line</p>
          <p style={{ margin: 0, fontSize: 14, color: '#0f172a', lineHeight: '1.55' }}>{narrative}</p>
        </div>
      )}

      {/* Stats strip */}
      <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 24 }}>
        <tr>
          <td style={{ padding: 12, textAlign: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px 0 0 8px' }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{stats.decisionsLogged}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Decisions</p>
          </td>
          <td style={{ padding: 12, textAlign: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: 'none' }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{stats.outcomesRecorded}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Outcomes</p>
          </td>
          <td style={{ padding: 12, textAlign: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: 'none' }}>
            <div style={{ display: 'inline-block', width: 44, height: 44, borderRadius: '50%', border: `3px solid ${qualityColor}`, lineHeight: '38px', fontSize: 16, fontWeight: 700, color: qualityColor, textAlign: 'center' }}>
              {stats.avgQuality}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Avg Quality</p>
          </td>
          <td style={{ padding: 12, textAlign: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: 'none', borderRadius: '0 8px 8px 0' }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{stats.pendingReminders}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Need outcome</p>
          </td>
        </tr>
      </table>

      {/* Top + Bottom decisions */}
      {(topDecision || bottomDecision) && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>This week&apos;s bookends</p>
          {topDecision && (
            <div style={{ borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#047857' }}>🥇 Most rigorous</p>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{topDecision.question}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Quality {topDecision.quality ?? '—'}/100</p>
            </div>
          )}
          {bottomDecision && (
            <div style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#b91c1c' }}>🥄 Weakest reasoning</p>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{bottomDecision.question}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Quality {bottomDecision.quality ?? '—'}/100 — worth revisiting the rationale.</p>
            </div>
          )}
        </div>
      )}

      {/* Overdue outcomes */}
      {overdueOutcomes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Outcomes waiting on you ({overdueOutcomes.length})</p>
          {overdueOutcomes.slice(0, 5).map((d, i) => (
            <div key={i} style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 12px', marginBottom: 6 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{d.question}</p>
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <a href={outcomesUrl} style={{ color: BRAND_COLOR, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Record outcomes →</a>
          </div>
        </div>
      )}

      <Button href={digestUrl}>Open workspace</Button>
    </EmailLayout>
  )
}

// ========================================
// 4. Decision Digest
// ========================================
export function DecisionDigestEmail({
  decisions = [
    { title: 'Use Supabase for database', quality: 91, outcome: 'Good', type: 'Irreversible' },
    { title: 'Pricing at $9/seat', quality: 78, outcome: 'Pending', type: 'Reversible' },
    { title: 'Ship MVP without export', quality: 45, outcome: 'Bad', type: 'Experimental' },
  ],
  reviewUrl = `${BASE_URL}/workspace/main/decisions`,
}) {
  return (
    <EmailLayout preheader={`${decisions.length} decisions need your attention`}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Decision Digest</h1>
      <p style={{ margin: '0 0 24px', fontSize: 15, color: '#475569' }}>
        {decisions.length} decisions from this week need outcome review.
      </p>

      {decisions.map((d, i) => {
        const qColor = d.quality >= 70 ? '#10b981' : d.quality >= 40 ? '#f59e0b' : '#ef4444'
        const outcomeEmoji = d.outcome === 'Good' ? '👍' : d.outcome === 'Bad' ? '👎' : '⏳'
        return (
          <div key={i} style={{ borderLeft: `4px solid ${d.type === 'Irreversible' ? '#f59e0b' : d.type === 'Experimental' ? '#a855f7' : BRAND_COLOR}`, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tr>
                <td>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{d.title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{d.type} · Outcome: {outcomeEmoji} {d.outcome}</p>
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                  <div style={{ display: 'inline-block', width: 36, height: 36, borderRadius: '50%', border: `3px solid ${qColor}`, lineHeight: '30px', fontSize: 13, fontWeight: 700, color: qColor, textAlign: 'center' }}>
                    {d.quality}
                  </div>
                </td>
              </tr>
            </table>
          </div>
        )
      })}

      <div style={{ marginTop: 24 }}>
        <Button href={reviewUrl}>Review Decisions</Button>
      </div>
    </EmailLayout>
  )
}

// ========================================
// 5. Outcome Reminder — "How did this decision actually go?"
// ========================================
export function OutcomeReminderEmail({
  decisionTitle = 'Use Supabase for database',
  resolution = 'Go with Supabase',
  loggedOn = 'March 3, 2026',
  expectedBy = 'April 18, 2026',
  captureUrl = `${BASE_URL}/workspace/main/decisions/outcomes`,
  workspaceName = 'Lazynext',
}: {
  decisionTitle?: string
  resolution?: string | null
  loggedOn?: string
  expectedBy?: string | null
  captureUrl?: string
  workspaceName?: string
}) {
  return (
    <EmailLayout preheader={`How did "${decisionTitle}" play out?`}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
        How did this decision actually play out?
      </h1>
      <p style={{ margin: '0 0 20px', fontSize: 15, color: '#475569', lineHeight: '1.6' }}>
        You marked this decision in <strong>{workspaceName}</strong>
        {expectedBy ? <> with a check-in date of <strong>{expectedBy}</strong></> : <></>}. Five minutes now keeps your decision memory honest — and trains your team&apos;s AI on real outcomes.
      </p>

      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: `4px solid ${BRAND_COLOR}`, borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Decision</p>
        <h2 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{decisionTitle}</h2>
        {resolution && (
          <>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>What we chose</p>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#475569', lineHeight: '1.5' }}>{resolution}</p>
          </>
        )}
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Logged {loggedOn}</p>
      </div>

      <p style={{ margin: '0 0 16px', fontSize: 14, color: '#475569', lineHeight: '1.6' }}>
        Drop a verdict (Worked / Partial / Failed), a line of what you learned, and your confidence. That&apos;s it.
      </p>

      <Button href={captureUrl}>Record outcome</Button>

      <p style={{ margin: '24px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: '1.5' }}>
        Decision intelligence compounds only if the outcome loop closes. Every recorded outcome makes your workspace&apos;s future recommendations measurably sharper.
      </p>
    </EmailLayout>
  )
}

// ========================================
// 6. Billing — Welcome to the paid tier
// ========================================
export function BillingWelcomeEmail({
  customerName,
  planDisplay,
  manageUrl,
  workspaceUrl,
}: {
  customerName?: string
  planDisplay: string
  manageUrl: string
  workspaceUrl: string
}) {
  const greeting = customerName ? `Hi ${customerName},` : 'Hi there,'
  return (
    <EmailLayout preheader={`Welcome to ${planDisplay} — here's how to get the most from it`}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
        Welcome to {planDisplay} 🎉
      </h1>
      <p style={{ margin: '0 0 16px', fontSize: 15, color: '#475569', lineHeight: '1.6' }}>
        {greeting} thanks for upgrading. Your workspace is now on the {planDisplay} plan — every paid feature is live.
      </p>

      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: `4px solid ${BRAND_COLOR}`, borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>What&apos;s newly unlocked</p>
        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 14, color: '#334155', lineHeight: '1.7' }}>
          <li>Decision Health Dashboard — quality trends, outcome donut, top decision makers</li>
          <li>PULSE — live team health, workload, burndown</li>
          <li>Automation workflows — triggers and cron jobs for your team</li>
          <li>Higher AI query limits — 500 LazyMind queries per seat per day</li>
        </ul>
      </div>

      <Button href={workspaceUrl}>Open your workspace</Button>

      <p style={{ margin: '24px 0 6px', fontSize: 13, color: '#475569', lineHeight: '1.6' }}>
        Need to update your card, change plans, or cancel?
      </p>
      <p style={{ margin: 0, fontSize: 13 }}>
        <a href={manageUrl} style={{ color: BRAND_COLOR, textDecoration: 'none' }}>
          Manage your subscription →
        </a>
      </p>

      <p style={{ margin: '24px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: '1.5' }}>
        Questions? Just reply to this email — we read every one.
      </p>
    </EmailLayout>
  )
}
