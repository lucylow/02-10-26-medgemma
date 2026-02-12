-- PediScreen AI: screenings table for Supabase backend
-- Run this in Supabase SQL editor or via: supabase db push

-- Enable pgcrypto for gen_random_uuid if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Screenings table
CREATE TABLE IF NOT EXISTS public.screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id text UNIQUE NOT NULL,
  child_age_months int NOT NULL,
  domain text,
  observations text,
  image_path text,  -- path in storage (uploads/<...>) or NULL
  report jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_screenings_screening_id ON public.screenings (screening_id);
CREATE INDEX IF NOT EXISTS idx_screenings_created_at ON public.screenings (created_at DESC);

-- RLS: For production, enable Row Level Security and create policies.
-- For local dev you can leave RLS off and rely on service-role key.
-- Example policies for authenticated users:
--
-- ALTER TABLE public.screenings ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Service role has full access" ON public.screenings
--   FOR ALL USING (true);  -- Service role bypasses RLS by default
--
-- CREATE POLICY "Authenticated users can read own screenings" ON public.screenings
--   FOR SELECT USING (auth.role() = 'authenticated');
--
-- CREATE POLICY "Authenticated users can insert screenings" ON public.screenings
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Storage bucket: Create "uploads" bucket in Supabase Dashboard > Storage
-- Recommended: public = false, use signed URLs for sharing
