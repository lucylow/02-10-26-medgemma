# Data Retention Policy

**Document Version:** 1.0  
**Last Updated:** 2026-02-14

---

## 1. Retention Rules

| Data Type | Default Retention | Extendable | Notes |
|-----------|-------------------|------------|-------|
| **Raw images** (consented) | 30 days | Yes (clinician request) | Stored only when explicit consent; purge via tasks/purge_expired.py |
| **Embeddings** | 5 years (configurable) | Yes | Pseudonymized; used for inference audit |
| **Audit logs** | 7 years | No | Immutable; legal/compliance requirement |
| **Finalized clinical reports** | 7–10 years | Per local regulations | Per jurisdiction |
| **Draft reports** | RETENTION_DAYS (default 365) | Configurable | Purged by retention worker |
| **Consent records** | 7 years | No | Legal obligation |

---

## 2. Automated Purge

- **Script:** `backend/scripts/run_retention.py` and `tasks/purge_expired.py`
- **Schedule:** Cron / Cloud Scheduler (e.g. daily)
- **Actions:**
  - Delete or move raw images to cold storage (encrypted)
  - Pseudonymize records scheduled for deletion
  - Record `erasure_event` in audit log
  - Set `deleted_at` on soft-deleted records

---

## 3. Configuration

```bash
RETENTION_DAYS=365          # Draft reports
RAW_IMAGE_RETENTION_DAYS=30 # Raw images (if consented)
EMBEDDING_RETENTION_DAYS=1825  # 5 years
AUDIT_RETENTION_DAYS=2555   # 7 years
```

---

## 4. Dry-Run

Before production purge, run dry-run to preview:

```bash
python tasks/purge_expired.py --dry-run
```
