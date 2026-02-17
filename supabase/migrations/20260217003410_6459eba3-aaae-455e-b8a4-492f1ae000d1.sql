
-- Fix: recreate view with security_invoker to use caller's RLS context
DROP VIEW IF EXISTS public.vw_screenings_anonymized;

CREATE VIEW public.vw_screenings_anonymized
WITH (security_invoker = true)
AS
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
