-- Desk 2.0, phase 1: the task list (Today and Tasks screens).
-- Apply to the live database ONCE, before the new desk goes live:
--   npx wrangler d1 migrations apply limitless-site --remote
-- It only adds a table: nothing existing is renamed, changed or dropped.

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  detail TEXT,
  source TEXT NOT NULL DEFAULT 'Manual',      -- where it came from: Manual, Money, Website shop, Compliance, Audit app, Jobs, People
  job_id TEXT,                                -- the job it belongs to, if any (text, so it can hold the audit app's job id)
  priority TEXT NOT NULL DEFAULT 'planned' CHECK (priority IN ('urgent','soon','planned','waiting')),   -- "done" is the status, not a priority
  due_at TEXT,                                -- YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ
  chase_at TEXT,                              -- waiting tasks: the date to chase; turns red if not answered by then (later phase)
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  auto_rule TEXT,                             -- set by the automatic rules (a later phase); NULL for tasks made by hand
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  done_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_job ON tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_tasks_auto ON tasks(auto_rule, job_id);
