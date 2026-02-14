# PediScreen AI — User Personas

Minimal user personas for design and development decisions.

---

## 1. Community Health Worker (CHW) — "Amina"

**Age:** 34  
**Context:** Rural clinic, low connectivity, travels to homes and schools  
**Tech comfort:** Moderate; uses smartphone daily but limited Wi‑Fi

**Goals:**
- Conduct developmental screenings quickly during home visits
- Capture drawing and voice evidence without reliable internet
- Sync data later when back at clinic or on Wi‑Fi
- Get clear "monitor" vs "refer" guidance to share with families

**Pain points:**
- Spotty connectivity; needs offline-first capture
- Time pressure; needs simple, guided flows
- Must explain results to parents in plain language

**Design implications:**
- Offline queue with clear sync status
- Large touch targets; minimal typing
- Voice input for observations
- Parent-facing summary generation

---

## 2. Parent / Caregiver — "Luis"

**Age:** 29  
**Context:** Worried about child's speech development; first-time parent  
**Tech comfort:** Low–moderate; prefers voice over typing

**Goals:**
- Record concerns about child's development
- Understand screening results in non-clinical language
- Know what to do next (activities, when to see doctor)
- Feel reassured, not alarmed

**Pain points:**
- Medical jargon is confusing
- Anxiety about "what if something is wrong"
- Prefers voice input; typing on phone is tedious

**Design implications:**
- Parent-friendly language throughout
- Voice note option for observations
- Reassuring tone in results; actionable next steps
- Clear consent before any data sharing

---

## 3. Clinician — "Dr. Chen"

**Age:** 40  
**Context:** Developmental-behavioral pediatrician; reviews reports, signs off  
**Tech comfort:** High; uses EHR daily

**Goals:**
- Review AI draft efficiently
- Edit and override when needed
- Export to EHR (FHIR DocumentReference)
- Maintain audit trail (adapter_id, model_version, inference_ts)

**Pain points:**
- Needs concise evidence, not lengthy prose
- Must sign and finalize quickly
- Wants to see what changed (diff) when editing

**Design implications:**
- Side-by-side AI draft / editable final
- Inline diff highlights
- "Sign & Finalize" with name and reason
- Export to EHR button (mock for demo)
