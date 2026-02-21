# PediScreen AI — Scalable Early Developmental Screening

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**1 in 6 children has a developmental delay, but most are identified too late.**

PediScreen AI leverages Google's open **MedGemma** foundation model to put expert-level developmental screening in the pockets of parents and Community Health Workers (CHWs). By combining text observations and visual evidence, PediScreen provides private, on-device, medically-aware reasoning to bridge the identification gap.

---

## 🎬 [Video Demonstration](https://link-to-your-video.com) | 📄 [Workflow & ROI](docs/workflow_efficiency.md) | 🌍 [Portability](docs/deployment_portability.md) | 🚀 [Hugging Face Trace](model/README.md) | 🧩 [Adaptability](docs/adaptability.md) | 👁️ [Pattern Detection Guide](docs/pattern_detection.md) | 🤝 [Human-in-the-Loop](docs/hitl_architecture.md) | 📴 [Offline Playbook](docs/offline_playbook.md) | ⚖️ [Legal Compliance](docs/legal_compliance.md) | 🎯 [Real-World Impact](docs/real_world_impact.md)

---

## 🧬 Model Tracing & Provenance
For the MedGemma Impact Challenge, we have implemented rigorous **Model Tracing** to prove the lineage of PediScreen AI back to the Google MedGemma foundation model.

*   **Provenance Trace:** Documentation of the lineage from `google/medgemma-2b-it`.
*   **Weight Trace:** Disclosure of the technical architecture, LoRA configurations, and fine-tuning scripts.

Detailed tracing information and the official Model Card can be found in our **[Hugging Face Repository/Model Card](model/README.md)**.

---

## ⚡ Workflow Efficiency: Removing Clinical Friction
**PediScreen AI streamlines workflows by shifting developmental screening upstream, structuring information automatically, and reducing redundant manual tasks for clinicians and caregivers.**

By shifting screening data collection before the visit and automating documentation, PediScreen AI reduces clinician time per screening visit by an estimated **10–15 minutes**. In a typical pediatric clinic, this translates to over **two clinician hours saved per day**, allowing providers to focus on evaluation and care planning rather than administration.

> **"PediScreen AI doesn’t add steps to clinical workflows — it removes them."**

See the [Detailed Workflow Efficiency Analysis](docs/workflow_efficiency.md) for time-savings breakdowns and ROI calculations.

---

## 🩺 Clinical Decision Support (CDS) Architecture
PediScreen AI facilitates diagnostic workflows by organizing, contextualizing, and communicating screening evidence so clinicians can make more informed diagnostic decisions.

*   **Pre-diagnostic signal collection:** Collects structured screening data and captures real-world behaviors (drawings, play) before the visit.
*   **Pattern highlighting:** Flags patterns associated with developmental domains and highlights specific observable features without overstepping into diagnosis.
*   **Longitudinal context:** Stores past screenings and shows trends over time, supporting evidence-based decisions rather than one-off impressions.
*   **Structured outputs:** Generates structured summaries and suggested documentation language for seamless integration into clinical workflows.

> **PediScreen AI is a clinical decision support system that facilitates, but does not automate, diagnosis.**

## 🤝 Human-in-the-Loop (HITL) Safety & Governance
PediScreen AI is designed as a human-in-the-loop clinical decision support system. AI agents generate visual signals, structured screening summaries, and draft explanations, but **licensed clinicians remain the sole authority at every critical decision point**.

*   **Mandatory Review:** All AI outputs require clinician review, editing, and explicit sign-off before being shared with families.
*   **State Machine Enforcement:** Technical gates prevent AI agents from delivering content without human approval (`REQUIRES_REVIEW` → `SIGNED_OFF`).
*   **Safety Escalation:** Safety agents automatically flag overreach or uncertainty, forcing mandatory human review.
*   **Immutable Audit Logs:** Records all human edits and approvals for accountability and legal defensibility.

See the [Detailed HITL Architecture Analysis](docs/hitl_architecture.md) for technical implementation details.

## 🧩 Adaptability: Designed for Global Scale
**PediScreen AI is adaptable by design: its workflows, models, data schemas, and deployment modes can be reconfigured without rewriting the core system.**

The platform adapts to different age groups, cultural contexts, screening standards, and care settings. By using configuration-driven logic and parameter-efficient LoRA adapters, PediScreen AI can evolve alongside clinical guidelines and local regulatory requirements.

