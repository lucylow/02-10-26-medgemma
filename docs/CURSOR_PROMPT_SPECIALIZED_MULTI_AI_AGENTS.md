# Cursor Prompt: Specialized Multi-AI Agents for PediScreen (lucylow/02-10-26-medgemma)

**Table of contents:** Page 1 (Overview & goal) · 2 (Architecture & motivation) · 3 (Agent catalog) · 4 (Agent interface & JSON contracts) · 5 (Orchestrator design) · 6 (Agent implementation patterns) · 7 (Registration & discovery) · 8 (Provenance & audit) · 9 (Human-in-the-loop UX) · 10 (Safety, privacy & legal) · 11 (Evaluation & metrics) · 12 (Testing strategy) · 13 (Developer tasks / PR plan) · 14 (call_agent helper & retries) · 15 (Deployment & ops) · 16 (Governance & rollout) · Appendix A (Prompt templates) · Appendix B (E2E scenario) · How to use.

**Purpose:** Paste this prompt into Cursor (or a Cursor-style code assistant) to implement **Specialized Multi-AI Agents** for the PediScreen AI workflow. The result is a concrete, actionable plan and implementation blueprint that reimagines the pipeline by deploying HAI-DEF models (MedSigLIP embeddings, MedGemma with LoRA adapters) as **callable, specialized agents and tools**.

**Repo context:** MedSigLIP embeddings (`server/embed_server.py`, `backend/app/api/embed.py`), MedGemma + LoRA (`model-server/app/medgemma_service.py`, `training/finetune_lora.py`), embedding contract (`embedding_b64`, `shape`, `emb_version`), and existing FastAPI conventions (`backend/app/api/infer.py`, `supabase/functions/analyze`).

### Repo file reference (02-10-26-medgemma)

| Concern | Path |
|---------|------|
| MedSigLIP server | `server/embed_server.py` — `POST /embed`, `EmbeddingResponse(embedding_b64, shape, emb_version)` |
| Backend embed API | `backend/app/api/embed.py` — chain local/Vertex/HF |
| Backend infer (embedding-first) | `backend/app/api/infer.py` — `InferRequest(case_id, age_months, observations, embedding_b64, shape, emb_version, consent_id)` |
| MedGemma service | `model-server/app/medgemma_service.py` — `infer(precomputed_image_emb, age_months, observations)`, `build_prompt()`, `adapter_id` |
| LoRA training | `training/finetune_lora.py`, `training/lora_config.yaml`, `training/inference_qlora.py` |
| Existing orchestrator | `pedi-agent-stack/orchestrator/main.py` — `process_case`, embed + MedGemma URL, Redis job store |
| Supabase analyze | `supabase/functions/analyze/index.ts` — consent_id, embedding_b64, adapter_id, embedding_hash |
| Frontend infer client | `src/api/medgemma.ts` — `inferWithEmbedding()`, `InferResult` |
| Embedding service (client) | `src/services/embeddingService.ts` — mock vs `/embed` |

---

## Page 1 — Prompt Overview & Goal

### What this Cursor task must produce

1. **Architecture** — Multi-agent system with a central **Orchestrator**, **Agent Registry**, and specialized **Agents** (Embedder, ModelReasoner, TriageScorer, EvidenceExtractor, DraftFormatter, Audit, BiasAuditor, EHRConnector, HumanInLoop bridge).
2. **Contracts** — Consistent JSON/RPC interface per agent (request_id, case_id, consent, payload, meta; response with output, diagnostics, provenance).
3. **Implementation** — Runnable scaffolding: agent base, registry, orchestrator, at least one full agent (EmbedderAgent wrapping MedSigLIP), tests, and CI.
4. **Governance** — Privacy-by-design (embeddings-first, consent_id), human-in-the-loop (draft → clinician sign-off), audit/provenance store, and deployment/ops guidance.

### Deliverables (actionable)

