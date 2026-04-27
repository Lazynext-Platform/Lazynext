-- Notification preferences + audit log.
-- Two tables that close out the Settings → Notifications tab and the
-- Activity → Audit Log tab. Both were honest empty states until now.

-- ─── Notification preferences ───────────────────────────────────────
-- Per-user, per-workspace, per-event toggles. Default behavior when
-- no row exists is "enabled" — this matches the existing "on by default"
-- copy in the settings page.

CREATE TABLE notification_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          notification_type NOT NULL,
  in_app        BOOLEAN NOT NULL DEFAULT true,
  email         BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, type)
);

CREATE INDEX np_user_idx ON notification_preferences(workspace_id, user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own preferences" ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users upsert their own preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ─── Audit log ──────────────────────────────────────────────────────
-- Append-only record of mutating actions. Hooked into workspace,
-- decision, node, and membership mutation routes. Surfaced under
-- Activity → Audit Log for plans with the 'audit-log' feature gate
-- (business + enterprise per lib/utils/plan-gates.ts).

CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action        VARCHAR(64) NOT NULL,        -- e.g. 'workspace.update', 'decision.create'
  resource_type VARCHAR(32),                 -- 'workspace' | 'decision' | 'node' | 'member' | ...
  resource_id   UUID,
  metadata      JSONB NOT NULL DEFAULT '{}',
  ip            INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_workspace_created_idx
  ON audit_log(workspace_id, created_at DESC);
CREATE INDEX audit_actor_idx ON audit_log(actor_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Members on Business+ plans can read their workspace's audit log.
-- We don't enforce the plan in RLS (it changes too easily) — the API
-- layer applies the plan gate. RLS just enforces tenant isolation.
CREATE POLICY "Members can read their workspace audit log" ON audit_log
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Inserts are server-side only.
CREATE POLICY "Service role inserts audit rows" ON audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
