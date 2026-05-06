import { notFound } from 'next/navigation'
import { FeatureGate } from '@/components/ui/FeatureGate'
import { getCurrentMemberWorkspace } from '@/lib/data/workspace'
import { listAuditLog, type AuditAction } from '@/lib/data/audit-log'
import { parseAuditRange, rangeCutoffIso } from '@/lib/utils/audit-format'
import { AuditLogClient } from './AuditLogClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Audit Log · Lazynext' }

const VALID_ACTIONS: ReadonlySet<AuditAction> = new Set([
  'workspace.update',
  'workspace.delete',
  'decision.create',
  'decision.update',
  'decision.delete',
  'node.create',
  'node.update',
  'node.delete',
  'member.invite',
  'member.remove',
  'member.role_update',
  'api_key.create',
  'api_key.rotate',
  'api_key.revoke',
  'edge.create',
  'edge.delete',
  'ai.workflow.generated',
  'ai.workflow.accepted',
  'ai.workflow.refined',
])

export default async function AuditLogPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { action?: string; range?: string; resourceType?: string; resourceId?: string }
}) {
  const { workspace, isMember } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace || !isMember) notFound()

  // Server-render the first page so the empty-flash never happens.
  // The client component takes it from there for filter changes and
  // load-more — they round-trip through the existing API which is
  // independently plan-gated and rate-limited.
  const initialAction =
    searchParams?.action && VALID_ACTIONS.has(searchParams.action as AuditAction)
      ? (searchParams.action as AuditAction)
      : null

  const initialRange = parseAuditRange(searchParams?.range)

  // Resource timeline filter (#52). Mirrors the API allowlist — both
  // keys must be set together; either alone is silently dropped.
  const RESOURCE_TYPES = new Set(['node', 'decision', 'workspace', 'api_key', 'member', 'edge'])
  const initialResourceType =
    searchParams?.resourceType && RESOURCE_TYPES.has(searchParams.resourceType)
      ? searchParams.resourceType
      : null
  const initialResourceId =
    initialResourceType && searchParams?.resourceId ? searchParams.resourceId : null

  const initial = await listAuditLog({
    workspaceId: workspace.id,
    limit: 50,
    cursor: null,
    action: initialAction,
    sinceIso: rangeCutoffIso(initialRange),
    resourceType: initialResourceType,
    resourceId: initialResourceId,
  })

  return (
    <FeatureGate
      feature="audit-log"
      variant="audit-log-gate"
      title="Workspace Audit Log"
      description="Every mutation — who, what, when, where — in one searchable view. Required for SOC-2 evidence and incident review."
      requiredTier="Business"
    >
      <AuditLogClient
        workspaceId={workspace.id}
        slug={params.slug}
        initialItems={initial.items}
        initialCursor={initial.nextCursor}
        initialAction={initialAction}
        initialRange={initialRange}
        initialResourceType={initialResourceType}
        initialResourceId={initialResourceId}
      />
    </FeatureGate>
  )
}
