-- PediScreen AI: Clinician Feedback System (Pages 1-2)
-- Feedback loops for AI outputs — structured, auditable clinician feedback
-- Run: supabase db push

-- Inferences table: stores each AI inference run for feedback linkage
CREATE TABLE IF NOT EXISTS public.inferences (
    inference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id TEXT NOT NULL,
    screening_id TEXT,
    input_hash TEXT,
    result_summary TEXT,
    result_risk TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inferences_case_id ON public.inferences (case_id);
CREATE INDEX IF NOT EXISTS idx_inferences_screening_id ON public.inferences (screening_id);
CREATE INDEX IF NOT EXISTS idx_inferences_created_at ON public.inferences (created_at DESC);

-- Clinician feedback table: structured feedback tied to inference IDs
-- clinician_id references auth.users(id) when using Supabase Auth
CREATE TABLE IF NOT EXISTS public.clinician_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id TEXT NOT NULL,
    inference_id UUID NOT NULL,
    clinician_id UUID NOT NULL,
    provided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('correction', 'rating', 'comment')),
    corrected_risk TEXT CHECK (corrected_risk IN ('low', 'monitor', 'refer', 'on_track', 'high')),
    corrected_summary TEXT,
    rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    clinician_notes TEXT,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT fk_inference FOREIGN KEY (inference_id) REFERENCES public.inferences(inference_id)
);

-- Note: clinician_id FK to auth.users(id) — Supabase Auth provides auth.users
-- For projects without Supabase Auth, create public.users or use clinician_id as UUID without FK
-- ALTER TABLE public.clinician_feedback ADD CONSTRAINT fk_clinician
--   FOREIGN KEY (clinician_id) REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_clinician_feedback_inference_id ON public.clinician_feedback (inference_id);
CREATE INDEX IF NOT EXISTS idx_clinician_feedback_case_id ON public.clinician_feedback (case_id);
CREATE INDEX IF NOT EXISTS idx_clinician_feedback_provided_at ON public.clinician_feedback (provided_at DESC);