- **Scaffolding:** `agents/common/`, `agents/embedder/`, `services/agent_registry/`, `orchestrator/` with FastAPI apps.
- **Sample code:** Agent call contract (Pydantic), `call_agent()` helper with retries/circuit breaker, minimal EmbedderAgent and orchestrator `/orchestrate/case`.
- **Tests:** Unit tests for agents and schema validation; integration test with docker-compose (orchestrator + agents + Redis + DB).
- **CI:** GitHub Actions for unit tests, integration smoke, lint (ruff/black), type check (mypy), optional security scan (safety/semgrep).
- **Docs:** README sections for onboarding, privacy/governance, and rollout phases.

**Avoid hypothetical jargon.** All snippets must be runnable (Python 3.10+, FastAPI, small orchestration patterns). A single developer or small team should be able to implement the system in sprints using this prompt.

---

## Page 2 — High-Level Architecture & Motivation

### Problem

The current pipeline is **linear:** capture → encode → analyze → recommend → review. It is robust but rigid. Specialized agents allow:

- **Modularity** — Each capability is a small, testable service.
- **Policy-enforced automation** — Consent, data residency, and guardrails live in one place (orchestrator + agents).
- **Parallelism** — E.g. Embedder and EvidenceExtractor can run in parallel where safe.
- **Governance** — Per-agent versioning, audit, and human-in-the-loop are first-class.

### High-level components

| Component | Role |
|----------|------|
| **Agent Registry** | Central directory of agent capabilities, versions, adapters, metadata (health, cost, data residency). |
| **Tool/Agent Interface** | Small, consistent JSON/RPC contract each agent implements (input schema, auth, output schema, confidence). |
| **Orchestrator / Director** | Lightweight service that receives a "case", sequences or parallelizes agents, enforces policies and human-in-loop steps. |
| **Agents** | Independent services (or serverless) implementing one capability each (Embedder, ImageQA, TriageScorer, EvidenceExtractor, DraftFormatter, EHRAttacher, BiasAuditor, etc.). |
| **Audit & Provenance Store** | Append-only log (immutable) capturing inputs, outputs, agent_id, model_version, prompts, adapter_id, consent_id, clinician overrides. |
| **UI Hooks** | Clinician Review UI components that display agent outputs, provenance, and allow overrides. |
| **Security & Ops** | KMS, secrets, RBAC, SLOs, rate-limiters. |

### Motivation

- Agents are **small, testable, auditable** and fit the CDS (clinical decision support) framing with human-in-the-loop.
- They let you add **tools** that models or the orchestrator can call programmatically, keeping model reasoning separate from action.
- Existing repo pieces (e.g. `server/embed_server.py`, `model-server/app/medgemma_service.py`, `backend/app/api/infer.py`) become **wrapped as agents** behind the common contract.

---

## Page 3 — Agent Types & Responsibilities (Catalog)

Each agent is an **independent service** with a small API. Names and responsibilities:

| Agent | Responsibilities | Input (payload) | Output |
|-------|------------------|-----------------|--------|
| **EmbedderAgent** (MedSigLIP) | Run MedSigLIP (TFLite on-device or server FastAPI); L2-normalize; optionally encrypt before storing. | Image bytes or `image_b64`; or pass-through `embedding_b64` if already computed. | `embedding_b64`, `shape`, `emb_version`. |
| **PreprocessAgent** | Canonicalize inputs, validate schema, enforce consent. | Raw text, age, scores; optional images. | Structured JSON (cleaned observations, validated questionnaire scores). |
| **ModelReasonerAgent** (MedGemma core) | Call MedGemma + LoRA adapter; reproducible prompt template; capture model_version/adapter_id. | `precomputed_image_emb` (or ref), structured observations, `adapter_id`, prompt metadata. | `draft_summary`, `risk_label`, `evidence_ids`, confidence, explainability artifacts (e.g. nearest-neighbor refs). |
| **TriageScorerAgent** | Business rules & clinical thresholds; flag high-priority for clinician. | Model outputs, confidence, metadata. | `triage_score`, `recommended_action` (monitor/refer), `priority`. |
| **EvidenceExtractorAgent** | FAISS/similarity search over precomputed embeddings + index. | Precomputed embeddings + index ref. | Top-k neighbors (de-identified thumbnails or metadata refs) with similarity scores for explainability. |
| **DraftFormatterAgent** | Templating; FHIR mapping; "draft" label; enforce clinician sign-off. | Model summary + evidence. | Clinician-ready note, parent summary (plain language), EHR-ready JSON (FHIR resources). |
| **AuditAgent** | Append-only write to audit store. | Any agent call results (hooked from orchestration). | Writes immutable record (input_hash, output_hash, agent_id, model_version, adapter_id, consent_id, signature). |
| **BiasAuditorAgent** (periodic) | Scheduled runs over batches of cases/labels/demographics. | Batches of cases, labels, demographics. | Fairness metrics, discrepancy flags, suggested mitigations. |
| **EHRConnectorAgent** | Push signed, clinician-approved report to EHR (SMART-on-FHIR). | Signed report. | DocumentReference id, status. |
| **HumanInLoopAgent** (UI bridge) | Not a model: mediates clinician actions — show drafts, record overrides (→ AuditAgent), trigger EHRConnector on sign-off. | UI events (override, sign). | ACK + audit ref. |

