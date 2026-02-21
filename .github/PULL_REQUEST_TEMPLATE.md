# Pull Request

## Summary of changes

<!-- Briefly describe what this PR does -->

## Testing performed

- [ ] Unit tests run: `pytest -q` (or `cd backend && pytest -q`)
- [ ] Integration / API tests run where applicable
- [ ] MOCK_FALLBACK=true behavior tested (mock responses when model unavailable)

## Failure modes covered

<!-- Which error paths / retries / fallbacks are exercised by new or existing tests? -->

## How to roll back

<!-- If this is a deployment change: steps to revert or feature-flag off -->

## Checklist

- [ ] Documented runbook (RUNBOOK.md) updated if behavior or ops changed
- [ ] Tests added or updated for new behavior
- [ ] Lint/format applied (e.g. ruff, black)
- [ ] No stack traces or internal details leaked to API error responses; request_id present

---

**Labels** (suggested): `type:bug` | `type:enhancement` | `area:inference` | `area:monitoring`
