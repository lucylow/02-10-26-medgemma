# PediScreen AI — User Journeys

Prioritized user journeys with flow diagrams, pain points, and design opportunities.

---

## Journey 1: CHW Conducts Visit → Capture → Monitor → Sync Later

**Persona:** Amina (CHW)  
**Goal:** Screen a child during home visit, capture drawing & voice, get "monitor" result, save and sync later

### Steps (8)

1. **Open app** — Amina opens PediScreen on phone
2. **Start screening** — Taps "Start Evidence Collection" on Home
3. **Enter child info** — Age (24 months), domain (Communication)
4. **Capture drawing** — Child draws; Amina captures photo of drawing
5. **Add observations** — Uses voice note: "Uses few words, points to communicate"
6. **Submit** — Taps "Analyze & Generate Report"
7. **View results** — Sees "Monitor" risk; parent-friendly summary
8. **Sync later** — Offline; case queued; syncs when back at clinic

### Pain Points
- No connectivity during visit → must work offline
- Voice input not available → typing on small screen
- Queue status unclear → doesn't know if data will sync

### Design Opportunities
- Offline banner + queue icon with count
- Voice record + auto-transcribe for observations
- Manual sync button in Settings; "Retry" per case
- Case status badge: Pending / Syncing / Synced / Failed

---

## Journey 2: Parent Uses App at Home → Voice Concern → Parent Guidance

**Persona:** Luis (Parent)  
**Goal:** Record concern about child's speech, receive parent-facing guidance, opt to send to CHW with consent

### Steps (7)

1. **Open app** — Luis opens PediScreen at home
2. **Start screening** — Taps "Start Evidence Collection"
3. **Consent** — Sees consent modal; chooses embeddings-only (recommended)
4. **Enter age** — 24 months
5. **Record voice** — Records: "He says maybe 10 words, doesn't combine two words"
6. **Submit** — Analysis runs
7. **View results** — Parent-friendly card: "Your child shows signs that should be monitored. Try these simple daily activities and check back in 2–3 months."

### Pain Points
- Consent language may be confusing
- No voice input → must type
- Wants to share with CHW but unclear how

### Design Opportunities
- Consent modal with clear "embeddings only (recommended)" vs "raw image"
- Voice record button with transcription preview
- "Share with CHW" CTA with consent
- Age-aware prompts (e.g., "Does the child use two-word phrases?" for 24 months)

---

## Journey 3: Clinician Reviews AI Draft → Edits → Signs → Exports

**Persona:** Dr. Chen (Clinician)  
**Goal:** Review AI draft, edit text, sign and finalize, produce PDF/FHIR for EHR

### Steps (6)

1. **Open clinician dashboard** — Sees list of pending cases
2. **Filter by risk** — Filters to "Refer" level
3. **Open case** — Clicks case; review screen opens
4. **Edit draft** — Side-by-side: AI draft (left) / editable (right); makes edits
5. **Sign & Finalize** — Clicks CTA; modal: enter name & reason; confirms
6. **Export** — Clicks "Attach to EHR"; FHIR payload generated (mock)

### Pain Points
- No inline diff when editing
- Sign-off flow may lack focus trap
- Export format (FHIR) not visible to user

### Design Opportunities
- Inline diff highlights for edits
- Focus trap in sign-off modal; keyboard confirmation
- Audit trail visible: adapter_id, model_version, inference_ts
- "Attach to EHR" exports DocumentReference; show success toast

---

## Flow Diagram (ASCII)

```
[Home] --> [Capture/Screening]
[Capture/Screening] --> [Consent Modal] (if first time / image)
[Consent Modal] --> [Capture/Screening]
[Capture/Screening] --> [Preview] (if image)
[Preview] --> [Retake] --> [Capture/Screening]
[Preview] --> [Use Image] --> [Questionnaire]
[Questionnaire] --> [Submit]
[Submit] --> [Inference Loading]
[Inference Loading] --> [Results]
[Results] --> [Caregiver View] | [Clinician View]
[Clinician View] --> [Clinician Review]
[Clinician Review] --> [Edit] --> [Sign & Finalize]
[Sign & Finalize] --> [Export to EHR]
```

---

## Summary

| Journey | Steps | Key Pain Points | Design Opportunities |
|---------|-------|-----------------|----------------------|
| CHW Visit | 8 | Offline, voice, queue visibility | Offline UX, voice input, sync status |
| Parent Home | 7 | Consent, voice, share | Consent clarity, voice, share CTA |
| Clinician Review | 6 | Diff, sign-off, export | Inline diff, focus trap, FHIR export |