Each agent exposes **health** (`GET /health`) and **metrics** (e.g. Prometheus). Agents are **versioned** (e.g. `embedder:v1`).

---

## Page 4 — Agent Interface & JSON Contracts (APIs)

Every agent implements a **minimal, consistent** HTTP/JSON contract so orchestration, testing, and auditing stay simple.

### Standard request: `POST /call`

```json
{
  "request_id": "uuid-v4",
  "case_id": "uuid-v4",
  "caller": {"service": "orchestrator", "user_id": "chwx001"},
  "consent": {"consent_id": "uuid", "consent_given": true},
  "payload": {},
  "meta": {
    "adapter_id": "pediscreen_v1",
    "model_version": "medgemma-2b-it",
    "timestamp": "2026-02-24T12:00:00Z"
  }
}
```

- `payload`: agent-specific input (e.g. `image_b64`, `embedding_b64`, or structured observations).
- Accept `Content-Type: application/json` or `application/octet-stream` for image upload where applicable.

### Standard success response

```json
{
  "request_id": "uuid-v4",
  "agent_id": "embedder:v1",
  "success": true,
  "output": {},
  "diagnostics": {"runtime_ms": 123, "node": "edge-01"},
  "provenance": {"agent_version": "v1", "model_version": "...", "adapter_id": "..."},
  "signature": "<optional HMAC of result>"
}
```

### Agent error contract

```json
{
  "request_id": "...",
  "agent_id": "...",
  "success": false,
  "error": {"code": "E_MODEL_LOAD", "message": "..."},
  "diagnostics": {}
}
```

### Health

- `GET /health` → `{"status": "ok", "agent": "embedder", "version": "v1", "uptime_s": 1234}`.

### Implementation (Pydantic)

Use **consistent schema validation** with Pydantic in the repo. Example base schemas:

```python
# agents/common/schemas.py
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional

class Caller(BaseModel):
    service: str
    user_id: Optional[str] = None

class Consent(BaseModel):
    consent_id: Optional[str] = None
    consent_given: bool = False

class AgentCallRequest(BaseModel):
    request_id: str
    case_id: str
    caller: Caller
    consent: Consent
    payload: Dict[str, Any]
    meta: Dict[str, Any]

class AgentCallResponse(BaseModel):
    request_id: str
    agent_id: str
    success: bool
    output: Optional[Dict[str, Any]] = None
    diagnostics: Dict[str, Any] = {}
    provenance: Dict[str, Any] = {}
    signature: Optional[str] = None
    error: Optional[Dict[str, str]] = None
```

OpenAPI docs: expose via FastAPI (`/docs`, `/openapi.json`).

---

## Page 5 — Orchestrator Design (Director/Coordinator)

The **orchestrator** decides which agents to call and when.

### Design choices

- **Stateless** request-level orchestrator (FastAPI) with short-lived orchestration state in **Redis** for retries.
- **Workflow:** Start with a **deterministic pipeline** (no full DAG engine required initially). Optional: dramatiq/rq for queued jobs or a simple rules-based engine.

### Default pipeline order

