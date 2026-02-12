# PediScreen AI — Real-World Impact Narrative

**Competition-Ready Impact Documentation**

This document articulates the substantial real-world impact of PediScreen AI by addressing critical shortcomings in the current system for pediatric developmental screening. The evidence shows that AI, when thoughtfully applied, can improve clinical outcomes, optimize healthcare workflows, and make early intervention more equitable and accessible.

---

## 📊 The Current Problem vs. The AI-Augmented Future

The table below contrasts the current reality of developmental screening with the potential impact of an AI-augmented system like PediScreen AI.

| **Aspect** | **Current State (The Problem)** | **AI-Augmented Future (The Solution)** |
| :--- | :--- | :--- |
| **Detection Accuracy & Timing** | Screening relies on paper questionnaires (e.g., ASQ, PEDS) with pooled sensitivity/specificity around **75–76%**. Specialists are overwhelmed, leading to delayed diagnoses; the median age of autism diagnosis is currently **~5 years**. | AI can standardize and enhance preliminary screening. A real-world AI diagnostic for autism (Canvas Dx) achieved diagnosis at a **median age of 37.2 months**—over 2 years earlier than the current standard. |
| **System Efficiency** | The process is manual, time-consuming, and creates bottlenecks. Specialist evaluations can take **3–8 hours**, and waitlists often exceed **a year**. | AI acts as a **force multiplier**. It can handle initial data intake and analysis, allowing specialists to focus on complex cases. This mirrors successful AI systems in mammography, which improved workflow without increasing false positives. |
| **Access & Equity** | Access to specialists is limited by geography and resources. Disparities exist in screening rates and timely diagnosis across demographics. | A standardized, AI-powered tool can be deployed via mobile app or web portal to **community health workers and pediatricians anywhere**, helping to bridge the access gap. |
| **Clinical Confidence** | General pediatricians may lack confidence in interpreting screening results or identifying subtle concerns, leading to under-referral or over-referral. | AI provides **decision support** with quantified, evidence-based risk assessments. Tools like Canvas Dx demonstrated a **97.6% Negative Predictive Value (NPV)** in real-world use, giving clinicians high confidence to rule out autism when appropriate. |

---

## 🎯 Quantifiable Impact Projections

Based on the performance of analogous AI tools, we project the potential impact of PediScreen AI in a target population.

### Earlier Identification

Following the precedent of reducing diagnosis age by over two years, a successful deployment could connect thousands more children to intervention services during the critical neurodevelopmental window.

### Improved Accuracy

Aiming to meet or exceed the real-world performance of existing AI diagnostics (e.g., **92.4% PPV**, **97.6% NPV**) would represent a significant improvement over the pooled accuracy of traditional tools (~75–76%). This means:
- **Fewer missed cases** — children with delays are identified sooner
- **Fewer unnecessary, costly specialist referrals** — children developing typically are appropriately ruled out

### System-Wide Efficiency

In a large-scale screening program, even a modest improvement in efficiency can have a massive effect. For context, an AI system for mammography reading involving **461,818 women** improved the cancer detection rate by **17.6%**.

---

## 🛣️ The Path to Real-World Implementation

Achieving this impact requires navigating the well-documented gap between developing an AI algorithm and implementing it in clinical practice. Success depends on factors beyond raw technical accuracy.

A holistic evaluation framework like **"AI for IMPACTS"** provides an excellent checklist. For PediScreen AI, key considerations include:

| **Framework Element** | **PediScreen AI Alignment** |
| :--- | :--- |
| **Integration & Workflow** | The tool must fit seamlessly into a pediatrician's or community health worker's existing visit flow, not create extra steps. Our upstream screening and automated documentation design streamlines workflows (see [Workflow Efficiency](workflow_efficiency.md)). |
| **Trust & Acceptability** | Clinicians must trust the tool's outputs. Built through transparency (explainable AI), rigorous validation, and designing the AI as a **supportive assistant, not a replacement** for clinical judgment. Our HITL architecture enforces this (see [HITL Architecture](hitl_architecture.md)). |
| **Safety & Regulation** | A clear pathway to regulatory approval (like the FDA clearance obtained by Canvas Dx) and robust data privacy safeguards are non-negotiable for clinical adoption. We position as CDS for FDA Enforcement Discretion (see [Legal Compliance](legal_compliance.md)). |

---

## 📈 Summary: The Impact Narrative

The real-world impact of PediScreen AI is a powerful combination of:

1. **Improved child health outcomes** — Earlier identification during the brain's peak plasticity window
2. **A more efficient and scalable healthcare system** — Force multiplier for specialists and general pediatricians
3. **Greater equity in access to early intervention** — Deployable to community health workers and pediatricians anywhere

The technical feasibility shown by MedSigLIP and MedGemma provides the foundation, but the realized impact will be determined by how effectively the application is integrated into clinical and community workflows.

---

## 📚 Evidence References

- **Canvas Dx**: Real-world AI diagnostic for autism; median diagnosis age 37.2 months; 97.6% NPV, 92.4% PPV; FDA-cleared
- **Traditional screening**: ASQ, PEDS with pooled sensitivity/specificity ~75–76%
- **Mammography AI**: 17.6% improvement in cancer detection (461,818 women)
- **Stanford 2025**: Fine-tuning on domain-specific pediatric data leads to significant performance improvements over general-purpose models
