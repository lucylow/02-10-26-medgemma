-- HIPAA-grade PHI isolation: tokenized patient identity store
-- PHI lives only in this table (isolated VPC/subnet); AI/telemetry see only UUID token.

-- UUID generation (uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS patient_identity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_patient_id TEXT UNIQUE,
    encrypted_blob BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_identity_external_id
    ON patient_identity (external_patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_identity_created
    ON patient_identity (created_at DESC);

COMMENT ON TABLE patient_identity IS 'HIPAA: PHI stored under envelope encryption; only token (id) crosses to AI/telemetry.';

-- Full audit trail for PHI access (21 CFR Part 11 / HIPAA)
CREATE TABLE IF NOT EXISTS phi_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    action TEXT NOT NULL,
    patient_token UUID NOT NULL,
    resource_type TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phi_access_log_patient
    ON phi_access_log (patient_token, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_phi_access_log_user
    ON phi_access_log (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_phi_access_log_timestamp
    ON phi_access_log (timestamp DESC);

COMMENT ON TABLE phi_access_log IS 'Audit trail for every PHI access; required for HIPAA and FDA SaMD.';