1. **PreprocessAgent**
2. **EmbedderAgent** (only if image provided and no embedding provided)
3. **EvidenceExtractorAgent** (optional; can run in parallel with next)
4. **ModelReasonerAgent**
5. **TriageScorerAgent**
6. **DraftFormatterAgent**
7. **AuditAgent** (write output)
8. **HumanInLoopAgent** (notify UI)
9. **On sign-off** → **EHRConnectorAgent**

### Implementation outline (FastAPI)

```python
# orchestrator/main.py (conceptual)
@app.post("/orchestrate/case")
async def orchestrate_case(req: OrchestrateRequest):
    # 1. Validate consent
    if not req.consent.consent_given and req.payload.get("image_b64"):
        raise HTTPException(400, "Consent required for image processing")
    # 2. Preprocess
    pre = await call_agent("preprocess", payload=req.payload, ...)
    # 3. Embedder if image and no embedding
    emb = None
    if req.payload.get("image_b64") and not req.payload.get("embedding_b64"):
        emb = await call_agent("embedder", payload={"image_b64": req.payload["image_b64"]}, ...)
    elif req.payload.get("embedding_b64"):
        emb = {"embedding_b64": req.payload["embedding_b64"], "shape": req.payload.get("shape", [1, 256])}
    # 4. Model reasoner
    reason = await call_agent("modelreasoner", payload={"embedding_b64": emb["embedding_b64"], "observations": pre["output"]}, ...)
    triage = await call_agent("triagescorer", payload=reason["output"], ...)
    draft = await call_agent("draftformatter", payload={...}, ...)
    # 5. Audit
    await call_agent("audit", payload={...}, ...)
    # 6. Notify UI (e.g. websocket / pubsub)
    notify_ui(req.case_id, draft["output"])
    return {"case_id": req.case_id, "status": "awaiting_review"}
```

### Orchestrator must implement

- **Policy enforcement** — e.g. do not auto-upload raw images unless consent.
- **Retry logic** — exponential backoff (e.g. tenacity).
- **Timeout thresholds** — per-agent (e.g. 20s).
- **Circuit breaker** — avoid cascading failures (e.g. pybreaker).

---

## Page 6 — Agent Implementation Patterns & Minimal Example

Agents can be **microservices** (FastAPI) or **serverless** (e.g. Cloud Run). Minimal Python agent template (FastAPI + Pydantic):

```python
# agents/embedder/app.py
import base64
import os
import tempfile
import uuid
from fastapi import FastAPI
from pydantic import BaseModel
from agents.common.schemas import AgentCallRequest, AgentCallResponse

app = FastAPI(title="Embedder Agent (MedSigLIP)")

# Reuse repo logic: same as server/embed_server.py (add project root to PYTHONPATH or copy helper)
def _mock_embedding_from_bytes(b: bytes, dim: int = 256):
    import numpy as np
    seed = int.from_bytes(base64.b16encode(b)[:8], "little") % (2**32)
    rng = np.random.RandomState(seed)
    arr = rng.normal(size=(1, dim)).astype("float32")
    arr = arr / (np.linalg.norm(arr, axis=-1, keepdims=True) + 1e-12)
    return arr

def extract_embedding_from_image_path(path: str, model_name: str = None):
    with open(path, "rb") as f:
        b = f.read()
    return _mock_embedding_from_bytes(b, dim=256)

class CallRequest(BaseModel):
    request_id: str
    case_id: str
    caller: dict
    consent: dict
    payload: dict
    meta: dict

@app.post("/call", response_model=dict)
async def call(req: CallRequest):
    start = __import__("time").time()
    if req.payload.get("embedding_b64"):
        return {
            "request_id": req.request_id,
            "agent_id": "embedder:v1",
            "success": True,
            "output": {"embedding_b64": req.payload["embedding_b64"], "shape": req.payload.get("shape", [1, 256])},
            "diagnostics": {"runtime_ms": 0},
            "provenance": {"agent_version": "v1", "model_version": "passthrough"},
        }
    img_b64 = req.payload.get("image_b64")
    if not img_b64:
        return {"request_id": req.request_id, "agent_id": "embedder:v1", "success": False, "error": {"code": "E_NO_IMAGE", "message": "no image provided"}}
    data = base64.b64decode(img_b64)
    tmp = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4().hex}.png")
    with open(tmp, "wb") as f:
        f.write(data)
    try:
        emb = extract_embedding_from_image_path(tmp, model_name=os.getenv("MEDSIGLIP_MODEL"))
        emb_b64 = base64.b64encode(emb.tobytes()).decode("ascii")
        runtime_ms = int((__import__("time").time() - start) * 1000)
        return {
            "request_id": req.request_id,
            "agent_id": "embedder:v1",
            "success": True,
            "output": {"embedding_b64": emb_b64, "shape": list(emb.shape), "emb_version": "medsiglip-v1"},
            "diagnostics": {"runtime_ms": runtime_ms},
            "provenance": {"agent_version": "v1", "model_version": "medsiglip-v1"},
        }
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

@app.get("/health")
def health():
    return {"status": "ok", "agent": "embedder", "version": "v1"}
```

