CREATE TYPE "public"."decision_status" AS ENUM('open', 'decided', 'reversed', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."decision_type" AS ENUM('reversible', 'irreversible', 'experimental');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('task', 'doc', 'table', 'thread', 'decision', 'automation', 'pulse');--> statement-breakpoint
CREATE TYPE "public"."outcome" AS ENUM('good', 'bad', 'neutral', 'pending');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'starter', 'pro', 'business', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'member', 'guest');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled');--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"node_id" uuid,
	"question" text NOT NULL,
	"resolution" text,
	"rationale" text,
	"status" "decision_status" DEFAULT 'open' NOT NULL,
	"options_considered" jsonb DEFAULT '[]'::jsonb,
	"information_at_time" jsonb,
	"stakeholders" jsonb DEFAULT '[]'::jsonb,
	"decision_type" "decision_type",
	"outcome" "outcome" DEFAULT 'pending',
	"outcome_tagged_by" varchar(255),
	"outcome_tagged_at" timestamp,
	"outcome_notes" text,
	"outcome_confidence" integer,
	"quality_score" integer,
	"quality_feedback" text,
	"quality_scored_at" timestamp,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"made_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"condition" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"content" text NOT NULL,
	"content_type" varchar(20) DEFAULT 'text',
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"edited_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"type" "node_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb,
	"position_x" integer DEFAULT 0 NOT NULL,
	"position_y" integer DEFAULT 0 NOT NULL,
	"status" "status",
	"assigned_to" varchar(255),
	"due_at" timestamp,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" varchar(255),
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"resolved_by" varchar(255),
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_template" boolean DEFAULT false,
	"is_public" boolean DEFAULT false,
	"template_category" varchar(100),
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"clerk_org_id" varchar(255),
	"logo" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"trial_ends_at" timestamp,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"razorpay_customer_id" varchar(255),
	"razorpay_subscription_id" varchar(255),
	"region" varchar(50) DEFAULT 'ap-south-1',
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug"),
	CONSTRAINT "workspaces_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_id_nodes_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_target_id_nodes_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dec_workspace_idx" ON "decisions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "dec_node_idx" ON "decisions" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "dec_status_idx" ON "decisions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dec_outcome_idx" ON "decisions" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "edge_workflow_idx" ON "edges" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "msg_thread_idx" ON "messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "node_workflow_idx" ON "nodes" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "node_workspace_idx" ON "nodes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "node_type_idx" ON "nodes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "node_status_idx" ON "nodes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "node_assigned_idx" ON "nodes" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "thread_node_idx" ON "threads" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "wf_workspace_idx" ON "workflows" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "wm_workspace_idx" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "wm_user_idx" ON "workspace_members" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wm_unique_member" ON "workspace_members" USING btree ("workspace_id","clerk_user_id");