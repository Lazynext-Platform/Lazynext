import * as React from 'react'

// ========================================
// Lazynext Email Templates
// Light theme — blue header, white body, slate-50 footer
// ========================================

const BRAND_COLOR = '#4F6EF7'
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
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>{BRAND_NAME}</span>
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
                      {BRAND_NAME} · Graph-native workflows · <a href={BASE_URL} style={{ color: BRAND_COLOR }}>lazynext.com</a>
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
          <a href={href} style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>{children}</a>
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
// 3. Weekly Digest
// ========================================
export function WeeklyDigestEmail({
  weekOf = 'March 31 – April 6, 2026',
  stats = { tasksCompleted: 18, decisionsLogged: 8, avgQuality: 74, activeMembers: 6 },
  digestUrl = `${BASE_URL}/workspace/main/pulse`,
}) {
  const qualityColor = stats.avgQuality >= 70 ? '#10b981' : stats.avgQuality >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <EmailLayout preheader={`Week of ${weekOf} — ${stats.tasksCompleted} tasks done`}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Weekly Digest</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#94a3b8' }}>Week of {weekOf}</p>

      <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 24 }}>
        <tr>
          <td style={{ padding: 12, textAlign: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px 0 0 8px' }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{stats.tasksCompleted}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Tasks Done</p>
          </td>
          <td style={{ padding: 12, textAlign: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: 'none' }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{stats.decisionsLogged}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Decisions</p>
          </td>
          <td style={{ padding: 12, textAlign: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: 'none' }}>
            <div style={{ display: 'inline-block', width: 44, height: 44, borderRadius: '50%', border: `3px solid ${qualityColor}`, lineHeight: '38px', fontSize: 16, fontWeight: 700, color: qualityColor, textAlign: 'center' }}>
              {stats.avgQuality}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Avg Quality</p>
          </td>
          <td style={{ padding: 12, textAlign: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: 'none', borderRadius: '0 8px 8px 0' }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{stats.activeMembers}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Active</p>
          </td>
        </tr>
      </table>

      {/* LazyMind callout */}
      <div style={{ backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: BRAND_COLOR }}>✨ LazyMind Insight</p>
        <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: '1.5' }}>
          Your team&apos;s decision quality improved by 3 points this week. Keep involving stakeholders early — it correlates with better outcomes.
        </p>
      </div>

      <Button href={digestUrl}>View Full Pulse</Button>
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
