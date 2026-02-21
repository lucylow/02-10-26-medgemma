# SI — System and Information Integrity (NIST 800-53 Rev.5)

## SI-4 System Monitoring

- **Implementation:** PSI (Population Stability Index) drift detection and alerts; fairness/bias metrics; anomaly detection on model outputs; observability pipeline (OpenTelemetry, Prometheus, Grafana).
- **Artifacts:** `backend/app/telemetry/psi.py`, `backend/app/telemetry/fairness.py`, `observability/otel-collector-config.yml`, drift/bias dashboards and alerting.

## SI-7 Software and Information Integrity

- **Implementation:** Signed container images where required; dependency pinning (requirements.txt, package-lock); CI checks for known vulnerabilities (Trivy, GitHub Actions).
- **Artifacts:** Dockerfiles, dependency files, CI workflows.

## SI-12 Information Handling and Retention

- **Implementation:** PHI handling per HIPAA; minimal retention; consent and DSR (data subject request) endpoints for access/deletion; data security plan in IRB materials.
- **Artifacts:** Consent router, DSR router, `irb/data_security_plan.md`, PHI guard and encryption.
