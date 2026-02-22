
-- Tighten screenings INSERT: require authenticated user
DROP POLICY IF EXISTS "Authenticated insert screenings" ON public.screenings;
CREATE POLICY "Authenticated users insert screenings" ON public.screenings
  FOR INSERT TO authenticated
  WITH CHECK (
    -- User must be authenticated (auth.uid() is not null is implicit with TO authenticated)
    -- Allow service role and edge functions to also insert
    auth.uid() IS NOT NULL
  );

-- edge_metrics and embedding_stats are system telemetry tables written by edge functions
-- via service_role key. The permissive INSERT is intentional and required.
-- Document this with comments but no policy change needed.
COMMENT ON POLICY "Anyone can insert metrics" ON public.edge_metrics IS 
  'Intentionally permissive: edge functions write telemetry via service_role key';
COMMENT ON POLICY "Allow insert embedding_stats" ON public.embedding_stats IS 
  'Intentionally permissive: PSI drift worker writes stats via service_role key';
