# Pedi-Agent-Stack

This folder contains a ready-to-run demo stack for the PediScreen AI agent system.

## 🚀 Quick Start

1.  **Ensure you have Docker and Docker Compose installed.**
2.  **Navigate to this folder:**
    ```bash
    cd pedi-agent-stack
    ```
3.  **Build and run the stack:**
    ```bash
    docker compose up --build
    ```

## 🏗️ Services Included

-   **embed-server** (Port 5000): Mock MedSigLIP embedding server.
-   **medgemma-llm** (Port 8000): Local LLM service using `google/flan-t5-small`.
-   **orchestrator** (Port 7000): Multi-agent wiring that coordinates requests.
-   **clinician-ui** (Port 3000): React-based web interface for clinicians.

## 🛠️ Utilities

### FAISS Seeding
To seed the retriever with de-identified examples:
1.  Create a folder `demo_images` and put some JPG/PNG files in it.
2.  Run (while the stack is up):
    ```bash
    python tools/populate_faiss.py --images demo_images --host http://localhost:5000/embed --out_dir infra
    ```

### Advanced Safety Agent
Located at `agents/safety_advanced.py`. It includes:
-   JSON Schema validation for MedGemma outputs.
-   Banned phrase detection (e.g., "diagnose", "100%").
-   NLI-based entailment check using `distilbart-mnli`.

## 📝 Notes
-   This demo uses small models (`flan-t5-small`, `distilbart-mnli`) for speed and local compatibility.
-   Replace with production endpoints (real MedGemma, MedSigLIP, etc.) for clinical use.
