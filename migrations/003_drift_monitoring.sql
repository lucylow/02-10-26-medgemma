-- Phase 2: Drift + PSI monitoring (hospital-grade observability)
-- Run against observability/Cloud SQL Postgres. Requires: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS embedding_baseline_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    bin_index INTEGER NOT NULL,
    lower_bound DOUBLE PRECISION,
    upper_bound DOUBLE PRECISION,
    expected_ratio DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embedding_baseline_model_feature
    ON embedding_baseline_stats (model_name, feature_name);

CREATE TABLE IF NOT EXISTS embedding_current_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    bin_index INTEGER NOT NULL,
    observed_ratio DOUBLE PRECISION NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embedding_current_model_window
    ON embedding_current_stats (model_name, window_start, window_end);

CREATE TABLE IF NOT EXISTS drift_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    psi_value DOUBLE PRECISION NOT NULL,
    drift_level TEXT CHECK (drift_level IN ('none', 'moderate', 'high')),
    window_start TIMESTAMPTZ,
    window_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drift_metrics_model_created
    ON drift_metrics (model_name, created_at DESC);
