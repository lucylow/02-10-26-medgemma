# PediScreen AI — EHR Integration Demo Storyboard

For judges and clinicians: end-to-end flow from consent to clinician review in EHR.

---

## Scene 1: Patient Consent

**Actor:** Parent / Guardian  
**Screen:** Consent modal before EHR export

**Copy (exact):**
> "By sharing this report to your electronic health record, you authorize transfer of pediatric screening information. Personal data will be stored in your health system's record. You may withdraw at any time."

**Action:** User clicks "I agree" or "Share with my doctor"

**Backend:** Consent recorded in `consent_records`; FHIR Consent resource created and bundled.

---

## Scene 2: AI Inference

**Actor:** CHW / Clinician  
**Screen:** PediScreen AI screening form and results

**Flow:**
1. Enter child age, observations, optional questionnaire scores
2. Optional: upload image (drawing, activity)
3. Submit → MedGemma inference
4. View risk level, clinical summary, evidence, recommendations

**Backend:** Inference run; draft report generated; human-in-the-loop state = REQUIRES_REVIEW

---

## Scene 3: Clinician Review & Sign-Off

**Actor:** Clinician  
**Screen:** Report draft with edit controls

**Flow:**
1. Review AI-generated summary and recommendations
2. Edit if needed (clinical_summary, recommendations)
3. Click "Approve" / "Sign off"
4. Report status → SIGNED_OFF / finalized

**Backend:** Audit log; PDF generated with clinician name

---

## Scene 4: EHR Export

**Actor:** Clinician  
**Screen:** Results page with "Send to EHR" button

**Flow:**
1. Click "Send to EHR"
2. If not authenticated: interstitial → SMART on FHIR launch
3. Select EHR (Epic, Cerner, etc.) or use launch context
4. OAuth flow → token obtained
5. FHIR Bundle (DocumentReference, QuestionnaireResponse, Observation) pushed to EHR
6. Success message: "Report sent to [EHR name]"

**Backend:** `POST /api/fhir/push_bundle`; audit `ehr_export`

---

## Scene 5: Clinician Review in EHR

**Actor:** Clinician  
**Screen:** EHR chart (Epic, Cerner, etc.)

**Flow:**
1. Open patient chart
2. Navigate to Documents / Clinical Notes
3. See "PediScreen AI Developmental Screening" document
4. Open PDF; review structured data (risk, evidence, recommendations)
5. Use as supporting documentation for care plan

**EHR Display:** DocumentReference with PDF; linked Observations in problem list or assessments

---

## Summary

| Step | Actor | Key Action |
|------|-------|------------|
| 1 | Parent | Consent for EHR sharing |
| 2 | CHW | Run screening; AI inference |
| 3 | Clinician | Review, edit, sign off |
| 4 | Clinician | Send to EHR (SMART OAuth + push) |
| 5 | Clinician | View report in EHR chart |
