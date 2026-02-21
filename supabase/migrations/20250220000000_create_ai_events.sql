-- Phase 1: Enhanced telemetry — ai_events table (full event envelope)
-- Repository: lucylow/02-10-26-medgemma

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.ai_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  client_id TEXT DEFAULT NULL,
  user_id TEXT DEFAULT NULL,
  request_id TEXT NOT NULL,
  trace_id TEXT DEFAULT NULL,
  endpoint TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT DEFAULT NULL,
  adapter_id TEXT DEFAULT NULL,
  input_size_bytes BIGINT DEFAULT NULL,
  output_size_bytes BIGINT DEFAULT NULL,
  latency_ms INTEGER,
  compute_ms INTEGER DEFAULT NULL,
  cost_usd NUMERIC(18,6) DEFAULT 0,
  success BOOLEAN DEFAULT TRUE,
  error_code TEXT DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  fallback_used BOOLEAN DEFAULT FALSE,
  fallback_reason TEXT DEFAULT NULL,
  fallback_model TEXT DEFAULT NULL,
  provenance JSONB DEFAULT '{}'::jsonb,
  tags JSONB DEFAULT '{}'::jsonb,
  consent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_events_org_created_at ON public.ai_events(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_events_request_id ON public.ai_events(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_events_model_created_at ON public.ai_events(model_name, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_events_user_id ON public.ai_events(user_id);

COMMENT ON TABLE public.ai_events IS 'Phase 1 telemetry: per-inference event envelope (model, latency, cost, fallback). No PHI in error_message/provenance.';
