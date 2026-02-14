# PediScreen AI — FHIR Use Cases & Resource Mapping

## Overview

This document defines the core FHIR use cases and resource mappings for PediScreen AI EHR interoperability. All exports conform to **FHIR R4**.

---

## 1. Export Screening Results as DocumentReference

**Use Case:** Export the AI-generated report as a PDF summary attached to the patient's EHR record.

| Component | FHIR Mapping |
|-----------|--------------|
| PDF summary | `DocumentReference.content[].attachment` (contentType: application/pdf, data: base64) |
| Report type | `DocumentReference.type` → LOINC 56962-1 "PediScreen AI Report" |
| Patient | `DocumentReference.subject` → `Patient/{patient_id}` |
| Status | `DocumentReference.status` = "current" |

**Bundle:** DocumentReference is included in a FHIR Bundle (type: transaction) for atomic submission.

---

## 2. Structured Data as QuestionnaireResponse & Observation

**Use Case:** Save screening inputs and AI outputs as structured FHIR resources for EHR queries and analytics.

| AI Field | FHIR Mapping |
|----------|--------------|
| Child age | `Patient.birthDate` (derived) or `QuestionnaireResponse.item` (linkId: age, valueInteger) |
| Screening answers | `QuestionnaireResponse.item[]` (linkId, text, answer) |
| Risk level | `Observation.valueCodeableConcept` (system: http://ai.pediscreen.org) |
| Summary | `DiagnosticReport.presentedForm` / `DocumentReference` |
| Evidence summaries | `Observation.note[]` or separate Observation per evidence item |
| Confidence | `Observation.extension[]` (url: confidence, valueDecimal) |

---

## 3. Identity & Consent Resources

| Resource | Purpose |
|----------|---------|
| **Patient** | Links screening to EHR patient identity; `Patient/{id}` referenced by all resources |
| **Practitioner** | Clinician identity from SMART launch (`fhirUser`); used in Provenance |
| **Consent** | Records patient/parent consent for EHR sharing; scope: patient-privacy |

---

## 4. FHIR Resource Summary

| Resource | When Created | Key Fields |
|----------|--------------|------------|
| DocumentReference | Export report to EHR | PDF attachment, LOINC type, Patient ref |
| QuestionnaireResponse | Export screening inputs | status: completed, items for age, domain, observations |
| Observation | Risk level, evidence items | category: assessment, valueCodeableConcept, extension (confidence) |
| DiagnosticReport | Optional; links Observations | conclusion = clinical_summary |
| Provenance | On DocumentReference attach | target, agent (Practitioner), activity |
| Consent | Before EHR export | status: active, scope: patient-privacy, patient ref |

---

## 5. Terminology Codes

See `interop/terminology_map.md` for LOINC, SNOMED, and custom code mappings.

---

## 6. Consent Flow

1. User must accept EHR sharing consent dialog before export.
2. Backend creates/stores FHIR Consent resource.
3. Export aborts if consent denied.
4. Consent stored in `consent_records` and optionally as FHIR Consent in bundle.
