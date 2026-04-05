import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const planEnum = pgEnum('plan', ['free', 'starter', 'pro', 'business', 'enterprise'])
export const roleEnum = pgEnum('role', ['admin', 'member', 'guest'])
export const nodeTypeEnum = pgEnum('node_type', ['task', 'doc', 'table', 'thread', 'decision', 'automation', 'pulse'])
export const statusEnum = pgEnum('status', ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'])
export const decisionStatusEnum = pgEnum('decision_status', ['open', 'decided', 'reversed', 'deferred'])
export const decisionTypeEnum = pgEnum('decision_type', ['reversible', 'irreversible', 'experimental'])
export const outcomeEnum = pgEnum('outcome', ['good', 'bad', 'neutral', 'pending'])

// ─── Workspaces ──────────────────────────────────────────────
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  clerkOrgId: varchar('clerk_org_id', { length: 255 }).unique(),
  logo: text('logo'),
  plan: planEnum('plan').default('free').notNull(),
  trialEndsAt: timestamp('trial_ends_at'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  razorpayCustomerId: varchar('razorpay_customer_id', { length: 255 }),
  razorpaySubscriptionId: varchar('razorpay_subscription_id', { length: 255 }),
  region: varchar('region', { length: 50 }).default('ap-south-1'),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Workspace Members ───────────────────────────────────────
export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull(),
  role: roleEnum('role').default('member').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index('wm_workspace_idx').on(t.workspaceId),
  userIdx: index('wm_user_idx').on(t.clerkUserId),
  uniqueMember: uniqueIndex('wm_unique_member').on(t.workspaceId, t.clerkUserId),
}))

// ─── Workflows ───────────────────────────────────────────────
export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isTemplate: boolean('is_template').default(false),
  isPublic: boolean('is_public').default(false),
  templateCategory: varchar('template_category', { length: 100 }),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index('wf_workspace_idx').on(t.workspaceId),
}))

// ─── Nodes ───────────────────────────────────────────────────
export const nodes = pgTable('nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => workflows.id, { onDelete: 'cascade' }).notNull(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  type: nodeTypeEnum('type').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  data: jsonb('data').default({}),
  positionX: integer('position_x').default(0).notNull(),
  positionY: integer('position_y').default(0).notNull(),
  // Denormalized fields for fast queries
  status: statusEnum('status'),
  assignedTo: varchar('assigned_to', { length: 255 }),
  dueAt: timestamp('due_at'),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: varchar('updated_by', { length: 255 }),
}, (t) => ({
  workflowIdx: index('node_workflow_idx').on(t.workflowId),
  workspaceIdx: index('node_workspace_idx').on(t.workspaceId),
  typeIdx: index('node_type_idx').on(t.type),
  statusIdx: index('node_status_idx').on(t.status),
  assignedIdx: index('node_assigned_idx').on(t.assignedTo),
}))

// ─── Edges ───────────────────────────────────────────────────
export const edges = pgTable('edges', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => workflows.id, { onDelete: 'cascade' }).notNull(),
  sourceId: uuid('source_id').references(() => nodes.id, { onDelete: 'cascade' }).notNull(),
  targetId: uuid('target_id').references(() => nodes.id, { onDelete: 'cascade' }).notNull(),
  condition: jsonb('condition'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  workflowIdx: index('edge_workflow_idx').on(t.workflowId),
}))

// ─── Threads ─────────────────────────────────────────────────
export const threads = pgTable('threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  nodeId: uuid('node_id').references(() => nodes.id, { onDelete: 'cascade' }).notNull(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }),
  isResolved: boolean('is_resolved').default(false),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: varchar('resolved_by', { length: 255 }),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  nodeIdx: index('thread_node_idx').on(t.nodeId),
}))

// ─── Messages ────────────────────────────────────────────────
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').references(() => threads.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  contentType: varchar('content_type', { length: 20 }).default('text'),
  attachments: jsonb('attachments').default([]),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  editedAt: timestamp('edited_at'),
}, (t) => ({
  threadIdx: index('msg_thread_idx').on(t.threadId),
}))

// ─── Decisions ───────────────────────────────────────────────
export const decisions = pgTable('decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  nodeId: uuid('node_id').references(() => nodes.id, { onDelete: 'set null' }),
  question: text('question').notNull(),
  resolution: text('resolution'),
  rationale: text('rationale'),
  status: decisionStatusEnum('status').default('open').notNull(),
  optionsConsidered: jsonb('options_considered').default([]),
  informationAtTime: jsonb('information_at_time'),
  stakeholders: jsonb('stakeholders').default([]),
  decisionType: decisionTypeEnum('decision_type'),
  outcome: outcomeEnum('outcome').default('pending'),
  outcomeTaggedBy: varchar('outcome_tagged_by', { length: 255 }),
  outcomeTaggedAt: timestamp('outcome_tagged_at'),
  outcomeNotes: text('outcome_notes'),
  outcomeConfidence: integer('outcome_confidence'),
  qualityScore: integer('quality_score'),
  qualityFeedback: text('quality_feedback'),
  qualityScoredAt: timestamp('quality_scored_at'),
  tags: jsonb('tags').default([]),
  madeBy: varchar('made_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index('dec_workspace_idx').on(t.workspaceId),
  nodeIdx: index('dec_node_idx').on(t.nodeId),
  statusIdx: index('dec_status_idx').on(t.status),
  outcomeIdx: index('dec_outcome_idx').on(t.outcome),
}))

// ─── Automation Runs ─────────────────────────────────────────
export const automationRuns = pgTable('automation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  nodeId: uuid('node_id').references(() => nodes.id, { onDelete: 'cascade' }).notNull(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  result: jsonb('result'),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
})

// ─── Relations ───────────────────────────────────────────────
export const workspaceRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  workflows: many(workflows),
  nodes: many(nodes),
  decisions: many(decisions),
  threads: many(threads),
}))

export const workspaceMemberRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
}))

export const workflowRelations = relations(workflows, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workflows.workspaceId],
    references: [workspaces.id],
  }),
  nodes: many(nodes),
  edges: many(edges),
}))

export const nodeRelations = relations(nodes, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [nodes.workflowId],
    references: [workflows.id],
  }),
  workspace: one(workspaces, {
    fields: [nodes.workspaceId],
    references: [workspaces.id],
  }),
  threads: many(threads),
}))

export const edgeRelations = relations(edges, ({ one }) => ({
  workflow: one(workflows, {
    fields: [edges.workflowId],
    references: [workflows.id],
  }),
  source: one(nodes, {
    fields: [edges.sourceId],
    references: [nodes.id],
    relationName: 'sourceEdges',
  }),
  target: one(nodes, {
    fields: [edges.targetId],
    references: [nodes.id],
    relationName: 'targetEdges',
  }),
}))

export const threadRelations = relations(threads, ({ one, many }) => ({
  node: one(nodes, {
    fields: [threads.nodeId],
    references: [nodes.id],
  }),
  messages: many(messages),
}))

export const messageRelations = relations(messages, ({ one }) => ({
  thread: one(threads, {
    fields: [messages.threadId],
    references: [threads.id],
  }),
}))

export const decisionRelations = relations(decisions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [decisions.workspaceId],
    references: [workspaces.id],
  }),
  node: one(nodes, {
    fields: [decisions.nodeId],
    references: [nodes.id],
  }),
}))
