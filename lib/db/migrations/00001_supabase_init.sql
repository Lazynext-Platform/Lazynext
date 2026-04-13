-- Supabase SQL Migration for Lazynext
-- Run this in Supabase SQL Editor to create all tables

-- ─── Enums ───────────────────────────────────────────────────
CREATE TYPE plan AS ENUM ('free', 'starter', 'pro', 'business', 'enterprise');
CREATE TYPE role AS ENUM ('admin', 'member', 'guest');
CREATE TYPE node_type AS ENUM ('task', 'doc', 'table', 'thread', 'decision', 'automation', 'pulse');
CREATE TYPE status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled');
CREATE TYPE decision_status AS ENUM ('open', 'decided', 'reversed', 'deferred');
CREATE TYPE decision_type AS ENUM ('reversible', 'irreversible', 'experimental');
CREATE TYPE outcome AS ENUM ('good', 'bad', 'neutral', 'pending');

-- ─── Workspaces ──────────────────────────────────────────────
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  logo TEXT,
  plan plan NOT NULL DEFAULT 'free',
  trial_ends_at TIMESTAMPTZ,
  ls_customer_id VARCHAR(255) UNIQUE,
  ls_subscription_id VARCHAR(255) UNIQUE,
  ls_customer_portal_url TEXT,
  region VARCHAR(50) DEFAULT 'ap-south-1',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Workspace Members ───────────────────────────────────────
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
CREATE INDEX wm_workspace_idx ON workspace_members(workspace_id);
CREATE INDEX wm_user_idx ON workspace_members(user_id);

-- ─── Workflows ───────────────────────────────────────────────
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_template BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  template_category VARCHAR(100),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wf_workspace_idx ON workflows(workspace_id);

-- ─── Nodes ───────────────────────────────────────────────────
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type node_type NOT NULL,
  title VARCHAR(500) NOT NULL,
  data JSONB DEFAULT '{}',
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  status status,
  assigned_to VARCHAR(255),
  due_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
CREATE INDEX node_workflow_idx ON nodes(workflow_id);
CREATE INDEX node_workspace_idx ON nodes(workspace_id);
CREATE INDEX node_type_idx ON nodes(type);
CREATE INDEX node_status_idx ON nodes(status);
CREATE INDEX node_assigned_idx ON nodes(assigned_to);

-- ─── Edges ───────────────────────────────────────────────────
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  condition JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX edge_workflow_idx ON edges(workflow_id);

-- ─── Threads ─────────────────────────────────────────────────
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(255),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX thread_node_idx ON threads(node_id);

-- ─── Messages ────────────────────────────────────────────────
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'text',
  attachments JSONB DEFAULT '[]',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ
);
CREATE INDEX msg_thread_idx ON messages(thread_id);

-- ─── Decisions ───────────────────────────────────────────────
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  resolution TEXT,
  rationale TEXT,
  status decision_status NOT NULL DEFAULT 'open',
  options_considered JSONB DEFAULT '[]',
  information_at_time JSONB,
  stakeholders JSONB DEFAULT '[]',
  decision_type decision_type,
  outcome outcome DEFAULT 'pending',
  outcome_tagged_by UUID REFERENCES auth.users(id),
  outcome_tagged_at TIMESTAMPTZ,
  outcome_notes TEXT,
  outcome_confidence INTEGER,
  quality_score INTEGER,
  quality_feedback TEXT,
  quality_scored_at TIMESTAMPTZ,
  tags JSONB DEFAULT '[]',
  made_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX dec_workspace_idx ON decisions(workspace_id);
CREATE INDEX dec_node_idx ON decisions(node_id);
CREATE INDEX dec_status_idx ON decisions(status);
CREATE INDEX dec_outcome_idx ON decisions(outcome);

-- ─── Automation Runs ─────────────────────────────────────────
CREATE TABLE automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ─── Row Level Security ─────────────────────────────────────
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: workspace members can access their workspace data
CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update workspaces" ON workspaces
  FOR UPDATE USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Members can view their memberships" ON workspace_members
  FOR SELECT USING (user_id = auth.uid() OR workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage members" ON workspace_members
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Workflows, nodes, edges, threads, messages, decisions: workspace member access
CREATE POLICY "Workspace members can access workflows" ON workflows
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Workspace members can access nodes" ON nodes
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Workspace members can access edges" ON edges
  FOR ALL USING (
    workflow_id IN (SELECT id FROM workflows WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Workspace members can access threads" ON threads
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Workspace members can access messages" ON messages
  FOR ALL USING (
    thread_id IN (SELECT id FROM threads WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Workspace members can access decisions" ON decisions
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Workspace members can access automation runs" ON automation_runs
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- ─── Auto-create workspace on user signup ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_workspace_id UUID;
  user_name TEXT;
  user_slug TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User');
  user_slug := 'workspace-' || substring(NEW.id::text from 1 for 8);

  INSERT INTO public.workspaces (name, slug, created_by)
  VALUES (user_name || '''s Workspace', user_slug, NEW.id)
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER nodes_updated_at BEFORE UPDATE ON nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER decisions_updated_at BEFORE UPDATE ON decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
