# EHR Field Constraints

Required fields and constraints for common EHR vendors when pushing FHIR resources.

## Patient

| Vendor | Required Fields | Notes |
|--------|-----------------|-------|
| Epic R4 | identifier, name (or at least family) | MRN typically in identifier |
| Cerner Millennium | identifier | Often requires specific identifier system |
| Allscripts | identifier | |
| HAPI FHIR (sandbox) | Minimal | For testing |

## Practitioner

| Vendor | Required | Notes |
|--------|----------|-------|
| Epic | identifier or name | NPI preferred |
| Cerner | identifier | |
| SMART launch | fhirUser from token | Use Practitioner ref from token |

## DocumentReference

| Field | Required | Notes |
|-------|----------|-------|
| status | Yes | "current" |
| type | Yes | CodeableConcept with coding |
| subject | Yes | Patient reference |
| content | Yes | At least one attachment |
| content.attachment.contentType | Yes | e.g. application/pdf |
| content.attachment.data | Yes | Base64 PDF |

## Organization Context

Some EHRs require an Organization reference in the request context. Check vendor-specific SMART configuration.
