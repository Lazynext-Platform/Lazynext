-- Notifications — backs the bell dropdown in the topbar.
-- Until this migration ran, components/ui/NotificationCenter.tsx
-- shipped a hardcoded empty array with an "all caught up" message
-- (honest, but inert). This table makes the bell real.

CREATE TYPE notification_type AS ENUM (
  'task_assigned',
  'task_due_soon',
  'decision_logged',
  'decision_outcome_pending',
  'thread_mention',
  'thread_reply',
  'workspace_invite'
);

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Recipient. The user this notification is FOR.
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Actor. The user that caused the event. NULL for system events.
  actor_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type          notification_type NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  -- Optional in-app link (relative path, e.g. "/workspace/<slug>/decisions/<id>").
  link          TEXT,
  -- Optional FK-ish references for cleanup + dedup. We don't FK these
  -- because the source row may live in any of several tables.
  related_node_id      UUID,
  related_decision_id  UUID,
  related_thread_id    UUID,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notif_user_unread_idx
  ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX notif_workspace_user_idx
  ON notifications(workspace_id, user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- A user can only ever see / mutate their own notifications.
CREATE POLICY "Users can read their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can mark their own notifications read" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Inserts are server-side only via the service role.
CREATE POLICY "Service role inserts notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
