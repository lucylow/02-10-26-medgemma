# PediScreen AI — EHR Integration (SMART-on-FHIR R4)

Enterprise-grade EHR integration for Epic, Cerner, Athena, and SMART Sandbox.

## 1. SMART-on-FHIR Launch Sequence

**Flow:** Clinician clicks PediScreen AI inside EHR → EHR redirects with `iss` + `launch` → App exchanges code for token + patient/practitioner context.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/fhir/launch?iss=...&launch=...` | Initiate OAuth; redirects to EHR authorize |
| `GET /api/fhir/callback?code=...&iss=...` | Exchange code for access_token, patient, practitioner |
| `GET /smart/launch` | Alias for EHR launch |
| `GET /smart/callback` | Alias for callback |

**Scopes:** `launch openid fhirUser patient/*.read patient/Observation.write patient/DiagnosticReport.write`

**Config:** `SMART_CLIENT_ID`, `SMART_CLIENT_SECRET`, `SMART_REDIRECT_URI`

---

## 2. FHIR Provenance (Audit Trail)

Proves who did what, when, and why — FDA-grade auditability.

- **Service:** `app/services/fhir_provenance.py`
- **Integration:** When attaching PDF to EHR via `POST /api/ehr/attach-pdf`, pass `practitioner_ref` (e.g. `Practitioner/123`) to attach Provenance to the DocumentReference.

---

## 3. PDF Digital Signatures (PKI)

Cryptographic document integrity. Signs PDF hash with RSA private key.

**Setup:**
```bash
openssl genrsa -out signing.key 2048
openssl req -new -x509 -key signing.key -out signing.crt
```

**Config:**
- `PDF_SIGNING_PRIVATE_KEY_PEM` — PEM string (base64 or raw)
- `PDF_SIGNING_PRIVATE_KEY_PATH` — Path to .pem file
- `PDF_SIGNING_CERT_LABEL` — Display label (default: "PediScreen AI Demo CA")

**Flow:** On report approval, if PKI is configured, the PDF hash is signed and stored. Exported PDFs show "Digitally signed by PediScreen AI" and Signature ID in the footer.

---

## 4. Longitudinal Screening Diff

"What changed since last screening?" — domain-level changes pushed to EHR as FHIR Observation.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/screenings/diff?patient_id=...&current_screening_id=...` | Returns `{domain, from, to}` changes |
| `?push_to_fhir=true&fhir_base_url=...&fhir_token=...` | Pushes Observation to EHR |

**EHR display example:** `Language: Monitor → Improving`

---

## Quick Reference

| Feature | File | Config |
|---------|------|--------|
| SMART OAuth | `services/smart_oauth.py`, `api/fhir.py` | SMART_CLIENT_ID, SMART_REDIRECT_URI |
| Provenance | `services/fhir_provenance.py` | practitioner_ref on attach |
| PDF PKI | `services/pdf_pki.py` | PDF_SIGNING_PRIVATE_KEY_* |
| Screening Diff | `services/screening_diff.py`, `api/screenings.py` | — |
