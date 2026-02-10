# PediScreen AI — Deployment Portability & Operational Realism

PediScreen AI is designed as an offline-first, device-agnostic screening system that degrades gracefully from on-device inference to edge to cloud, allowing it to run in clinics, schools, community health programs, and low-connectivity settings.

---

## 1. Offline-first by default (not cloud-first)
Care is often delivered where connectivity is unreliable: rural clinics, schools, home visits, global health settings.
*   **Local Storage**: Mobile app stores images (drawings, activities), precomputed embeddings, and structured screening responses locally (SQLite).
*   **Inference options**: 
    *   **On-device (TFLite / CoreML)**: Best case for immediate feedback.
    *   **Local edge server (clinic laptop / tablet hotspot)**: Fallback for more complex reasoning.
    *   **Cloud API**: Only when available for advanced analytics or sync.
*   **Opportunistic Sync**: Background sync occurs only when connectivity is detected.

> **The system does not require continuous internet access. Screening can be completed fully offline, with secure synchronization occurring opportunistically.**

---

## 2. Multi-tier Inference Strategy
Instead of a single fixed deployment, PediScreen AI uses adaptive execution tailored to the environment.

### Tier 1: On-device (Schools, Home Visits)
*   Lightweight vision encoder (quantized MedSigLIP or distilled model).
*   Rule-based + small model triage.
*   **No PHI leaves the device.**

### Tier 2: Edge (Clinics, NGOs, Mobile Vans)
*   Laptop / mini-PC runs:
    *   Embedding server.
    *   MedGemma inference container.
*   Local network only.
*   Supports multiple devices concurrently.

### Tier 3: Cloud (Hospitals, Research, Population Health)
*   Kubernetes deployment.
*   Batch processing.
*   Analytics + retraining pipelines.

**Key Point:** Same API contract, same embeddings, same LoRA adapters — just different execution locations.

---

## 3. Device-agnostic Frontend
"Anywhere care is delivered" includes phones, tablets, shared devices, and low-cost hardware.
*   **React Native**: Single codebase for iOS + Android.
*   **Wide Compatibility**: Works on personal phones (parents), clinic tablets, and school-issued devices.
*   **Minimal Hardware Requirements**: 
    *   Standard camera.
    *   Basic CPU/GPU (no dedicated accelerator required).

> **PediScreen AI does not assume modern flagship hardware, enabling deployment on older or donated devices common in community care.**

---

## 4. No Single Point of Failure (Anti-centralization)
The system is architected to avoid reliance on centralized infrastructure.
*   **Autonomous Operation**: App works without login, cloud account, or an always-on backend.
*   **Self-hosting**: Clinics can self-host via dockerized model servers and local databases.
*   **Cloud is optional**, not required for core functionality.

---

## 5. Privacy-preserving by Geography
Different care settings have different rules. PediScreen AI adapts to local policy rather than forcing one compliance regime.

| Setting | Data Handling |
| :--- | :--- |
| **Home Screening** | On-device only |
| **School** | Local edge, anonymized |
| **Clinic** | Edge + encrypted sync |
| **Hospital** | Full cloud + audit logs |

---

## 6. Human-in-the-loop Everywhere
Running "anywhere" also means usable by non-specialists (teachers, community health workers, pediatricians).
*   **Clear Outputs**: "Screen positive / screen negative" with confidence bands.
*   **Non-diagnostic**: Clearly framed as a clinical decision support tool.
*   **Augmentation**: Designed to augment—not replace—human judgment.

---

## 7. Deployment Feasibility Summary
PediScreen AI is architected to run anywhere care is delivered by using an offline-first, device-agnostic design with tiered inference. Screenings can be completed fully on-device or via a local edge server in clinics, schools, or community programs, with optional cloud synchronization when connectivity allows. The same embedding and inference pipeline is reused across mobile, edge, and cloud environments, ensuring consistency without requiring centralized infrastructure. This approach enables equitable access to early developmental screening across high-resource hospitals, low-connectivity rural clinics, and in-home settings while preserving privacy and clinical safety.
