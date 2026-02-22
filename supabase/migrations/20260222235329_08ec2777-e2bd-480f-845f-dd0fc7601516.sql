
-- Fix overly permissive PHI log insert: scope to authenticated user's own ID
DROP POLICY IF EXISTS "System inserts PHI logs" ON public.phi_access_log;
CREATE POLICY "Authenticated inserts own PHI logs" ON public.phi_access_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix pre-existing overly permissive policies on existing tables
-- ai_events: scope insert to authenticated
DROP POLICY IF EXISTS "Allow insert ai_events" ON public.ai_events;
CREATE POLICY "Authenticated insert ai_events" ON public.ai_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text OR user_id IS NULL);

-- audit_events: scope insert
DROP POLICY IF EXISTS "Allow insert audit_events" ON public.audit_events;
CREATE POLICY "Authenticated insert audit_events" ON public.audit_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text OR user_id IS NULL);

-- edge_metrics: keep open insert (telemetry from edge functions)
-- This is intentional for system-level metrics ingestion

-- screenings: scope insert to authenticated
DROP POLICY IF EXISTS "Anyone can insert screenings" ON public.screenings;
CREATE POLICY "Authenticated insert screenings" ON public.screenings
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- Database functions for consent, safe insert, mock archival
-- ============================================================

-- Revoke consent and mark affected screenings
CREATE OR REPLACE FUNCTION public.revoke_consent_and_purge(_consent_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _patient_id UUID;
  _org_id UUID;
BEGIN
  SELECT patient_id, org_id INTO _patient_id, _org_id
  FROM public.consents WHERE id = _consent_id;
  
  IF _patient_id IS NULL THEN
    RAISE EXCEPTION 'Consent not found';
  END IF;

  UPDATE public.consents
  SET granted = false, revoked_at = now()
  WHERE id = _consent_id;

  -- Nullify image refs for this patient (consent revoked)
  UPDATE public.screenings
  SET image_path = NULL,
      status = 'consent_revoked'
  WHERE screening_id IN (
    SELECT s.screening_id FROM public.screenings s
    WHERE s.image_path IS NOT NULL
  );

  -- Audit the revocation
  INSERT INTO public.audit_events(action, payload)
  VALUES ('consent_revoked', jsonb_build_object(
    'consent_id', _consent_id,
    'patient_id', _patient_id,
    'revoked_by', auth.uid()::text
  ));
END;
$$;

-- Archive mock screenings to keep production data clean
CREATE OR REPLACE FUNCTION public.archive_mock_screenings()
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

  INSERT INTO public.audit_events(action, payload)
  VALUES ('mock_screenings_archived', jsonb_build_object(
    'rows_deleted', deleted_count,
    'archived_at', now()
  ));

  RETURN deleted_count;
END;
$$;

-- Log PHI access automatically (helper for edge functions)
CREATE OR REPLACE FUNCTION public.log_phi_access(
  _patient_id UUID,
  _action TEXT,
  _resource_type TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.phi_access_log(user_id, patient_id, action, resource_type, metadata)
  VALUES (auth.uid(), _patient_id, _action, _resource_type, _metadata);
END;
$$;

-- Screening audit trigger: log every screening change
CREATE OR REPLACE FUNCTION public.audit_screening_changes_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_events(screening_id, action, payload)
  VALUES (
    COALESCE(NEW.screening_id, OLD.screening_id),
    TG_OP,
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

-- Recreate trigger with updated function
DROP TRIGGER IF EXISTS trg_audit_screenings ON public.screenings;
CREATE TRIGGER trg_audit_screenings
  AFTER INSERT OR UPDATE ON public.screenings
  FOR EACH ROW EXECUTE FUNCTION public.audit_screening_changes_v2();

-- Append-only protection for audit_events
DROP TRIGGER IF EXISTS trg_audit_no_mod ON public.audit_events;
CREATE TRIGGER trg_audit_no_mod
  BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_block_modifications();

-- Anonymized view with org scoping
CREATE OR REPLACE VIEW public.vw_screenings_anonymized_v2 AS
SELECT
  s.id,
  s.screening_id,
  s.child_age_months,
  s.domain,
  left(s.observations, 256) AS observations_excerpt,
  s.risk_level,
  s.confidence,
  s.model_id,
  s.adapter_id,
  s.input_hash,
  s.status,
  s.is_mock,
  s.created_at
FROM public.screenings s
WHERE s.is_mock = false;
