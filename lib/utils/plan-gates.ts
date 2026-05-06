import { PLAN_LIMITS } from './constants'

type Plan = keyof typeof PLAN_LIMITS

export function canAddMember(plan: Plan, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan].members
  return limit === -1 || currentCount < limit
}

export function canCreateWorkflow(plan: Plan, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan].workflows
  return limit === -1 || currentCount < limit
}

export function canCreateNode(plan: Plan, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan].nodes
  return limit === -1 || currentCount < limit
}

export function canUseAI(plan: Plan, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan].aiQueries
  return limit === -1 || currentCount < limit
}

export function canCreateDecision(plan: Plan, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan].decisions
  return limit === -1 || currentCount < limit
}

export function canCreateWorkspace(plan: Plan, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan].workspaces
  return limit === -1 || currentCount < limit
}

export function hasFeature(plan: Plan, feature: string): boolean {
  // Plan slugs map to the new pricing tiers:
  //   starter = Team, pro = Business, business = Enterprise
  //
  // Decision Health is intentionally the Team-tier unlock. It's the hero
  // feature — gating it behind Business starves the entry tier of the thing
  // users are here for. Business keeps automation, pulse, and AI depth.
  const featureMap: Record<string, Plan[]> = {
    'decision-health': ['starter', 'pro', 'business', 'enterprise'],
    'semantic-search': ['pro', 'business', 'enterprise'],
    'weekly-digest': ['pro', 'business', 'enterprise'],
    'automation': ['pro', 'business', 'enterprise'],
    'pulse': ['pro', 'business', 'enterprise'],
    'custom-fields': ['business', 'enterprise'],
    'audit-log': ['business', 'enterprise'],
    'sso': ['business', 'enterprise'],
    // API keys: machine access to the REST API. Enterprise-tier
    // because production integrations sit alongside SSO + audit log
    // in the same trust band.
    'api-keys': ['business', 'enterprise'],
    // PDF export of the Decision DNA report (#42). Team-tier and up.
    // Aligns with `decision-health` (the data source) and the typical
    // "shareable artifact for non-users" workflow.
    'pdf-export': ['starter', 'pro', 'business', 'enterprise'],
  }
  return featureMap[feature]?.includes(plan) ?? false
}