*   **Modular Architecture**: Swap components (like image encoders) without touching the core.
*   **LoRA Adapters**: Rapidly adapt the base MedGemma model for specific languages or regions.
*   **Graceful Degradation**: Works with text-only, image-only, or multimodal inputs.
*   **User-Centric Outputs**: Tailored views for both clinicians (metrics) and caregivers (plain language).

See the [Detailed Adaptability & Scalability Analysis](docs/adaptability.md) for technical implementation details.

---

## 🏗️ Technical Architecture & Application Stack
A feasible solution requires a robust, scalable, and user-friendly technical architecture. The proposed stack is designed for **privacy-first, cross-platform functionality**.

| Component | Technology & Approach | Justification & Evidence |
| :--- | :--- | :--- |
| **Core AI Model** | **MedGemma** (HAI-DEF foundation model) with **Parameter-Efficient Fine-Tuning (PEFT)** like LoRA. | Foundation models are pretrained on broad data and can be effectively adapted for specific clinical tasks through fine-tuning. This approach is more efficient than training a model from scratch. |
| **Backend & API** | Microservices architecture (e.g., Node.js, Python/FastAPI). Database: MongoDB or similar NoSQL. | A scalable microservices architecture allows the platform to expand efficiently, as demonstrated in a successful multi-specialty pediatric care app. NoSQL databases effectively handle diverse, unstructured healthcare records. |
| **Frontend (Mobile)** | **React Native** for a cross-platform (iOS/Android) mobile application. | Using a framework like React Native allows for a single codebase to reach all users, which is a standard and efficient approach for healthcare apps. |
| **Frontend (Web Portal)** | **ReactJS** for responsive web portals for clinicians and administrators. | Provides a fast, device-optimized experience for desktop users, enabling complex data review and management. |
| **Security & Compliance** | HIPAA/GDPR-aligned protocols, **role-based access control (RBAC)**, end-to-end encryption. | Essential for any healthcare application handling protected health information (PHI). RBAC ensures data privacy by granting access tailored to user roles (parent, therapist, admin). |

## 🏗️ Repository Structure

```
pediscreen-ai/
│
├── app/
│   ├── backend/           # FastAPI service for MedGemma, Gemma 3, MedSigLIP
│   └── frontend/          # React Native / Web interface
│
├── pedi_screen/           # Modular CLI & packages (monitoring, validation, workflow)
│   ├── cli.py             # pedi infer | monitor | validate | workflow
│   ├── medgemma_core/     # Inference engine, model loader, explainability
│   ├── validation/        # Benchmark tests, bias audit
│   ├── monitoring/        # Metrics, aggregator, alerting
│   ├── clinical_workflow/ # FHIR connector, patient state
│   └── feedback/          # Clinician feedback service
│
├── configs/               # inference.yaml, monitor.yaml, alerts.json
├── data/
│   ├── processing/        # Scripts for synthetic data generation
│   └── validation_set/    # Sample data for evaluation (benchmark.json, bias_audit.json)
│
├── docs/
│   ├── workflow_efficiency.md    # ROI, time-savings, and workflow diagrams
│   ├── deployment_portability.md  # "Run anywhere" architecture
│   ├── impact_calculations.md    # Detailed health impact math
│   ├── pattern_detection.md      # Clinical vision guide
│   ├── offline_playbook.md       # Strategies for low-connectivity settings
│   ├── legal_compliance.md       # Regulatory strategy & liability mitigation
│   ├── dataset_research.md      # Pediatric dataset research & data strategy
│   └── data_acquisition_checklist.md  # Data acquisition progress tracker
│
├── model/
│   ├── finetuning/        # MedGemma LoRA tuning scripts
│   ├── inference/         # Model serving logic
│   └── evaluation/        # Benchmarks and performance metrics
│
├── README.md              # Project overview
└── requirements.txt       # Dependencies
```

## Cursor / Kaggle deployment

For a **single-prompt deployment** targeting the MedGemma Impact Challenge (Kaggle Gold), use the Composer prompt in **[docs/CURSOR_PROMPT_KAGGLE_PEDISCREEN_FINAL.md](docs/CURSOR_PROMPT_KAGGLE_PEDISCREEN_FINAL.md)**. It aligns with this repo (backend + `mobile-app/`), fixes pipeline and cache APIs, and includes Replit + Expo steps and an execution checklist.

