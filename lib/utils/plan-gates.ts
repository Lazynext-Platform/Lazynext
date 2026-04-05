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

export function hasFeature(plan: Plan, feature: string): boolean {
  const featureMap: Record<string, Plan[]> = {
    'decision-health': ['business', 'enterprise'],
    'semantic-search': ['business', 'enterprise'],
    'weekly-digest': ['pro', 'business', 'enterprise'],
    'automation': ['pro', 'business', 'enterprise'],
    'custom-fields': ['business', 'enterprise'],
    'audit-log': ['business', 'enterprise'],
    'sso': ['enterprise'],
  }
  return featureMap[feature]?.includes(plan) ?? false
}
