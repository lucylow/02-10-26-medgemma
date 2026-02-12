# MedSigLIP Visuals — Annotated UI Mock (PediScreen AI)

**Purpose:** Define exactly what clinicians vs parents see. Aligns with screening-appropriate, regulator-aware design.

**Regulatory framing:** *"Visualizations are derived from image similarity analysis to support clinician review of developmental progression. They do not represent diagnoses, predictions, or clinical determinations."*

---

## 1. Role-Based Summary

| Element | Parents / Caregivers | Clinicians |
| :--- | :--- | :--- |
| Child's drawings | ✅ Yes | ✅ Yes |
| Simple timeline (dates only) | ✅ Yes | ✅ Yes |
| Reassuring language | ✅ Yes | N/A (clinical framing) |
| Similarity scores | ❌ Never | ❌ Never (display as "change" / "no change") |
| Embedding values | ❌ Never | ❌ Never |
| Heatmaps / overlays | ❌ Never | ⚠️ Optional, very subtle |
| Clustering ("5 similar, 1 outlier") | ❌ Never | ✅ Yes |
| Side-by-side longitudinal | ✅ Yes (images only) | ✅ Yes (with trend cues) |
| Technical disclaimers | ❌ Minimal | ✅ Yes |

---

## 2. Caregiver View — Components

### 2.1 Drawing Timeline (Parent sees)

```
┌─────────────────────────────────────────────────────────────────┐
│  Your child's drawings over time                                 │
│  Clinicians look at how these change as children grow.           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [Drawing 1]      [Drawing 2]      [Drawing 3]                  │
│   Visit 1          Visit 2          Visit 3                      │
│   12 mo            18 mo           24 mo                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Shown:**
- Raw images only
- Visit labels / ages
- One sentence: *"Clinicians look at how these change as children grow."*

**Not shown:**
- Similarity bars
- Trend arrows (→ stable, ↑ emerging, ↓ regressing)
- Any numeric scores
- "Detected features" or "observations"

---

### 2.2 Visual Evidence Card — Parent Variant

**Current behavior:** `VisualEvidenceCard` shows "Detected Features & Observations" to both roles.

**Target behavior (parent):** Replace with a simpler card:

```
┌─────────────────────────────────────────────────────────────────┐
│  Your child's drawing                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [Image preview]   This drawing was included in the screening.  │
│                     It helps clinicians see how your child      │
│                     is developing over time.                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Copy for parent:**
- Header: *"Your child's drawing"* (not "Visual Evidence Analysis")
- Body: *"This drawing was included in the screening. It helps clinicians see how your child is developing over time."*
- No findings list, no "Detected Features & Observations"

---

## 3. Clinician View — Components

### 3.1 Side-by-Side Longitudinal Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│  Image / Activity Insight Panel                    [MedSigLIP]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [Visit 1]     →    [Visit 2]     →    [Visit 3]                 │
│   12 mo              18 mo              24 mo                    │
│                                                                  │
│   Below:  ████░░░░  similarity bars (subtle)                     │
│           → stable   ↑ emerging   ↓ regressing                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

ℹ️ The highlighted regions indicate features the model identified as
   relevant to [domain], such as line continuity and shape control.
   These observations are not diagnostic findings.
```

**Shown:**
- Images in chronological order
- Subtle similarity bars (no numeric values)
- Trend arrows: → stable, ↑ emerging, ↓ regressing
- Domain-specific disclaimer

---

### 3.2 Embedding Similarity Timeline (Clinician-only)

```
┌─────────────────────────────────────────────────────────────────┐
│  Visual change over time                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ●──────●──────●──────●                                         │
│   V1     V2     V3     V4                                        │
│                                                                  │
│   [Label]: "Stable" | "No meaningful change" | "High variability"│
│   (Never: "normal" / "abnormal")                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Shown:**
- Dots = image embeddings (position reflects similarity)
- Distance = visual change over time
- Labels: "Stable", "No meaningful change", "High variability"

**Not shown:**
- Raw vectors
- Percentiles
- Thresholds labeled "normal/abnormal"

---

### 3.3 Repetition Clustering (Clinician-only)

```
┌─────────────────────────────────────────────────────────────────┐
│  Pattern overview                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Cluster A: [img][img][img][img][img]  5 similar drawings       │
│   Cluster B: [img]                       1 outlier               │
│                                                                  │
│   "This pattern appears repeatedly" (not "This is wrong")        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Shown:**
- Thumbnails grouped by similarity
- Count: "5 similar", "1 outlier"
- Neutral language: "This pattern appears repeatedly"

**Not shown:**
- "Diagnostic" or "problem" labels
- Red/yellow/green indicators

---

### 3.4 Optional Heat Overlay (Clinician, when enabled)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Image] + very faint transparency overlay                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   • Areas of repeated emphasis                                   │
│   • Spatial bias (e.g., crowding on one side)                    │
│                                                                  │
│   NOT: red danger zones, arrows to "problem areas"                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Checklist

| Component | Current | Target |
| :--- | :--- | :--- |
| `VisualEvidenceCard` for caregivers | Shows findings list | Replace with image + reassuring copy only |
| `VisualEvidenceCard` for clinicians | Shows findings | Keep; add disclaimer that findings are not diagnostic |
| Side-by-side longitudinal | Not implemented | Add for both roles; clinician gets trend cues |
| Embedding similarity timeline | Not implemented | Clinician-only |
| Repetition clustering | Not implemented | Clinician-only |
| Heat overlay | Not implemented | Clinician-only, optional |
| `VisualMilestoneTimeline` | Shown to both | Fine for both (milestone-based, not MedSigLIP-specific) |

---

## 5. Copy for Tooltips (Clinician)

| Element | Tooltip text |
| :--- | :--- |
| Similarity bar | "Visual consistency between visits. Does not indicate normal or abnormal." |
| Trend arrow | "Change detected over time. Interpretation is clinical." |
| Cluster view | "Drawings grouped by visual similarity. Supports pattern recognition." |
| MedSigLIP badge | "Encodes visual structure only. No diagnostic labels." |

---

## 6. One-Sentence Sound Bite (for UI / docs)

> **MedSigLIP doesn't tell us what's wrong — it helps us see what's consistent, what's changing, and what might be worth a closer look.**

---

## 7. Diagram: Raw Images vs MedSigLIP-Assisted Review

```
WITHOUT MedSigLIP:
  Clinician → [img1] [img2] [img3]  → relies on memory, subjective comparison

WITH MedSigLIP:
  [img1] [img2] [img3]  →  embeddings  →  aligned comparison, timeline, clusters
       ↓
  Clinician sees: consistency, change, variability
  Clinician interprets: meaning (human judgment)
```

---

*Last updated: 2025-02-11*