---

## Lovable Cloud & Supabase Integration

PediScreen AI is configured for deployment on Lovable Cloud with Supabase:

- **Supabase Auth**: Login, signup, session management (`/auth/login`, `/auth/signup`)
- **Protected routes**: Dashboard, Cases require auth when Supabase is configured
- **Edge Functions**: `analyze`, `list_screenings`, `get_screening`, `health` (see `supabase/functions/`)
- **Backend JWT**: FastAPI accepts `x-api-key` or `Authorization: Bearer <Supabase JWT>`

### Quick Setup

1. Create a Supabase project and get URL + anon key from Dashboard > API
2. Set env vars (see `.env.example`):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend)
   - `SUPABASE_JWT_SECRET` (backend, for Bearer validation)
3. Deploy Edge Functions: `supabase functions deploy`
4. Run migrations: `supabase db push`

See [docs/RUNBOOK_LOVABLE.md](docs/RUNBOOK_LOVABLE.md) for the full deployment checklist. For inference failure modes, audit log, and recovery: **[RUNBOOK.md](RUNBOOK.md)**.

---

## 🚀 Getting Started (5-Minute Demo)

### Quickstart (Makefile)
```bash
# 1. Copy env and install deps
cp .env.example .env
cd backend && pip install -r requirements.txt
cd ../app/frontend && npm install

# 2. Run backend (port 8000) — uses mock data when no MedGemma configured
make backend

# 3. In another terminal: run frontend (port 8080)
make frontend

# 4. Open http://localhost:8080/pediscreen — submit a mock screening
```

**Demo vs Live:** Set `MOCK_MODE=true` (default) for mock data without MedGemma. Set `HF_MODEL` and `HF_API_KEY` (or Vertex) for live inference. See `.env.example`.

### Quick Start (Docker)
```bash
cd backend
docker-compose up -d
# Backend: http://localhost:8000
# Run tests: docker-compose run backend pytest -q
```

### 1. Backend (Model Server)
The backend uses FastAPI to serve the fine-tuned MedGemma model.
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Run Tests
```bash
cd backend
pytest -q
```

### Modular CLI (pedi)
```bash
pip install -e .
pedi --help
pedi validate run-suite --output ./validation_reports
pedi monitor status
pedi monitor alerts
pedi workflow sync
```
See [docs/architecture.md](docs/architecture.md) and [docs/developer_guide.md](docs/developer_guide.md) for the modular architecture.

### Inference API (POST /api/infer)
```bash
curl -X POST http://localhost:8000/api/infer \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-example-key" \
  -d '{"case_id":"test-1","age_months":24,"observations":"Parent reports few words","embedding_b64":"<base64-float32-bytes>","shape":[1,256]}'
```
Note: `embedding_b64` must be base64-encoded float32 bytes; length must match `prod(shape)*4`.
See [docs/api.md](docs/api.md) for full contract and embedding format.

### Embeddings & Preprocessing

This repo includes a small, testable embedding pipeline to generate L2-normalized embeddings suitable for downstream multimodal models.

**Quick demo (CPU-only):**
```bash
# create synthetic images
python -m data.synth_images --out_dir data/synth --n 3

# extract a pseudo-embedding (deterministic fallback)
python -m preprocess.embed -i data/synth/synth_000.png -o /tmp/emb.npy

# check shape
python - <<PY
import numpy as np
e = np.load("/tmp/emb.npy")
print(e.shape, e.dtype, e.mean(), e.std())
PY
```

If you have a MedSigLIP-like model available:
```bash
python -m preprocess.embed -i data/synth/synth_000.png -o /tmp/emb_real.npy -m <hf-model-or-path>
```

Note: real model extraction requires `transformers` and `torch` and is GPU-friendly; the CLI falls back to a deterministic pseudo-embedding in CI or demo environments. See `requirements-inference.txt` for optional dependencies.

### 2. Frontend (Web/Mobile)
The frontend is a React-based web app (scaffolded for high-fidelity prototyping).
```bash
cd app/frontend
npm install
npm run dev
```