- Add **OpenAPI** (FastAPI default), **metrics** (Prometheus client), **structured JSON logging**.
- **Testing:** Unit test `/call` with pseudo embeddings and synthetic images; CI smoke test emulating orchestrator calling the agent.

---

## Page 7 — Agent Registration & Discovery

Implement a simple **Agent Registry** (Postgres table or Redis).

### Registry fields

- `agent_id` (e.g. `embedder:v1`)
- `name`, `capabilities` (list, e.g. `["embed", "preprocess"]`)
- `endpoint` (URL)
- `auth` (public key / mTLS fingerprint)
- `region` / `data_residency`
- `status` (healthy, degraded)
- `cost_per_call` (optional)
- `tags` (edge/cloud)

### Registry API

- `POST /registry/register` — Agents self-register on startup with health-check URL.
- `GET /registry/agents` — Orchestrator finds best agent per capability (filter by data_residency, status).
- `PATCH /registry/update_status` — Health checker updates status.

### Discovery policy

- Orchestrator prefers **local/edge** agent when allowed by data residency; fallback to cloud.
- **Security:** mTLS or JWT for agent registration; store agent tokens in Vault/KMS.

---

## Page 8 — Provenance, Auditing & Immutable Log

All agent calls must be **auditable**. AuditEntry schema:

```json
{
  "audit_id": "uuid-v4",
  "request_id": "uuid-v4",
  "case_id": "uuid-v4",
  "agent_id": "embedder:v1",
  "input_hash": "sha256(...)",
  "output_hash": "sha256(...)",
  "model_version": "medsiglip-v1",
  "adapter_id": "pediscreen_v1",
  "timestamp": "2026-02-24T12:00:00Z",
  "consent_id": "uuid",
  "user_id": "chwx001",
  "signature": "<HMAC or KMS-signed blob>"
}
```

- **AuditAgent** persists entries in an **append-only** store (Postgres with immutable policy + WAL retention, or S3 write-once).
- Use **KMS/HSM** to sign audit records for tamper evidence.
- **UI:** Read-only audit logs for clinicians and compliance; **export** (CSV/JSON) and **retention** policies.

---

## Page 9 — Human-in-the-Loop UX Patterns & API Hooks

### UI flows

- **Case landing page:** Draft, evidence, priority, provenance panel. Actions: Edit Draft, Confirm & Sign, Request More Info, Attach to EHR.
- **Edit Draft:** Structured editor; on save, orchestrator records override via AuditAgent.
- **Confirm & Sign:** Triggers EHRConnectorAgent; set `signed_at`.
- **Request More Info:** Re-run EvidenceExtractorAgent or BiasAuditorAgent.

### API endpoints

- `POST /ui/notify_case` — Orchestrator → UI (e.g. websocket/pubsub).
- `POST /ui/override` — UI → Orchestrator: override + reason (→ AuditAgent).
- `POST /ui/sign` — UI → Orchestrator: clinician signature metadata (→ EHRConnectorAgent).

UI must show **confidence**, **explainability** (top-k neighbors), and **model prompts** (redacted) so the clinician can assess reasoning.

