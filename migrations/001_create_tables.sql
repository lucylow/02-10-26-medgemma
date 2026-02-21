-- migrations/001_create_tables.sql — Postgres-compatible schema for RQ orchestrator (cases, jobs, audits)
CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(128) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TYPE job_status AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(64) PRIMARY KEY,
  case_id VARCHAR(128) NOT NULL,
  status job_status DEFAULT 'PENDING',
  rq_id VARCHAR(128),
  payload JSONB,
  result JSONB,
  error_text TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_case_id ON jobs (case_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);

CREATE TABLE IF NOT EXISTS audits (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(64) NOT NULL,
  event VARCHAR(128) NOT NULL,
  payload JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audits_job_id ON audits (job_id);

-- Optional FK (uncomment if you want referential integrity; requires cases.case_id to exist first)
-- ALTER TABLE jobs ADD CONSTRAINT fk_jobs_case FOREIGN KEY (case_id) REFERENCES cases(case_id);