## 🌍 Run Anywhere: Architectural Portability
PediScreen AI is architected for **operational realism**. It is an offline-first, device-agnostic system that degrades gracefully from on-device inference to edge to cloud, allowing it to run in clinics, schools, community health programs, and low-connectivity settings.

*   **Offline-First**: Core screening logic and data storage (SQLite) function without internet.
*   **Tiered Inference**: Dynamically switches between on-device (TFLite), local edge (Docker), and cloud (K8s).
*   **Device Agnostic**: Built with React Native to support a wide range of hardware, from flagship phones to older donated tablets.
*   **Privacy-Preserving**: Adapts data handling based on geography and care setting (e.g., PHI stays on-device in home settings). Supports client-side encryption for visual embeddings so raw images never leave the device.

---

## 🔒 Privacy & Security: First-Class PHI Protection

PediScreen AI implements a "Privacy-First" architecture to handle sensitive pediatric data.

### 1. Client-Side Embedding Encryption
Visual evidence (drawings, activities) is processed on-device via MedSigLIP/TFLite to generate embeddings. To protect these embeddings:
- **Asymmetric Encryption**: The mobile client encrypts embeddings using the server's Curve25519 public key.
- **Perfect Forward Secrecy**: Every encryption uses a unique ephemeral keypair.
- **Zero-Raw-Data Policy**: Raw images never leave the user's device unless explicit granular consent is granted for clinician review.

### 2. Key Management
- **Key Generation**: Use `app/backend/gen_keypair.py` to generate server keys.
- **Safe Storage**: The server private key is loaded via `SERVER_PRIVATE_KEY_B64` environment variable (best integrated with AWS KMS or GCP Secret Manager).

### 3. Usage (Developer)
**Server Setup:**
```bash
export SERVER_PRIVATE_KEY_B64="your-private-key-base64"
uvicorn app.backend.main:app
```

**Client Integration (React Native):**
```javascript
import { encryptEmbedding } from './privacy/encrypt_embedding';
const encrypted = await encryptEmbedding(myEmbedding, SERVER_PUB_KEY);
// POST to /analyze with { encrypted_embedding: encrypted }
```

---

## 🧠 The AI Magic: Multi-Model Reasoning
PediScreen AI uses a sophisticated multi-model stack to ensure clinical rigor, safety, and accessibility.

### 1. MedGemma: The Clinical Engine
General-purpose AI fails in clinical settings. We built upon **MedGemma** because:
*   **Medical Foundation:** Pre-trained on vast biomedical corpora for safe, nuanced clinical reasoning.
*   **Privacy First:** Optimized for on-device inference; no sensitive clinical data leaves the device.
*   **Clinical Reasoning:** Handles risk stratification and evidence-grounded summarization.

### 2. Gemma 3: The Generative Reasoning Layer
Gemma 3 acts as the communication, orchestration, and accessibility engine.
*   **Parent-Facing Explanations:** Rewrites clinical findings into emotionally safe, supportive, and grade-level appropriate language.
*   **Localization:** Handles multilingual translation and cultural adaptation of screening results.
*   **Clinician Orchestration:** Formats structured screening data into professional EHR-style notes (SOAP).
*   **Dynamic UX:** Generates conversational follow-up questions to engage caregivers.

### 3. MedSigLIP: The Clinical Vision Engine
MedSigLIP analyzes images and videos to extract objective visual evidence. 
*   **Drawing Analysis:** Extracts features like scribble form, pressure, and shape complexity.
*   **Activity Analysis:** Identifies hand/grip posture and body position.
*   **Multimodal Fusion:** Converts visual data into embeddings passed to MedGemma for final clinical synthesis.

## 📊 Impact & Feasibility

### 🔧 Model Fine-Tuning and Performance Analysis Strategy
**Feasibility is Proven, But Rigorous Validation is Key.**
Direct evidence shows that fine-tuning large models for pediatric tasks is a valid technical path. A 2025 Stanford study on AI for speech pathology found that while general-purpose models performed poorly on pediatric diagnostic tasks (e.g., ~55% accuracy), **fine-tuning on domain-specific data led to significant performance improvements**. This mirrors the approach for PediScreen AI.