---

## Page 10 — Safety, Privacy & Legal Controls

### Privacy-by-design

- **Default:** Embeddings-only uploads; raw images only with explicit consent flag.
- Agents **validate consent_id** before processing.
- **Encryption:** TLS in transit; SSE-KMS at rest; envelope encryption for blobs.

### Safety

- Agents expose **confidence/uncertainty**; below threshold → flag to clinician, no automated referral.
- **Guardrails** in TriageScorerAgent: no automatic referrals without clinician sign-off.
- **Rate-limit and throttle** to prevent abuse.

### Legal

- Human-in-the-loop records and **disclaimers**: "Draft clinical decision support tool. Clinician review required."

---

## Page 11 — Evaluation & Metrics

### Operational

- Latency p50/p95 per agent, error rate, success rate, throughput, cost/call.

### Clinical

- Sensitivity, specificity, PPV, NPV of triage recommendations vs clinician gold.

### UX

- Time-to-document reduction, clinician edit rate, accept rate.

### Fairness / drift

- Subgroup performance; embedding distribution drift (e.g. cosine distance); BiasAuditor outputs.

### Instrumentation

- Each agent: Prometheus `agent_requests_total`, `agent_errors_total`, `agent_latency_seconds_bucket`.
- Orchestrator aggregates and logs to **Grafana**.
- **Evaluation pipelines:** Periodic offline runs (BiasAuditor); A/B trials (fraction of cases to agent-assisted flow).

---

## Page 12 — Testing Strategy (Unit, Integration, E2E)

- **Unit:** Agent-level tests with mocked model responses; schema validation for input/output contracts.
- **Integration:** Orchestrator → local agent instances (docker-compose); full flow for synthetic cases; simulate offline/edge by toggling registry.
- **E2E:** Synthetic dataset (no PHI): orchestrator → audit logs → draft → simulated clinician sign-off → dummy EHR (SMART sandbox). Assert audit entries, FHIR outputs, no raw images stored unless `consent: true`.
- **CI:** GitHub Actions — unit tests, integration smoke (docker-compose), lint (ruff/black), type check (mypy), security scan (safety/semgrep).

---

## Page 13 — Developer Tasks / Files to Add (PR Plan)

| PR | Scope |
|----|--------|
| **PR 1 — Agent scaffolding + registry** | `agents/common/` (base class, client helper, auth middleware), `agents/embedder/` (FastAPI app), `services/agent_registry/` (Postgres table or API), `orchestrator/` with `/orchestrate/case`. Tests: `tests/test_agents.py`. |
| **PR 2 — ModelReasoner agent** | `agents/modelreasoner/` wrapping `model-server/app/medgemma_service.py` (or `backend` MedGemmaService), precomputed embeddings, LoRA adapter loader. Tests with pseudo embeddings. |
| **PR 3 — AuditAgent & UI** | Audit service + append-only storage; UI event bus (websocket); clinician override endpoints. |
| **PR 4 — EHR connector** | EHRConnectorAgent + SMART-on-FHIR test with HAPI sandbox. |
| **PR 5 — BiasAuditor & monitoring** | Scheduled bias audit job; Grafana dashboards and alerts. |

Include **docker-compose.agent.yml** for local dev: orchestrator + agents + DB + Redis + MinIO.

### PR 1 — Concrete file list

- `agents/__init__.py`
- `agents/common/__init__.py`
- `agents/common/schemas.py` — `AgentCallRequest`, `AgentCallResponse`, `Caller`, `Consent`
- `agents/common/base_agent.py` — optional base class with `handle_call()`, health
- `agents/common/client.py` — `call_agent(endpoint, payload)` with retries (or in orchestrator)
- `agents/embedder/__init__.py`
- `agents/embedder/app.py` — FastAPI app with `POST /call`, `GET /health`
- `services/agent_registry/__init__.py`
- `services/agent_registry/models.py` — registry table fields (or Redis schema)
- `services/agent_registry/api.py` — `POST /registry/register`, `GET /registry/agents`
- `orchestrator/__init__.py`
- `orchestrator/main.py` — FastAPI, `POST /orchestrate/case`
- `orchestrator/agent_client.py` — `call_agent()` with tenacity + pybreaker
- `tests/test_agents.py` — unit tests for embedder and schemas
- `tests/test_orchestrator.py` — smoke test orchestrate with mock agents
- `docker-compose.agent.yml` — orchestrator, embedder, redis, postgres (optional)
- `.github/workflows/agents.yml` — CI: pytest, lint, mypy

