
-- Rich AI telemetry events table
CREATE TABLE public.ai_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'inference',
  timestamp timestamptz NOT NULL DEFAULT now(),
  
  -- Context
  org_id text,
  user_id text,
  case_id text,
  screening_id text,
  
  -- Model info
  model_provider text,
  model_id text,
  adapter_id text,
  model_version text,
  
  -- Request metadata
  input_types text[] DEFAULT '{}',
  input_hash text,
  prompt_tokens integer,
  
  -- Response metadata
  risk_level text,
  confidence numeric(5,4),
  fallback boolean NOT NULL DEFAULT false,
  fallback_reason text,
  latency_ms integer,
  status_code integer DEFAULT 200,
  error_code text,
  
  -- Cost
  cost_estimate_usd numeric(10,6),
  
  -- Observability
  region text,
  agent text,
  trace_id text,
  idempotency_key text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Performance indexes
CREATE INDEX idx_ai_events_timestamp ON public.ai_events (timestamp DESC);
CREATE INDEX idx_ai_events_model_id ON public.ai_events (model_id);
CREATE INDEX idx_ai_events_event_type ON public.ai_events (event_type);
CREATE INDEX idx_ai_events_screening_id ON public.ai_events (screening_id);
CREATE INDEX idx_ai_events_fallback ON public.ai_events (fallback) WHERE fallback = true;
CREATE INDEX idx_ai_events_status ON public.ai_events (status_code) WHERE status_code >= 400;

-- Enable RLS
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;

-- Public read/insert for edge functions (service role bypasses RLS anyway)
CREATE POLICY "Allow insert ai_events" ON public.ai_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read ai_events" ON public.ai_events FOR SELECT USING (true);
