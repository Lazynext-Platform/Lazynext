-- ─────────────────────────────────────────────────────────────
-- Automations: real WHEN/THEN engine.
--
-- Two narrow trigger types ship in v1 (`decision.logged`,
-- `task.created`) and two action types (`notification.send`,
-- `webhook.post`). Workspace members can see automations for
-- their workspace; only the service role inserts run rows.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(48) NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type VARCHAR(48) NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automations_workspace_trigger_idx
  ON automations(workspace_id, trigger_type) WHERE enabled = TRUE;

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view automations" ON automations
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages automations" ON automations
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- The existing `automation_runs` table keys on node_id (NOT NULL).
-- Loosen it so engine-level runs (no source node) can be recorded
-- alongside the older node-scoped runs.
ALTER TABLE automation_runs
  ADD COLUMN IF NOT EXISTS automation_id UUID REFERENCES automations(id) ON DELETE CASCADE;

ALTER TABLE automation_runs ALTER COLUMN node_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS automation_runs_automation_idx
  ON automation_runs(automation_id, started_at DESC);
