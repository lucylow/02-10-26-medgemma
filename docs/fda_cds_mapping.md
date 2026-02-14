# FDA CDS Exemption Mapping — PediScreen AI

**Note:** This is a mapping exercise (how our design meets the criteria). It is not legal approval. For production and regulatory filings, consult legal counsel.

PediScreen is designed to operate as CDS for HCPs. The human clinician holds final decision-making authority.

---

## Line-by-Line Mapping to FDA CDS Exemption Criteria

Adapted from 21st-Century Cures / FDA guidance on CDS.

| Criterion | Required Behavior | How PediScreen Implements It (Evidence) |
|-----------|-------------------|----------------------------------------|
| **A — HCP review (support, not replace)** | Output must assist a healthcare professional (HCP) who can independently review basis for recommendations. | • UI always labels AI output as "Draft (AI-Assisted)" with the draft disclaimer.<br>• Clinician review page (`ClinicianReview` component) requires explicit edits and sign-off before finalization.<br>• Audit log records draft → patched → finalized with actor IDs and timestamps.<br>• **Show in submission:** Screenshots of the draft page with banner + sign-off input; sample audit log rows. |
| **B — Basis for recommendations (transparency)** | The HCP must be able to independently review the basis (data and logic) for the advice. | • `key_evidence` block with itemized evidence: scores, parent quotes (redacted), image findings.<br>• `model_evidence` block with provenance: model id, prompt hash, summary of model reasoning (truncated).<br>• Explainability heatmap for images accessible in the review UI.<br>• **Show in submission:** Sample report JSON showing evidence + provenance; explainability screenshot. |
| **C — Independent HCP judgment (no sole decision-making)** | The HCP must have final authority — the software must not make autonomous clinical decisions or force workflow without clinician confirmation. | • `approve` endpoint requires clinician credentials and a sign-off note (non-automatable).<br>• No automated EHR writes happen without clinician approval (EHR push is gated by `send_to_ehr` flag and requires clinician token).<br>• **Show in submission:** API flow diagram with "Human sign-off required" gating EHR export. |
| **D — Imaging / signals (if applicable)** | If imaging is processed (e.g., MedSigLIP), the output must still be transparent and for HCP use only. Additional controls/consent required. | • Images are optional; patients/parents consent specifically to image upload (`ConsentModal`).<br>• All image processing results are included as evidence with explainability overlays (heatmaps) and are labeled non-diagnostic.<br>• Logs record whether image processing occurred and store embedding provenance; image data retention is governed by retention policy.<br>• **Show in submission:** Consent modal screenshot and image explainability overlay, plus retention policy excerpt. |

---

## How to Show the Mapping in Your Submission (Deliverables)

1. **Include a 1-page table** with left column = regulatory criterion and right column = your feature + screenshot + link to code (lines).
2. **Attach sample JSON reports** and the `report_audit` rows as evidence.
3. **Add a short statement:**  
   *"PediScreen designed to operate as CDS for HCPs. Human clinician holds final decision-making authority."*  
   (Followed by: *"This mapping is for demonstration; seek legal counsel for a production determination."*)

---

## Code Pointers for Traceability

| Feature | File | Notes |
|---------|------|-------|
| Draft disclaimer | `backend/app/core/disclaimers.py`, `src/constants/disclaimers.ts` | `DISCLAIMER_DRAFT` |
| Clinician sign-off | `backend/app/api/reports.py` (approve endpoint) | Requires `require_clinician` |
| Audit log | `backend/app/api/reports.py`, `backend/app/services/audit.py` | `report_audit` collection |
| Evidence block | `backend/app/services/report_generator.py`, report schema | `key_evidence`, `model_evidence` |
| Consent modal | `src/components/pediscreen/ConsentModal.tsx` | Parent-facing consent before data collection |
| FDA mapper | `backend/app/services/fda_mapper.py` | `map_report_to_fda()` |
