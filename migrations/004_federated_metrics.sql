-- Phase 3: Federated learning metrics (round-level telemetry)
CREATE TABLE IF NOT EXISTS federated_round_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_number INTEGER NOT NULL,
    global_loss DOUBLE PRECISION,
    global_accuracy DOUBLE PRECISION,
    participating_clients INTEGER,
    dp_noise_multiplier DOUBLE PRECISION,
    secure_aggregation BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_federated_round_created
    ON federated_round_metrics (created_at DESC);
