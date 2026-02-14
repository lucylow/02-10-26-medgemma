# PediScreen AI — EHR Interoperability QuickStart

For clinicians and CHWs: how to export screening results to your EHR.

## Prerequisites

- PediScreen AI account (clinician or CHW role)
- EHR system with SMART on FHIR support (Epic, Cerner, or sandbox)
- Report finalized (signed off by clinician)

## Steps

### 1. Complete Screening & Sign-Off

1. Run developmental screening for the child
2. Review AI-generated draft report
3. Edit if needed (clinical summary, recommendations)
4. Click **Approve** / **Sign off**

### 2. Export to EHR

1. On the Results page, switch to **Clinician View**
2. Click **Send to EHR**
3. Choose:
   - **Export FHIR (JSON)** — Download bundle for manual upload or integration
   - **Push to EHR (SMART)** — Direct push (requires SMART launch and token)

### 3. Consent

When prompted, read and accept:

> *"By sharing this report to your electronic health record, you authorize transfer of pediatric screening information. Personal data will be stored in your health system's record. You may withdraw at any time."*

### 4. Launch from EHR (Optional)

If your EHR supports SMART App Launch:

1. Open PediScreen AI from within the EHR (e.g. Epic App Gallery)
2. EHR redirects with patient context
3. Complete screening; export uses stored token automatically

## Troubleshooting

| Issue | Action |
|-------|--------|
| "Report not found" | Ensure report is finalized and stored; use report_id or screening_id |
| "Consent required" | Accept the consent dialog before export |
| "EHR push failed" | Check FHIR_BASE_URL and token; verify EHR sandbox is reachable |
| "FHIR_BASE_URL not configured" | Set env var or use Export FHIR (JSON) for manual transfer |

## Support

See [interop/README.md](../README.md) for technical details and API reference.
