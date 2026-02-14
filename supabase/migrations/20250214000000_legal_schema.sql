-- Legal compliance schema additions (PostgreSQL/Supabase)
-- For MongoDB deployments, these are reference; collections are created on first use.

-- Consent records (if using Postgres)
CREATE TABLE IF NOT EXISTS public.consent_records (
  id serial primary key,
  screening_id text,
  patient_id text,
  parent_name text,
  consent_given boolean,
  consent_scope jsonb,
  consent_method text,
  recorded_by text,
  recorded_at timestamptz default now()
);

-- Retention metadata (optional; MongoDB uses TTL or application logic)
CREATE TABLE IF NOT EXISTS public.retention_metadata (
  id serial primary key,
  object_type text,
  object_id text,
  expires_at timestamptz
);
