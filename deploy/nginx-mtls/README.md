# NGINX mTLS sidecar

Use this sidecar to enforce TLS client certificate verification in front of the orchestrator.

- **nginx.conf** — Server block: listen 8443, verify client certs with `ssl_verify_client on`, proxy to `127.0.0.1:9000`.
- **k8s-sidecar-example.yaml** — Pod snippet: orchestrator container + nginx sidecar, volumes for certs (Secret `orchestrator-tls`) and config (ConfigMap `orchestrator-nginx-config`).

**Secret `orchestrator-tls`** must contain: `tls.crt`, `tls.key`, `ca.crt` (CA used to verify client certs).  
**ConfigMap `orchestrator-nginx-config`**: key `nginx.conf` with the contents of `nginx.conf`.

For EKS you can use AWS ACM + NLB with client certs, or Istio/Envoy for mesh mTLS.
