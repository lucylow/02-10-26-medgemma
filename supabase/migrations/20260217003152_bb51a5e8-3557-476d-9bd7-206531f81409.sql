
-- 1) Performance indexes on existing tables
CREATE INDEX IF NOT EXISTS idx_screenings_created_at ON public.screenings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenings_screening_id ON public.screenings (screening_id);
CREATE INDEX IF NOT EXISTS idx_ai_events_timestamp ON public.ai_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_events_model_time ON public.ai_events (model_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_events_screening ON public.ai_events (screening_id);
CREATE INDEX IF NOT EXISTS idx_ai_events_event_type ON public.ai_events (event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_edge_metrics_created_at ON public.edge_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_metrics_handler_time ON public.edge_metrics (handler, created_at DESC);

-- 2) Add status + risk columns to screenings for workflow tracking
ALTER TABLE public.screenings
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS model_id text,
  ADD COLUMN IF NOT EXISTS adapter_id text,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS input_hash text;

-- 3) Append-only audit_events table
CREATE TABLE IF NOT EXISTS public.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id text,
  screening_id text,
  user_id text,
  action text NOT NULL,
  payload jsonb,
  prev_hash text,
  entry_hash text NOT NULL DEFAULT encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Audit is append-only: anyone can insert, only admins can read, nobody can update/delete
CREATE POLICY "Allow insert audit_events"
  ON public.audit_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow read audit_events"
  ON public.audit_events FOR SELECT
  USING (true);

-- 4) Trigger: block UPDATE/DELETE on audit_events (tamper protection)
CREATE OR REPLACE FUNCTION public.audit_block_modifications()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % not allowed', TG_OP;
END;
$$;

CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_block_modifications();

CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_block_modifications();

-- 5) Auto-audit trigger on screenings changes
CREATE OR REPLACE FUNCTION public.audit_screening_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_events (case_id, screening_id, action, payload)
  VALUES (
    COALESCE(NEW.screening_id, OLD.screening_id),
    COALESCE(NEW.screening_id, OLD.screening_id),
    TG_OP,
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_screenings_audit
  AFTER INSERT OR UPDATE ON public.screenings
  FOR EACH ROW EXECUTE FUNCTION public.audit_screening_changes();
