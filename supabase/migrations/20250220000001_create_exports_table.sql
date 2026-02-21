-- Phase 1: Export jobs table for async CSV/JSON telemetry exports
-- Repository: lucylow/02-10-26-medgemma

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  created_by TEXT,
  filters JSONB DEFAULT '{}'::jsonb,
  format TEXT NOT NULL DEFAULT 'csv',
  status TEXT NOT NULL DEFAULT 'pending',
  result_url TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exports_org_created ON public.exports(org_id, created_at);

COMMENT ON TABLE public.exports IS 'Background export jobs for telemetry (CSV/JSON); result_url is presigned short-lived.';
