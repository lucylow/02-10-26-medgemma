-- Raspberry Pi 5 Edge AI metrics table
-- Stores the latest heartbeat per device for EdgeDashboard.

CREATE TABLE IF NOT EXISTS public.edge_pi_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  model_loaded text,
  cpu numeric,
  memory numeric,
  inference_time_ms integer,
  queue_length integer,
  uptime text,
  last_screening text,
  last_heartbeat_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_pi_metrics_heartbeat
  ON public.edge_pi_metrics (last_heartbeat_at DESC);

ALTER TABLE public.edge_pi_metrics ENABLE ROW LEVEL SECURITY;

-- Public read for dashboards; Edge Functions insert via service role.
CREATE POLICY "Anyone can read edge_pi_metrics"
  ON public.edge_pi_metrics FOR SELECT USING (true);

CREATE POLICY "Anyone can insert edge_pi_metrics"
  ON public.edge_pi_metrics FOR INSERT WITH CHECK (true);

