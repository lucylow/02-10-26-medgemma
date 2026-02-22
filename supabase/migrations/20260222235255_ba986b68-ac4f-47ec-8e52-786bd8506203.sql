
-- Pseudonymized patient identity (HIPAA: only token crosses to AI/telemetry)
CREATE TABLE IF NOT EXISTS public.patient_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_hash TEXT UNIQUE NOT NULL,
  encrypted_payload BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members see own patients" ON public.patient_identity
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org(auth.uid()));

CREATE POLICY "Clinicians insert patients" ON public.patient_identity
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.get_user_org(auth.uid())
    AND (public.has_role(auth.uid(), 'clinician') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'chw'))
  );

-- Consent tracking table
CREATE TABLE IF NOT EXISTS public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patient_identity(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members see own consents" ON public.consents
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org(auth.uid()));

CREATE POLICY "Authorized users manage consents" ON public.consents
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.get_user_org(auth.uid())
    AND (public.has_role(auth.uid(), 'clinician') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'chw'))
  );

-- PHI access log for regulatory compliance
CREATE TABLE IF NOT EXISTS public.phi_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  patient_id UUID REFERENCES public.patient_identity(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.phi_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins/auditors can read PHI access logs
CREATE POLICY "Admins read PHI logs" ON public.phi_access_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System inserts PHI logs" ON public.phi_access_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_identity_org ON public.patient_identity(org_id);
CREATE INDEX IF NOT EXISTS idx_consents_patient ON public.consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_consents_org_purpose ON public.consents(org_id, purpose);
CREATE INDEX IF NOT EXISTS idx_phi_access_log_patient ON public.phi_access_log(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phi_access_log_user ON public.phi_access_log(user_id, created_at DESC);
