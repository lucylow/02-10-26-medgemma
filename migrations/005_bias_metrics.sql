-- Phase 4: Bias & fairness monitoring (FPR, FNR, demographic parity, equalized odds)
CREATE TABLE IF NOT EXISTS fairness_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL,
    protected_attribute TEXT NOT NULL,
    group_value TEXT NOT NULL,
    false_positive_rate DOUBLE PRECISION,
    false_negative_rate DOUBLE PRECISION,
    demographic_parity DOUBLE PRECISION,
    equalized_odds DOUBLE PRECISION,
    window_start TIMESTAMPTZ,
    window_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fairness_metrics_model_created
    ON fairness_metrics (model_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fairness_metrics_attribute
    ON fairness_metrics (protected_attribute, group_value);