---

## Page 14 — Sample Code: Orchestrator `call_agent` Helper & Retries

```python
# orchestrator/agent_client.py
import httpx
import asyncio
from typing import Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential
from pybreaker import CircuitBreaker

AGENT_TIMEOUT = 20.0
breaker = CircuitBreaker(fail_max=5)

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def call_agent(endpoint: str, payload: Dict[str, Any], timeout: float = AGENT_TIMEOUT) -> Dict[str, Any]:
    @breaker
    async def _call():
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(f"{endpoint}/call", json=payload)
            if r.status_code >= 500:
                r.raise_for_status()
            return r.json()
    return await _call()
```

Use **circuit breaker** (pybreaker) so failing agents do not cascade.

---

## Page 15 — Deployment & Ops (K8s + Edge)

- **Agents:** Small containers (one image per agent) with resource requests/limits.
- **On-prem/edge:** EmbedderAgent + orchestrator-lite on k3s; local EHR attach.
- **Cloud:** ModelReasonerAgent on GPU (Triton / HF / Vertex); autoscaling.
- **Kubernetes:** Ingress, mTLS; Helm chart per agent.
- **Secrets:** Vault or cloud KMS for agent tokens and audit signing keys.
- **Observability:** Prometheus, Grafana, Loki, Jaeger.
- **SRE:** Churn thresholds, escalation matrix, DR (multi-AZ). **Edge policy:** Orchestrator selects agent by `data_residency` tag.

### Helm chart (GKE/EKS)

A ready-to-use Helm chart lives in **`deploy/charts/pediagents/`**:

- **Layout:** `Chart.yaml`, `values.yaml`, `values-dev.yaml`, `values.prod.yaml`, `templates/` (deployment, service, hpa, serviceaccount, role, rolebinding, configmap, secret, ingress, servicemonitor, _helpers.tpl, NOTES.txt).
- **Per-agent:** Each agent is a first-class deployment (image, replicas, resources, `nodeSelector` / tolerations for GPU, health probes, HPA, Service). ModelReasoner includes GPU request and tolerations by default.
- **Override files:** `values-dev.yaml` for local/dev; **`values.prod.yaml`** for production (GKE/EKS, GPU nodepool, IRSA hints, TLS ingress). Use ExternalSecrets or Vault for production secrets.
- **Local dev stack:** **`docker-compose.agent.yml`** (repo root) runs orchestrator, embedder, modelreasoner, ui, postgres, redis, minio for integration and smoke testing.
- **Install:** `helm upgrade --install pediscreen deploy/charts/pediagents -n pediscreen` or with prod overrides: `-f deploy/charts/pediagents/values.prod.yaml`. See `deploy/charts/pediagents/README.md` for GKE/EKS notes, GPU/tolerations, KMS/Vault, and canary rollout.

---

## Page 16 — Governance, Rollout Plan & Next Steps

### Rollout phases

- **Phase 0:** Local dev + synthetic data. PR1 scaffold + tests.
- **Phase 1:** Pilot in one clinic — EmbedderAgent, ModelReasonerAgent, DraftFormatterAgent; clinician UI + audit. Collect metrics (e.g. 1000 cases).
- **Phase 2:** Expand to 5 clinics; EHRConnectorAgent and bias audits.
- **Phase 3:** Optimize (distill, on-device); monitor drift and safety.

### Governance

- Model/adapter changes require **evaluation suite** + canary + consented re-eval.
- **Regulatory:** CDS design (human in loop); audit and consent artifacts **exportable** for compliance.

### Stage 1 minimum viable

Orchestrator + Agent Registry + Embedder + ModelReasoner (pseudo) + AuditAgent + basic UI hooks + tests + CI.

