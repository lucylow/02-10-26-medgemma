# MedGemma Helm Chart

Helm chart for deploying the PediScreen / MedGemma backend to Kubernetes, with GPU scheduling support.

## Quick Start

```bash
helm upgrade --install medgemma ./helm/medgemma -n medgemma --create-namespace \
  --set image.repository=gcr.io/YOUR_PROJECT/medgemma-backend \
  --set image.tag=latest
```

## GPU Setup (GKE)

1. Create a GPU node pool:
   ```bash
   gcloud container node-pools create gpu-pool \
     --accelerator type=nvidia-tesla-t4,count=1 \
     --machine-type=n1-standard-8 \
     --num-nodes=1 \
     --zone=us-central1-a \
     --cluster=YOUR_CLUSTER_NAME
   ```

2. Install NVIDIA device plugin:
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/main/nvidia-device-plugin.yml
   ```

3. Enable GPU in values:
   ```yaml
   gpu:
     enabled: true
     count: 1
     nodeSelector:
       accelerator: nvidia-tesla-t4
   ```

## Secret Management

**Production:** Use [ExternalSecrets](https://external-secrets.io/) or cloud Secret Manager CSI driver. Do not store secrets in `values.yaml`.

## CI/CD

GitHub Actions workflow (`.github/workflows/ci-cd.yml`) builds the model-server image, pushes to GCR, and runs `helm upgrade --install`.

**Required secrets:** `GCP_SA_KEY`, `GCP_PROJECT`, `GKE_CLUSTER`, `GKE_ZONE`

## Pre-deploy Checklist

- [ ] Create GPU node pool and label nodes (if GPU needed)
- [ ] Install NVIDIA device plugin on cluster
- [ ] Configure image registry and push image
- [ ] Configure secrets (ExternalSecrets or cloud secret manager)
- [ ] Update `values.yaml` for production (replicaCount, resource limits, ingress host/TLS)
- [ ] Run `helm lint ./helm/medgemma`
- [ ] Run `helm upgrade --install` in your cluster
