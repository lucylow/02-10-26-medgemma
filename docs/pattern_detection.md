# Patterns the Human Eye Can Miss — That PediScreen AI Can Catch

### Key Principle
The application does not see better than clinicians — it sees more consistently, over time, and across modalities.

---

### 1. Micro-patterns across time (temporal consistency)
**What humans often miss**
Clinicians usually see one snapshot per visit, in a time-limited appointment (10–20 minutes), without direct side-by-side comparison to prior visits. Subtle changes are easy to miss:
*   Slight improvement in grip stability.
*   Stagnation rather than regression.
*   Variability that looks “normal” in isolation.

**Example pattern**
*   **Visit 1:** child scribbles with whole-hand grasp.
*   **Visit 2 (3 months later):** still whole-hand grasp.
*   **Visit 3:** still no pincer emergence.
*   Each visit individually looks “borderline normal.” Across time, the absence of expected progression is the signal.

**How PediScreen AI catches it**
*   Stores embeddings of drawings/play artifacts per visit.
*   Computes delta vectors between timepoints.
*   Flags lack of developmental change, not absolute failure (trajectory pattern).

---

### 2. Cross-domain inconsistencies (multi-modal mismatch)
**What humans often miss**
Clinicians mentally integrate questionnaire answers, observed behavior, and drawings/play. Under time pressure, cross-checking these domains accurately is difficult.

**Example pattern**
*   **Parent reports:** “Uses words appropriately”.
*   **Drawing analysis:** Very immature fine motor control.
*   **Play video:** Avoids bimanual coordination.
*   Each signal alone is ambiguous; together, they suggest a domain-specific developmental imbalance.

**How PediScreen AI catches it**
*   Vision embeddings (MedSigLIP) + text embeddings.
*   MedGemma reasons over contradictions.
*   Flags inconsistency, not deficiency (joint reasoning).

---

### 3. Repetitive subtle behaviors (frequency bias)
**What humans often miss**
Humans overweight novel behaviors and memorable moments while underweighting repeated minor behaviors.

**Example pattern**
*   **In drawing/play images:** Consistently avoids crossing midline or repeatedly favors one hand in tasks that should be bilateral.
*   A clinician may notice this once and move on; the AI tracks every instance.

**How PediScreen AI catches it**
*   Counts frequency of micro-behaviors across media.
*   Embedding similarity clusters repeated postures.
*   Flags pattern repetition, not one-off behavior.

---

### 4. Shape, proportion, and spatial regularity drift
**What humans often miss**
In children’s drawings, proportions evolve gradually and symmetry emerges slowly. Small distortions look age-appropriate at a glance.

**Example pattern**
*   Objects consistently float without ground line.
*   Persistent lack of closed shapes past expected age.
*   Repeated spatial crowding on one side of page.
*   Individually normal; together and persistent, these indicate a fine motor / visuospatial signal.

**How PediScreen AI catches it**
*   Vision encoder captures spatial layout embeddings.
*   Compares against age-conditioned reference clusters.
*   Detects deviation trends, not absolute errors.

---

### 5. Variability masking (false reassurance)
**What humans often miss**
High variability can mask issues: one “good” performance reassures the clinician, and poorer performances are discounted.

**Example pattern**
*   Child alternates between very good and very poor motor execution.
*   Clinician remembers the “good” attempt.

**How PediScreen AI catches it**
*   Computes variance across attempts.
*   Flags instability, not just mean performance.

---

### 6. Silent absence of behaviors
**What humans often miss**
Humans notice what happens; they often miss what *never* happens.

**Example pattern**
*   Across multiple sessions: child never initiates drawing or never chooses fine-motor toys spontaneously.
*   Absence doesn’t stand out unless explicitly tracked.

**How PediScreen AI catches it**
*   Explicitly tracks non-occurrence.
*   Uses negative evidence over time.

---

### 7. Subthreshold combinations (weak signals adding up)
**What humans often miss**
Each signal is below referral threshold and explainable individually. But combined, they exceed concern.

**Example pattern**
*   Mild language delay + Mild fine motor delay + Mild social hesitation.
*   No single red flag, but the aggregate evidence is significant.

**How PediScreen AI catches it**
*   MedGemma integrates weak signals multiplicatively.
*   Generates screening risk explanation based on aggregate evidence.

---

### 8. Fatigue & cognitive load effects
**What humans often miss**
Late in the day, human attention narrows and subtle cues are missed.

**How PediScreen AI helps**
*   **Zero fatigue:** Same evaluation logic at 8am and 6pm.
*   Acts as a second set of eyes, not a judge.

---

### Summary
PediScreen AI identifies longitudinal, cross-modal, and frequency-based patterns that are difficult for the human eye to track reliably during time-limited visits. By analyzing changes over time, inconsistencies across inputs, and the absence or repetition of subtle behaviors, the system surfaces screening-relevant patterns for clinician review — without making diagnoses or replacing professional judgment.

**"We don’t claim superhuman vision — we provide superhuman consistency across time, modalities, and repetition."**