### Routing orchestrator (improved routing layer)

An additional **routing orchestration** layer is implemented under `orchestrator/app/` and related modules. It provides:

- **POST /route_task** — Validated task submission; idempotency by `idempotency_key`; routing by capability, consent, and locality; sync (fast path) or async (Redis Streams) with `task_id` returned (202 or 200).
- **POST /register_agent** — Agent registration and heartbeat for discovery.
- **Router** — `orchestrator/router.py`: capability-based and consent-aware candidate selection, edge preference, optional sync attempt for `analyze_monitor`.
- **Queue** — `orchestrator/queue.py`: Redis Streams (`tasks:urgent`, `tasks:high`, `tasks:normal`, `tasks:low`); `enqueue_task`, `enqueue_dlq`.
- **Audit & idempotency** — `orchestrator/db/audit.py`, `orchestrator/db/idempotency.py`: Postgres/SQLite; audit entry per routing decision; idempotency key → task_id.
- **Workers** — `orchestrator/workers/modelreasoner_worker.py`, `embedder_worker.py` (and entrypoints `modelreasoner/worker.py`, `embedder/worker.py`): XREADGROUP consumer, retries, DLQ.
- **Schemas** — `orchestrator/schemas/task_schema.json`, `agent_schema.json`.
- **Policies** — `orchestrator/policies.py`: consent, capability_for, filter_by_consent, prefer_edge.
- **Tests** — `tests/test_router_policy.py`, `tests/test_idempotency.py`, `tests/test_routing_integration.py`.
- **Smoke** — `scripts/smoke_test.sh`; **README** — `orchestrator/README.md`.

Run routing API: `uvicorn orchestrator.app.main:app --reload --port 8080`. Create tables: `python orchestrator/scripts/create_tables.py`. See `orchestrator/README.md` for env vars and smoke-test steps.

---

## Appendix A — Prompt Templates for ModelReasonerAgent

Standard prompt template for MedGemma (externalized, minimize hallucination):

**System:** You are MedGemma, a clinical assistant that summarizes multimodal pediatric screening input. Always explain evidence and uncertainty.

**User prompt:**

```
[CHILD AGE (months)]: {age}
[OBSERVATIONS]: {observations}
[QUESTIONNAIRE]: {questionnaire_json}
[IMAGE_EMBEDS_REF]: {embed_metadata}

Task: Provide
1) 2-4 bullet clinical summary
2) risk_level: low/monitor/high
3) 3 actionable parent-friendly recommendations
4) evidence list with provenance ids

Do not diagnose. Use "may indicate" phrasing.
```

Store **prompt metadata** in the audit log.

---

## Appendix B — Example E2E Test Scenario

1. Create synthetic image + observation (e.g. `data/synth_images.py` or fixture).
2. Call `POST /orchestrate/case` with `consent: true`.
3. Orchestrator calls Embedder → embedding returned.
4. Orchestrator calls ModelReasoner (pseudo) → draft returned.
5. Orchestrator writes audit entries.
6. UI retrieves case; clinician confirms draft; override via `POST /ui/override`.
7. Orchestrator records override; triggers EHR connector in test mode.
8. **Assert:** Audit entries exist for each agent; signed document created; no raw images stored unless `consent: true`.

---

## How to Use This Cursor Prompt

When pasted into Cursor:

1. **Create** the scaffolding (Page 13): `agents/common/`, `agents/embedder/`, `services/agent_registry/`, `orchestrator/`.
2. **Implement** agent base, registry, orchestrator, and EmbedderAgent (Pages 4–6).
3. **Add** tests, CI config, and docker-compose for local dev.
4. **Extend** README with onboarding, privacy/governance, and rollout plan.

### Optional next artifacts

- **PR 1 patch** — Full file diffs for agent base + embedder + orchestrator + tests.
- **Helm charts / k8s manifests** — For GKE/EKS.
- **UI mockups / React components** — HumanInLoop clinician review UI.

---

*End of Cursor Prompt — Specialized Multi-AI Agents for PediScreen (02-10-26-medgemma).*
