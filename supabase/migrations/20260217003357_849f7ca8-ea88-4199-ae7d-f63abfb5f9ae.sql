
-- 1) Add is_mock flag + provenance to screenings & ai_events
ALTER TABLE public.screenings
  ADD COLUMN IF NOT EXISTS is_mock boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prompt_hash text,
  ADD COLUMN IF NOT EXISTS embedding_hash text;

ALTER TABLE public.ai_events
  ADD COLUMN IF NOT EXISTS is_mock boolean NOT NULL DEFAULT false;

-- 2) Add provenance fields to audit_events
ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS model_id text,
  ADD COLUMN IF NOT EXISTS adapter_id text,
  ADD COLUMN IF NOT EXISTS is_mock boolean NOT NULL DEFAULT false;

-- 3) Embedding drift stats table
CREATE TABLE IF NOT EXISTS public.embedding_stats (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  model_id text,
  adapter_id text,
  mean_norm float,
  std_norm float,
  n_samples int,
  psi_score float,
  meta jsonb
);

ALTER TABLE public.embedding_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert embedding_stats"
  ON public.embedding_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow read embedding_stats"
  ON public.embedding_stats FOR SELECT
  USING (true);

-- 4) Anonymized view for analysts (no raw observations/images, no mock data)
CREATE OR REPLACE VIEW public.vw_screenings_anonymized AS
SELECT
  id,
  screening_id,
  child_age_months,
  domain,
  left(observations, 128) AS observations_excerpt,
  risk_level,
  model_id,
  adapter_id,
  confidence,
  input_hash,
  status,
  created_at
FROM public.screenings
WHERE is_mock = false;

-- 5) Indexes for mock filtering and drift queries
CREATE INDEX IF NOT EXISTS idx_screenings_is_mock ON public.screenings (is_mock);
CREATE INDEX IF NOT EXISTS idx_ai_events_is_mock ON public.ai_events (is_mock);
CREATE INDEX IF NOT EXISTS idx_embedding_stats_recorded ON public.embedding_stats (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_embedding_stats_model ON public.embedding_stats (model_id, recorded_at DESC);

-- 6) Function to archive/purge mock screenings
CREATE OR REPLACE FUNCTION public.purge_mock_screenings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.screenings WHERE is_mock = true;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO public.audit_events (action, payload)
  VALUES ('mock_data_purged', jsonb_build_object('rows_deleted', deleted_count, 'purged_at', now()));
  
  RETURN deleted_count;
END;
$$;

-- 7) Function to archive mock ai_events
CREATE OR REPLACE FUNCTION public.purge_mock_ai_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.ai_events WHERE is_mock = true;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO public.audit_events (action, payload)
  VALUES ('mock_events_purged', jsonb_build_object('rows_deleted', deleted_count, 'purged_at', now()));
  
  RETURN deleted_count;
END;
$$;
