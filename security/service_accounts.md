# Service Accounts & Least Privilege

## Mapping

| Service | Minimum IAM Roles | Notes |
|---------|-------------------|-------|
| Model server | storage.objectViewer (read adapters) | No admin |
| API backend | secretmanager.secretAccessor, audit log writer | No storage.admin |
| Embedding server | storage.objectViewer | Read-only for model assets |

## Zero Trust

- Internal services authenticate with mTLS or token.
- Deny by default; allow only required paths.
