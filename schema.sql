-- IDS Operations Portal — Supabase Schema
-- Run this in the Supabase SQL Editor (Database → SQL Editor → New query)

-- ── Tender Monitoring ────────────────────────────────────────────────────────

CREATE TABLE tenders (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number       TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  method       TEXT,
  buy_date     DATE,
  deadline     DATE,
  fee          NUMERIC,
  seen_date    DATE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scraper_log (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_time       TIMESTAMPTZ NOT NULL,
  tenders_found  INTEGER NOT NULL DEFAULT 0,
  new_tenders    INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Contacts ─────────────────────────────────────────────────────────────────

CREATE TABLE contractors (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Project Management ────────────────────────────────────────────────────────

CREATE TABLE templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE template_tasks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id     UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phase           TEXT NOT NULL,
  duration_days   INTEGER,
  sequence_order  INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE template_task_predecessors (
  task_id             UUID NOT NULL REFERENCES template_tasks(id) ON DELETE CASCADE,
  predecessor_task_id UUID NOT NULL REFERENCES template_tasks(id) ON DELETE CASCADE,
  lag_days            INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (task_id, predecessor_task_id)
);

CREATE TABLE projects (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT NOT NULL,
  client_name    TEXT NOT NULL,
  salesforce_id  TEXT,
  contractor_id  UUID REFERENCES contractors(id),
  awarded_date   DATE,
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_plans (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id   UUID REFERENCES templates(id),
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  started_date  DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_tasks (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_plan_id    UUID NOT NULL REFERENCES project_plans(id) ON DELETE CASCADE,
  template_task_id   UUID REFERENCES template_tasks(id),
  name               TEXT NOT NULL,
  phase              TEXT NOT NULL,
  planned_start      DATE,
  planned_finish     DATE,
  actual_start       DATE,
  actual_finish      DATE,
  status             TEXT NOT NULL DEFAULT 'not_started',
  notes              TEXT,
  revision_count     INTEGER NOT NULL DEFAULT 0,
  assigned_to_type   TEXT,   -- 'internal' | 'subcontractor'
  contractor_id      UUID REFERENCES contractors(id),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reminders (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_task_id  UUID REFERENCES project_tasks(id),
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by          TEXT,
  message          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Keep-alive (prevents Supabase free tier pause) ────────────────────────────
-- Add a daily cron in Supabase Dashboard → Database → Cron Jobs:
-- Schedule: 0 12 * * *
-- Command:  SELECT 1;
