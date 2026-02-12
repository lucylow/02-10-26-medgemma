-- PediScreen AI: reports and report_audit tables (PostgreSQL/Supabase)
-- Use this if you migrate from MongoDB to Postgres. For MongoDB, collections
-- are created automatically; no DDL needed.

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id serial primary key,
  report_id text unique not null,
  screening_id text,
  patient_info jsonb,
  draft_json jsonb,
  final_json jsonb,
  status text default 'draft',  -- draft | finalized
  clinician_id text,
  clinician_signed_at timestamptz,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_reports_report_id ON public.reports (report_id);
CREATE INDEX IF NOT EXISTS idx_reports_screening_id ON public.reports (screening_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports (created_at DESC);

-- Audit trail
CREATE TABLE IF NOT EXISTS public.report_audit (
  id serial primary key,
  report_id text not null,
  action text not null,  -- created, edited, signed, exported
  actor text,
  payload jsonb,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_report_audit_report_id ON public.report_audit (report_id);
