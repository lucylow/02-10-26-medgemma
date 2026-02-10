# Human-in-the-Loop (HITL) Architecture

## 1. What “Human in the Loop” Means in PediScreen AI
Human-in-the-Loop in PediScreen AI means that AI agents may generate signals, summaries, and suggestions — but a licensed clinician remains the sole authority who can approve, modify, or discard outputs before anything is shared with families or used clinically.

**Key distinction:**
*   ❌ Not “AI assists clinician”
*   ❌ Not “AI flags diagnosis”
*   ✅ **AI prepares structured information; humans decide**

This aligns directly with clinical decision support (CDS) standards and positions the tool for **FDA Enforcement Discretion** as a non-device CDS.

---

## 2. Human Control Points (End-to-End)
Here is exactly where humans are in the loop across the PediScreen AI agent pipeline.

### 🔹 Control Point 1: Input Selection
*   **Human role:** Parent or clinician chooses what to upload; clinician selects screening context (age, concern type).
*   **Why it matters:** Prevents uncontrolled data ingestion and maintains clinical framing.

### 🔹 Control Point 2: Vision Review (MedSigLIP Outputs)
*   **AI does:** Encode images into embeddings; show similarity timelines / visual comparisons.
*   **Human does:** Views raw images side-by-side; interprets meaning.
*   **Rule:** The AI never labels images as “normal” or “abnormal.”

### 🔹 Control Point 3: Clinical Summary Review (MedGemma)
*   **AI does:** Generate a draft screening summary; suggest possible next screening steps.
*   **Human does:** Reviews the summary; edits language; removes or reframes any content; chooses whether to proceed.
*   **Technical enforcement:** Output is locked until clinician approval. No downstream agent can run without sign-off.

### 🔹 Control Point 4: Safety Escalation Gate
*   **AI does:** Detects unsafe language or overreach; flags “requires human review.”
*   **Human does:** Must explicitly acknowledge flagged issues; decide whether content is appropriate.
*   **Rule:** Elevated risk outputs cannot proceed automatically.

### 🔹 Control Point 5: Parent Communication Approval (Gemma 3)
*   **AI does:** Rewrite approved content for parents.
*   **Human does:** Reviews parent-facing explanation; can edit tone or wording; approves or cancels delivery.
*   **Critical rule:** No AI-generated text reaches parents without clinician approval.

### 🔹 Control Point 6: Final Sign-Off (Hard Stop)
*   **Human-only action:** Clinician clicks “Sign Off.”
*   **This action:** Unlocks delivery, writes immutable audit log, records clinician identity and timestamp.
*   **Without sign-off:** No delivery, no persistence, no reporting.

---

## 3. How HITL Is Enforced Technically
PediScreen AI enforces HITL at the architectural level, not just as a policy.

### A. State Machine Enforcement
The system follows a strict state progression:
`QUEUED` → `AI_COMPLETED` → `REQUIRES_REVIEW` → (clinician action) → `SIGNED_OFF` → `DELIVERED`

AI agents cannot transition states on their own past `REQUIRES_REVIEW`.

### B. API-Level Gating
The backend enforces approval checks. Example rule:
```python
if job.status != "signed_off":
    raise Forbidden("Clinician approval required")
```
This is backend-enforced, ensuring that the UI cannot bypass the clinical review step.

### C. Schema Locking
AI outputs must match predefined schemas. Humans can edit fields, override risk levels, or add notes, but AI cannot introduce new fields or change schema meaning.

### D. Immutable Audit Logging
Every step logs the agent output, human edits, approvals, and timestamps. This enables accountability, review, and legal defensibility.

---

## 4. Why HITL Matters
*   **🔐 Safety:** Prevents hallucinated diagnoses, stops inappropriate language, and forces contextual interpretation.
*   **⚖️ Liability:** AI is advisory only; human retains decision authority, aligning with FDA CDS guidance and ensuring the software remains a support tool rather than a regulated medical device.
*   **🤝 Trust:** Clinicians stay in control, and parents receive vetted information.

---

## 5. Summary for Stakeholders
PediScreen AI is designed as a human-in-the-loop clinical decision support system. AI agents generate visual signals, structured screening summaries, and draft explanations, but licensed clinicians remain the sole authority at every critical decision point. All AI outputs require clinician review, editing, and explicit sign-off before being shared with families. Safety agents automatically flag overreach or uncertainty, enforcing mandatory human review. This architecture ensures that AI augments clinical judgment without automating diagnoses or decisions, aligning with medical safety, regulatory guidance, and ethical best practices.
