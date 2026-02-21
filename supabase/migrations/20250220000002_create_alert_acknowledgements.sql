-- Phase 1: Alert acknowledgements (optional — for POST /api/telemetry/alerts/{id}/ack)
-- Repository: lucylow/02-10-26-medgemma

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.alert_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_fingerprint TEXT NOT NULL,
  org_id TEXT,
  acknowledged_by TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_ack_fingerprint ON public.alert_acknowledgements(alert_fingerprint);