**The performance analysis plan is rigorous and multi-faceted:**
1.  **Benchmark Against Gold Standards:** The fine-tuned MedGemma's outputs are compared to diagnoses from developmental-behavioral pediatricians and scores from established tools like the **Ages and Stages Questionnaire (ASQ)**.
2.  **Measure Standard Clinical Metrics:** Performance is evaluated using **sensitivity, specificity, and positive/negative predictive value**, which are standard for assessing screening tools.
3.  **Prioritize Safety & Explainability:** A core focus is minimizing false negatives (missing a delay). **Explainable AI (XAI)** techniques are integrated to provide clear reasons for the model's assessments, which is crucial for clinical trust and adoption.
4.  **Conduct Bias Audits:** Performance is rigorously tested across diverse demographic subgroups (ethnicity, socio-economic status, language) to identify and mitigate algorithmic bias.

### 🚧 Deployment Challenges and Mitigation Strategies

| Challenge | Evidence from Literature | Mitigation Strategy for PediScreen AI |
| :--- | :--- | :--- |
| **Data Scarcity & Privacy** | Pediatric data is limited due to strict consent requirements and privacy concerns. High-quality, labeled datasets for fine-tuning are difficult to obtain. | 1. **Synthetic Data Generation:** Create artificial datasets that simulate developmental patterns and concerns to bootstrap model training.<br>2. **Federated Learning:** Explore techniques to train the model across multiple institutions without sharing raw patient data. |
| **Integration into Clinical Workflow** | Tools fail if they don't fit into existing user routines. A study on a caregiver app achieved high usability (SUS score of 76) by using **human-centered co-design** with end-users. | Adopt a **co-design process** with pediatricians, community health workers, and parents from the outset. The application is designed to streamline, not disrupt, the current screening workflow. |
| **Regulatory Pathway** | Most FDA-cleared pediatric AI devices (SaMD) use the **510(k) pathway** and are concentrated in radiology. Novel diagnostic support tools require clear regulatory planning. | Position the initial tool as a **clinical decision support (CDS) software** intended to augment, not replace, clinician judgment. This informs a long-term strategy for regulatory clearance. |
| **Bias and Equity** | AI models can exhibit performance disparities across genders, ages, and languages. Developmental norms themselves vary cross-culturally. | Commit to **continuous bias auditing** and use diverse validation datasets. The tool is adapted and validated for different cultural and linguistic contexts, not simply translated. |

### 🩺 Practical Use: Beyond Benchmarking
In a projected pilot of 10,000 children, PediScreen AI aims for a 20-percentage-point increase in early identification.
*   **~320 additional children** identified early.
*   **$9.6M to $32M** in potential lifetime savings.
*   **Eliminating disparities:** Goal of >90% screening rates in underserved communities.

See the [Detailed Impact Assessment](docs/impact_calculations.md) for full methodology.

---

## ⚖️ Legal & Safety Appendix (Hackathon Submission)

PediScreen AI is designed as **Clinical Decision Support (CDS)** with human-in-the-loop. For production and regulatory filings, consult legal counsel. This demo is intentionally CDS-first.

### Disclaimer Text (Verbatim)

- **Short banner (clinician/CHW dashboards):** *"PediScreen AI: an AI-assisted screening aid for clinicians and CHWs. Outputs are draft suggestions — clinician review required."*
- **Draft disclaimer:** *"Draft (AI-Assisted): This summary was generated by PediScreen AI to assist clinical review. It combines parent input, questionnaire scores, and optional images. It is not a diagnosis. A qualified clinician must review, edit if needed, and sign before adding to the medical record."*
- **PDF footer:** *"PediScreen AI — Draft technical report. AI-assisted content; clinician review and sign-off required prior to clinical use."*

### FDA CDS Mapping & Risk Mitigation

| Document | Purpose |
|----------|---------|
| [FDA CDS Mapping](docs/fda_cds_mapping.md) | Line-by-line mapping to FDA CDS exemption criteria — feature → criterion traceability |
| [Risk-Mitigation Slides](docs/risk_mitigation_slides.md) | Slide deck for judges (10 slides, bullets + speaker notes) |
| [Legal Compliance](docs/legal_compliance.md) | Regulatory strategy, liability, privacy, bias, pediatric protections |

### Statement

> **PediScreen designed to operate as CDS for HCPs. Human clinician holds final decision-making authority.**  
> This mapping is for demonstration; seek legal counsel for a production determination.

---

## 📄 License
Distributed under the Apache 2.0 License. See `LICENSE` for more information.
