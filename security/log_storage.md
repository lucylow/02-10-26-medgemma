# Audit Log Storage & Retention

## Policy

- **Retention**: 7 years (configurable per jurisdiction).
- **Access**: auditor, security_admin only for full export; clinician for own patients (redacted).

## Storage Tiers

1. **Active**: DB table `audit_log` (entry_json, hmac, prev_hmac).
2. **Archive**: Encrypted object storage (GCS/S3) with object lock / WORM.
3. **Streaming**: Cloud Logging / ELK with restricted access.

## Object Lock

- Enable object-level immutability for final archived logs.
- Document in bucket policy / Terraform.

## Access Control

- `GET /admin/audit/search`: auditor, security_admin.
- `POST /admin/audit/export`: auditor; may require security_admin approval for PHI-containing export.
