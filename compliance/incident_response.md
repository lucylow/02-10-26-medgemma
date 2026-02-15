# Incident Response Playbook

**Document Version:** 1.0  
**Last Updated:** 2026-02-14

---

## 1. Detection

- Monitor audit logs, error rates, anomaly detection
- Alerts: failed auth, bulk export, unusual access patterns

---

## 2. Containment

- Isolate affected systems
- Revoke compromised credentials
- Preserve evidence (logs, snapshots)

---

## 3. Notification

### HIPAA Breach

- **Internal:** Within 60 days (verify current statute)
- **HHS:** Per breach size thresholds
- **Individuals:** Without unreasonable delay

### GDPR

- **Supervisory authority:** 72 hours of awareness
- **Data subjects:** Without undue delay if high risk

---

## 4. Roles

| Role | Responsibility |
|------|----------------|
| CISO | Lead response, coordinate |
| Legal | Breach determination, notification |
| PR | External communications |

---

## 5. Templates

See `compliance/notifications/` for HIPAA and GDPR notification templates.
