# Change Control Procedure

**Product:** PediScreen AI  
**Version:** v1.0  
**Date:** Feb 2026  
**Alignment:** FDA 21 CFR Part 820.30(b), 820.40, 820.70(i); IEC 62304.

---

## 1. Scope

All changes that may affect safety, performance, or regulatory compliance of PediScreen AI are subject to change control. This includes:

- Software (application, model code, inference pipeline)
- Model weights or thresholds
- Configuration affecting clinical behavior (e.g. confidence thresholds, drift alert levels)
- Infrastructure and deployment that affect availability or security of PHI/AI services
- Labeling, IFU, and user-facing documentation

---

## 2. Process

1. **Request:** Change described (what, why, impact on risk and performance).
2. **Review:** Designated reviewer(s) assess impact on safety, performance, security, and regulatory status.
3. **Approval:** Approval required before implementation for changes that affect:
   - Clinical logic or model behavior
   - PHI handling or security
   - Labeling or IFU
4. **Implementation:** Changes implemented in controlled environment; version and build identified.
5. **Verification/Validation:** Per risk; re-validation when change could affect performance or safety.
6. **Release:** Deployed per release procedure; release notes and version documented.
7. **Records:** Change record retained (requester, reviewer, approval, version, date).

---

## 3. Classification

- **Major:** Affects clinical performance, safety, or regulatory submission → full review, validation, and approval.
- **Minor:** No impact on clinical logic or safety (e.g. logging, non-clinical UI) → simplified review and record.
- **Patch:** Emergency fix for critical defect → expedited review; post-implementation review and record.

---

## 4. Traceability

- Source code and config under version control (e.g. git); tags/releases map to build and deployment.
- Risk management and clinical evaluation updated when changes affect hazards or performance claims.
- Post-market surveillance and cybersecurity plans updated when architecture or data flows change.
