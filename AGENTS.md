# PediScreen AI — Agent & Composer Guidance

**Repo layout:** See [REPO_STRUCTURE.md](REPO_STRUCTURE.md) for where things live and which paths Lovable Cloud requires at repo root.

## Training pipeline (Kaggle Gold)

- **Full Composer prompt:** [docs/CURSOR_PROMPT_PEDISCREEN_TRAINING_PIPELINE.md](docs/CURSOR_PROMPT_PEDISCREEN_TRAINING_PIPELINE.md) — 25+ page production fine-tuning (QLoRA MedGemma-2B, ASQ-3, CHW feedback, merge & deploy).
- **Cursor rule:** `.cursor/rules/pediscreen-training.mdc` — applies when editing `training/**`, `eval/*.py`, `data/*.json`.
- **Run pipeline:** `bash scripts/run-pediscreen-training.sh` (from repo root).

## UX
- Toasts for screening/orchestrate success and errors: `src/hooks/useAgentOrchestrator.ts` (sonner). Dashboard recent cases loading: skeleton in `AgentDashboard.tsx`.
- **Lovable app (canonical UI):** [https://medgemma13213123.lovable.app/](https://medgemma13213123.lovable.app/) — this repo is built on top of that deployment. Run `npm run start` to serve a local redirect to the Lovable app; use `npm run start:demo` to serve the static demo in `frontend/`.
- **Static demo:** `frontend/index.html` — standalone CHW + Clinician Review UI with smart mock and optional `/api/analyze` backend. See `frontend/README.md`.

## Key paths

| Role | Path |
|------|------|
| QLoRA train | `training/train.py` |
| Data prep | `training/prepare-datasets.py` |
| CHW feedback | `training/feedback-processor.py` |
| Merge & deploy | `training/merge-and-deploy.py` |
| Clinical validation | `eval/clinical-validator.py` |
| Config | `training/config/pediscreen_2b_config.py` |

## Agent workflow (HAI-DEF)

The app reimagines the screening pipeline by deploying **HAI-DEF models as intelligent agents** (callable tools) for better efficiency and outcomes.

- **Backend:** `USE_HAI_PIPELINE=true` and `USE_AGENT_PIPELINE=true` (config) run the **ScreeningAgent** (model + MCP tools: milestone, risk, confidence, guideline, audit) instead of raw inference.
- **Orchestration:** `POST /api/orchestrate/case` runs the full agent workflow for one case and returns an **AgentCallResponse** (output, diagnostics, provenance). Use this when the frontend uses agentic UI.
- **Callable agents:** `backend/app/agents/call_agent.py` — `call_agent(endpoint, payload)` with retries (tenacity) and optional circuit breaker (sync path) to invoke remote agents (Embedder, ModelReasoner, TriageScorer, etc.).
- **Contracts:** `backend/app/agents/schemas.py` — **AgentCallRequest** / **AgentCallResponse** for consistent JSON/RPC per agent.
- **Frontend:** When online and `embedding_b64` is provided, `useAgentOrchestrator` calls **orchestrateCase()** (HAI-DEF workflow) and merges the backend result into agent state (medgemma output, then complete case).

| Role | Path |
|------|------|
| Agent schemas | `backend/app/agents/schemas.py` |
| call_agent helper | `backend/app/agents/call_agent.py` |
| Orchestrate API | `backend/app/api/orchestrate.py` |
| Frontend orchestrateCase | `src/api/medgemma.ts` → `orchestrateCase()` |
| Orchestrator hook | `src/hooks/useAgentOrchestrator.ts` (options.embedding_b64 → real backend) |

Full multi-agent spec (Embedder, ModelReasoner, TriageScorer, Audit, EHR, etc.): [docs/CURSOR_PROMPT_SPECIALIZED_MULTI_AI_AGENTS.md](docs/CURSOR_PROMPT_SPECIALIZED_MULTI_AI_AGENTS.md).

## HAI-DEF observability (W&B, OpenTelemetry, Prometheus)

- **W&B:** `src/lib/tracing/wandb.ts` — optional when `WANDB_API_KEY` is set; `initWandBTrace`, `logInferenceTrace`, `finishWandBTrace`; project `pediscreen-prod`.
- **OpenTelemetry:** `src/lib/tracing/opentelemetry.ts` — `traceInference('medgemma.inference', fn)` and `startSpan`; tracer `pediscreen`.
- **Prometheus:** `src/lib/metrics/prometheus.ts` — `recordInference`, `recordSafetyRejection`; GET `/metrics` via `src/api/edge/metrics.ts` (Lovable edge).
- **Edge infer:** `src/api/edge/infer.ts` wires all three: every POST /infer gets a W&B trace (if key set), an OTel span, and Prometheus counters/histogram.
- **Tests:** Vitest stubs for optional deps in `src/test/stubs/` and `vitest.config.ts` aliases so tests pass without installing `@wandb/sdk`, `@opentelemetry/api`, `prom-client`. For production install use `npm install --legacy-peer-deps` if needed.

## OpenVINO (Intel edge inference)

- **Purpose:** Optimize pose/motor and cry detection on Intel hardware (CPU, GPU, NPU, VPU) — INT8 IR, ~3x speedup, ~50% model size reduction.
- **Backend:** `OPENVINO_ENABLED=true`, `OPENVINO_POSE_IR_PATH`, `OPENVINO_CRY_IR_PATH`; service `openvino_service.py`; API `POST /api/openvino/motor`, `POST /api/openvino/cry`.
- **FHIR:** Motor → LOINC:45490-7; Cry → SNOMED:410430002 (build_motor_observation, build_cry_observation in fhir_observation_builder).
- **Export:** Edge Impulse ONNX → OpenVINO IR via `scripts/openvino_export_ir.sh`; optional deps in `backend/requirements-openvino.txt`.
- **Doc:** [docs/OPENVINO_INTEGRATION.md](docs/OPENVINO_INTEGRATION.md).

## On-device voice & virtual assistants

- **Purpose:** Siri and Google Assistant with on-device processing for infant vocalization and cry analysis, passive language screening (CSBS), zero cloud PHI.
- **Pipeline:** Wakeword ("Hey PediScreen") → 15s rolling buffer → MFCC + prosody → MobileBERT/Whisper-Tiny + cry classifier → MedGemma LoRA → CSBS score / distress alert → FHIR.
- **Backend cry (Intel):** OpenVINO `POST /api/openvino/cry` (see OpenVINO section above).
- **iOS:** Siri App Intents (`PediScreenScreeningIntent`, `CryDistressIntent`), on-device cry detector (AVAudioEngine + stub classifier) — reference: `mobile/ios/PediScreenIntent.swift`, `mobile/ios/CryDetector.swift`.
- **Frontend types:** `src/types/voice.ts` (CSBS, cry types, vocal features, multimodal fusion).
- **Doc:** [docs/ON_DEVICE_VOICE_AND_VIRTUAL_ASSISTANTS.md](docs/ON_DEVICE_VOICE_AND_VIRTUAL_ASSISTANTS.md).

## Smart Home / Baby Cam (passive developmental surveillance)

- **Purpose:** Passive motor surveillance from Nest Cam, Ring doorbell, Nanit Pro, and baby cams via edge TFLite pose → BIMS scoring. Raw video stays on device/Home Hub; backend accepts precomputed pose features only (HIPAA).
- **Backend:** `POST /api/smart_home/motor_analysis` (JSON: pose_features, room_context, child_age_months), `POST /api/smart_home/motor_analysis/upload` (multipart stub), `POST /api/smart_home/ring_motor_analysis` (motion_event_id, home_hub_token).
- **Schemas:** `backend/app/schemas/smart_home.py` — SmartHomeMotorAnalysisRequest/Response, RingMotorAnalysisRequest; device types: nest, ring, nanit, generic.
- **Service:** `backend/app/services/smart_home_motor_service.py` — analyze_smart_home_motor, analyze_ring_motor; integrates OpenVINO when pose_features contain IMU-like signal.
- **Pose:** MoveNet SinglePose Lightning (infant LoRA) on device/Home Hub; see [docs/LITERT_EDGE_DEPLOYMENT.md](docs/LITERT_EDGE_DEPLOYMENT.md) and Nanit/RPi proxy in doc.

| Role | Path |
|------|------|
| Smart home API | `backend/app/api/smart_home.py` |
| Motor service | `backend/app/services/smart_home_motor_service.py` |
| Schemas | `backend/app/schemas/smart_home.py` |

## CT 3D & Edge (portable CT / pedCAT)

- **Purpose:** 3D CT integration for Edge AI Prize — MedGemma-2B-IT-Q4 on portable CT (Canon Aquilion Go, Siemens Go.Top), cone-beam CT, and pedCAT WBCT for offline pediatric 3D analysis.
- **Backend:** `backend/app/services/dicom_ingest.py` (DICOM/NIfTI → Hounsfield normalization, 64³ patch extraction); `POST /api/ct/preprocess`, `POST /api/ct/infer`.
- **Schemas:** `backend/app/schemas/ct.py` — CTVolumeMetadata, CTInferRequest/Response, CTFinding; anatomy/modality (head, chest, extremity, WBCT).
- **Use cases:** Preemie IVH (CT head), pediatric fractures, abdominal emergencies, oncology staging; pedCAT for extremity/scoliosis/foot-ankle (95%+ dose reduction, weight-bearing).
- **Doc:** [docs/CT_3D_EDGE_INTEGRATION.md](docs/CT_3D_EDGE_INTEGRATION.md).

## Federated Learning (privacy-preserving training)

- **Architecture:** Flower clients (hospitals/CHW) train MedGemma LoRA locally; server aggregates with FedAvg + differential privacy (ε=1.0). No raw data leaves devices.
- **Paths:** `training/federated/client.py`, `training/federated/server.py`, `training/federated/config.py`.
- **Contracts:** `contracts/PediScreenFedCoordinator.sol`, `contracts/PEDIRewardToken.sol` — register, submit gradient hashes, earn $PEDI (10 per datapoint). Deploy: `npx hardhat run scripts/deploy-federated.js --network polygonAmoy`.
- **Frontend:** `src/components/blockchain/FedLearningClient.tsx`, `src/hooks/useFedLearning.ts` — register client, submit gradients (hash + datapoints).
- **Doc:** [docs/FEDERATED_LEARNING.md](docs/FEDERATED_LEARNING.md).

## HIPAA blockchain (on-chain/off-chain)

- **Contracts:** `contracts/PediScreenRecords.sol`, `contracts/PediScreenGovernor.sol`, `contracts/PSDAOToken.sol` — HIPAA-compliant screening records (hashes only), consent, audit trail; DAO + timelock.
- **NFT + payments (Polygon):** `contracts/PediScreenRegistry.sol` (ERC721 screening NFTs), `contracts/PaymentEscrow.sol` (USDC micropayments); deploy: `npx hardhat run scripts/deploy-blockchain.js --network polygonAmoy`.
- **Frontend:** `src/hooks/usePediScreenWallet.ts`, `src/components/blockchain/` (ConnectWalletButton, ScreeningResultBlockchain), `src/config/blockchain.ts` — WalletConnect, mint screening NFT; optional `src/providers/WagmiProvider.tsx` when wagmi is installed.
- **Supabase:** `supabase/functions/verify-screening` — verify on-chain screening by tokenId/aiReportHash.
- **Doc:** [docs/BLOCKCHAIN_INTEGRATION.md](docs/BLOCKCHAIN_INTEGRATION.md).
- **Mobile (MetaMask + mock login):** [docs/METAMASK_MOBILE_INTEGRATION.md](docs/METAMASK_MOBILE_INTEGRATION.md); reference code in `mobile/`.

## HealthChain POC (patient data exchange)

- **Contract:** `contracts/HealthChainPOC.sol` — Base L2 patient data exchange (HIPAA/DSCSA): CHW creates record (encrypted FHIR → IPFS → hash + signature), consent manager, clinic/EHR access with audit.
- **Deploy:** `npx hardhat run scripts/deployHealthChain.js --network base-sepolia` or `--network base-mainnet`. Set `VITE_HEALTH_CHAIN_POC_ADDRESS` and `VITE_CHAIN_ID` (8453/84532) in frontend.
- **Frontend:** `src/hooks/useHealthChain.ts` (submitToHealthChain, grantClinicAccess, accessRecord, verifyRecordAccess), `src/services/healthChain.ts` (encrypt/decrypt FHIR, IPFS, recordHash/signature helpers), `src/components/blockchain/VerifyHealthChainRecord.tsx` (clinic verify & import).
- **Tests:** `npm run test:healthchain` — CHW create record, grant consent, clinic access, verifyRecord, revoke consent.

## Deployment / Kaggle

- **Backend & mobile:** See [docs/CURSOR_PROMPT_KAGGLE_PEDISCREEN_FINAL.md](docs/CURSOR_PROMPT_KAGGLE_PEDISCREEN_FINAL.md).
- **Multi-agent:** [docs/CURSOR_PROMPT_SPECIALIZED_MULTI_AI_AGENTS.md](docs/CURSOR_PROMPT_SPECIALIZED_MULTI_AI_AGENTS.md).

## Digital pathology (WSI integration)

Pediatric whole-slide imaging (WSI) and patch analysis integrated with screening for oncology/rare disease workflows (screening-to-pathology continuum).

| Role | Path |
|------|------|
| Pathology types (frontend) | `src/types/pathology.ts` |
| ScreeningContext pathology state | `src/contexts/ScreeningContext.tsx` (pathology, setPathology) |
| Pathology API schemas | `backend/app/schemas/pathology.py` |
| WSI/patch processor | `backend/app/services/pedi_pathology_processor.py` |
| MedGemma pathology prompt & infer | `app/backend/medgemma_service.py` (build_prompt_pathology, infer_pathology) |

PediPathologyProcessor: pediatric tile extraction (stub), Macenko stain norm (stub), patch analysis → MedGemma integration (path_correlation, integrated_risk, next_steps). Phase 2: scanner APIs, DICOM viewer, tumor/grading models.

## Pediatric MRI (3D volumetric)

Field-to-MRI continuum: CHW screening → high-risk MRI referral → 3D volumetric analysis (T1/T2/DTI) → brain age, risk amplification → GLTF export for dashboard.

| Role | Path |
|------|------|
| MRI schemas | `backend/app/schemas/mri.py` |
| MRI processor | `backend/app/services/pedi_mri_processor.py` |
| MRI API | `backend/app/api/mri.py` — `POST /api/mri/analyze`, `POST /api/mri/export-nifti` |
| Frontend types | `src/types/mri.ts` |
| Optional deps | `backend/requirements-mri.txt` (SimpleITK, nibabel, trimesh, scikit-image) |

Pipeline: DICOM/NIfTI load → segmentation stub (nnU-Net/MONAI when installed) → brain age stub (NeuroNet/ABCD) → risk fusion with PediScreen prior → optional marching-cubes GLTF. Doc: [docs/MRI_INTEGRATION.md](docs/MRI_INTEGRATION.md).

## LiteRT (TensorFlow Lite) edge deployment

- **Doc:** [docs/LITERT_EDGE_DEPLOYMENT.md](docs/LITERT_EDGE_DEPLOYMENT.md) — architecture, conversion, hardware delegates, benchmarks.
- **Conversion:** `model-dev/litert/convert_medgemma_to_litert.py` — MedGemma SavedModel → INT8 .tflite (91% accuracy target).
- **Coral EdgeTPU:** `model-dev/litert/coral_edgetpu_inference.py` — MoveNet Infant on RPi (~18ms).
- **C++ runtime:** `model-dev/litert/pediscreen_runtime.{h,cpp}` — unified pose + voice + fusion (iOS/Android/embedded).
- **iOS Neural Engine:** `mobile/ios/LiteRTNeuralEngine.swift` — zero-copy camera buffer, `pediscreen_multi.tflite`.
- **TFLite embedder (mobile):** [mobile/TFLITE_README.md](mobile/TFLITE_README.md).

## Jetson (NVIDIA) edge deployment

- **Purpose:** High-performance embedded AI (Orin Nano 8GB = 40 TOPS) for clinic workstations and mobile CHW units — MedGemma-2B INT8 via TensorRT-LLM, ~1.7 s/screening, 18–24 screenings/hour.
- **Doc:** [docs/JETSON_EDGE_DEPLOYMENT.md](docs/JETSON_EDGE_DEPLOYMENT.md) — Orin Nano specs, software stack (JetPack 6, TensorRT, Wallet Connect, React Native), pinout, benchmarks, deployment configs (clinic / mobile / RPi co-processor), security/compliance, economics.
- **Deployment:** JetPack 6.0 → TensorRT engine build → `docker-compose` PediScreen container; optional `jetson-cluster.yaml` for auto-scaling.
- **Comparison:** See doc for Orin Nano vs Nano 4GB, Orin NX, AGX Orin; complements LiteRT (TFLite/Coral/iOS) and OpenVINO (Intel).
