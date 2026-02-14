# Forensic Query Examples

Sample SQL and script commands for audit investigations.

## 1. Find all inferences run by clinician X in date range

```sql
SELECT * FROM audit_log
WHERE actor_id = 'clinician-x'
  AND event_type = 'inference_run'
  AND timestamp BETWEEN '2026-01-01T00:00:00Z' AND '2026-02-01T23:59:59Z'
ORDER BY timestamp DESC;
```

## 2. Show all refer risk outputs for adapter pediscreen_v1

```sql
SELECT resource_id, timestamp,
       request->>'prompt_hash',
       response->>'risk'
FROM audit_log
WHERE request->>'adapter_id' = 'pediscreen_v1'
  AND response->>'risk' = 'refer'
ORDER BY timestamp DESC;
```

## 3. Verify HMAC chain integrity

```bash
python scripts/verify_audit_chain.py --fixtures compliance/fixtures/audit_sample.json
```

## 4. Count inference runs by actor role

```sql
SELECT actor_role, COUNT(*) as cnt
FROM audit_log
WHERE event_type = 'inference_run'
GROUP BY actor_role;
```

## 5. Find clinical sign-offs in last 7 days

```sql
SELECT event_id, actor_id, resource_id, timestamp, outcome
FROM audit_log
WHERE event_type = 'clinical_signoff'
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

## 6. Detect audit export requests (sensitive operation)

```sql
SELECT event_id, actor_id, timestamp, client_ip
FROM audit_log
WHERE event_type = 'audit_export_request'
ORDER BY timestamp DESC;
```

## 7. Trace a specific case through its lifecycle

```sql
SELECT event_type, actor_id, timestamp, outcome, request->>'adapter_id'
FROM audit_log
WHERE resource_id = 'case-uuid-here'
ORDER BY timestamp ASC;
```

## 8. Find inferences with low confidence

```sql
SELECT resource_id, timestamp, response->>'confidence', response->>'risk'
FROM audit_log
WHERE event_type = 'inference_run'
  AND (response->>'confidence')::float < 0.6
ORDER BY timestamp DESC;
```
