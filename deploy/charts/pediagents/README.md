# pediagents Helm Chart

Deploys the **PediScreen AI** orchestrator and agent services (embedder, modelreasoner, audit, registry, ui) to Kubernetes (GKE / EKS).

## Prerequisites

- Kubernetes 1.24+
- Helm 3+
- (Optional) Prometheus Operator for ServiceMonitor
- (Recommended) ExternalSecrets or Vault for secrets — do not commit real secrets to Git

## Quick start (dev)

1. **Create namespace**
   ```bash
   kubectl create namespace pediscreen
   ```

2. **Secrets (dev only)**  
   For production use ExternalSecrets or your cluster secret store.
   ```bash
   kubectl create secret generic pediscreen-db \
     --from-literal=DATABASE_URL='postgresql://user:pass@postgres.pediscreen.svc:5432/pediscreen' \
     -n pediscreen
   ```

3. **Install the chart**
   ```bash
   helm upgrade --install pediscreen deploy/charts/pediagents \
     --namespace pediscreen
   ```

4. **Validate**
   ```bash
   kubectl get pods,svc,hpa -n pediscreen
   kubectl logs deployment/pediscreen-orchestrator -n pediscreen
   ```

## Configuration

Edit `values.yaml` (or use `--set` / override file):

| Area | What to set |
|------|-------------|
| **Agents** | `agents.<name>.enabled`, `replicas`, `image.repository`, `image.tag` |
| **Resources** | `agents.<name>.resources.requests/limits` |
| **GPU** | `agents.modelreasoner.gpu.enabled: true`, `nodeSelector`, `tolerations` |
| **Ingress** | `ingress.enabled`, `ingress.hostname`, `ingress.tls` |
| **Secrets** | Prefer ExternalSecrets; use `secrets` in values only for non-sensitive overrides (e.g. dev) |

## GKE

- Use a **node pool** with GPU if running `modelreasoner` (e.g. `nvidia-tesla-t4`).
- Label GPU nodes, e.g. `accelerator=nvidia-gpu`, and set `agents.modelreasoner.nodeSelector` / `tolerations` accordingly.
- For private images: set `global.imagePullSecrets` (e.g. GCR or Artifact Registry).

```bash
helm upgrade --install pediscreen deploy/charts/pediagents \
  --namespace pediscreen \
  --set ingress.hostname=pediscreen.example.org \
  --set agents.orchestrator.image.tag=v0.1.0
```

## EKS

- Use **IRSA** (IAM Roles for Service Accounts) for S3 / Secrets Manager / KMS; annotate the chart’s ServiceAccount with the IAM role.
- For GPU: create a node group with GPU instance types (e.g. p3/p4) and install the NVIDIA device plugin.
- Optionally use **KEDA** for queue-based autoscaling (e.g. Redis).

## GPU and tolerations

- Set `agents.<name>.gpu.enabled: true` and `resources.limits.<resourceName>: count`.
- Use `nodeSelector` and `tolerations` so the pod schedules on GPU nodes, e.g.:

  ```yaml
  nodeSelector:
    accelerator: nvidia-gpu
  tolerations:
    - key: "nvidia.com/gpu"
      operator: "Exists"
      effect: "NoSchedule"
  ```

## Secrets and KMS

- **Do not** store production secrets in `values.yaml` or Git.
- Use **Kubernetes External Secrets** (backed by GCP Secret Manager / AWS Secrets Manager / Vault) and reference the synced Secret name in agent `env` (e.g. `valueFrom.secretKeyRef`).
- Use **KMS** for audit signing keys; expose key reference via env (e.g. `AUDIT_KEY_URI`), not the key material.

## Observability

- Each agent should expose **`/health`** and **`/metrics`** (Prometheus format).
- If `prometheus.serviceMonitor.enabled` is true, a **ServiceMonitor** is created so Prometheus Operator scrapes all agent services with label `app.kubernetes.io/name: pediagents`.
- Use **structured (JSON) logs** and ship to Loki/Grafana; add **OpenTelemetry** (e.g. `OTEL_*` env vars) for tracing (e.g. Jaeger).

## Canary and rollout

- Use a different image tag for canary: `--set agents.orchestrator.image.tag=v0.2.0-canary`.
- After install/upgrade: `kubectl rollout status deployment/pediscreen-orchestrator -n pediscreen`.
- For model/adapter changes: run evaluation and canary traffic before promoting.

## Chart layout

```
deploy/charts/pediagents/
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values.prod.yaml
├── README.md
└── templates/
    ├── _helpers.tpl
    ├── serviceaccount.yaml
    ├── role.yaml
    ├── rolebinding.yaml
    ├── deployment.yaml
    ├── service.yaml
    ├── hpa.yaml
    ├── configmap.yaml
    ├── secret.yaml
    ├── ingress.yaml
    └── servicemonitor.yaml
```

## Next steps

- Add **PodDisruptionBudget** for orchestrator and critical agents.
- Add **NetworkPolicy** to restrict traffic between agents and DB.
- Use **cert-manager** for Ingress TLS.
- Add **Helm tests** (`templates/tests/`) for smoke checks.
