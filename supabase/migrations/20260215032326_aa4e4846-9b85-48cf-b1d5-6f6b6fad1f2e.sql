
-- Edge function invocation metrics table
CREATE TABLE public.edge_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handler text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  latency_ms integer,
  error_code text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for last-hour queries
CREATE INDEX idx_edge_metrics_created_at ON public.edge_metrics (created_at DESC);
CREATE INDEX idx_edge_metrics_handler ON public.edge_metrics (handler);

-- Enable RLS
ALTER TABLE public.edge_metrics ENABLE ROW LEVEL SECURITY;

-- Public read for dashboard, insert from edge functions (service role)
CREATE POLICY "Anyone can read metrics"
  ON public.edge_metrics FOR SELECT USING (true);

CREATE POLICY "Anyone can insert metrics"
  ON public.edge_metrics FOR INSERT WITH CHECK (true);
