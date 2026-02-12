-- PediScreen AI: image embeddings for longitudinal tracking (PostgreSQL)
-- Use this if you use Postgres. For MongoDB, the image_embeddings collection
-- is created automatically on first insert.

-- Enable pgvector extension (required for vector type)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.image_embeddings (
  id serial primary key,
  screening_id text not null,
  report_id text,
  model text not null,
  embedding vector(768),
  metadata jsonb,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_image_embeddings_screening_id ON public.image_embeddings (screening_id);
CREATE INDEX IF NOT EXISTS idx_image_embeddings_report_id ON public.image_embeddings (report_id);
CREATE INDEX IF NOT EXISTS idx_image_embeddings_created_at ON public.image_embeddings (created_at DESC);
