# PediScreen AI — FHIR Terminology Mapping

All exported FHIR resources use standard codes where applicable.

## Risk Level

| PediScreen Value | FHIR Code System | Code | Display |
|-----------------|------------------|------|---------|
| low | http://ai.pediscreen.org | low | Low risk |
| medium | http://ai.pediscreen.org | medium | Medium risk |
| high | http://ai.pediscreen.org | high | High risk |
| unknown | http://ai.pediscreen.org | unknown | Unknown |

## Document Types

| Resource | System | Code | Display |
|----------|--------|------|---------|
| DocumentReference | http://loinc.org | 56962-1 | PediScreen AI Report |
| DiagnosticReport | http://loinc.org | 56962-1 | Developmental screening |

## Observation Categories

| Category | System | Code |
|----------|--------|------|
| Assessment | http://terminology.hl7.org/CodeSystem/observation-category | assessment |
| Survey | http://terminology.hl7.org/CodeSystem/observation-category | survey |

## Age / Demographics

| Field | System | Code | Notes |
|-------|--------|------|-------|
| Age (months) | http://loinc.org | 30525-0 | Age in months |
| Birth date | Patient.birthDate | — | ISO date |

## Extensions

| Extension | URL | Type | Purpose |
|-----------|-----|------|---------|
| Confidence | http://pediscreen.ai/fhir/StructureDefinition/confidence | decimal | AI confidence 0–1 |
| AI inference meta | http://pediscreen.ai/fhir/StructureDefinition/ai-inference-meta | string | Model, adapter, input_hash |

## Consent Scope

| Scope | System | Code |
|-------|--------|------|
| Patient privacy | http://terminology.hl7.org/CodeSystem/consentscope | patient-privacy |
