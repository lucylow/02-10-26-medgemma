# Impact Assessment Framework and Quantified Estimates

For **PediScreen AI**, the impact of a successful solution extends from immediate improvements in child development to long-term systemic transformation of pediatric healthcare. The impact potential is rooted in addressing a high-prevalence issue with a scalable, equitable solution.

> **Competition-ready narrative:** For a concise "Current Problem vs. AI-Augmented Future" comparison and real-world evidence (Canvas Dx, mammography AI, etc.), see [Real-World Impact](real_world_impact.md).

### 📊 Impact Assessment Framework and Quantified Estimates
The following table breaks down the anticipated impacts, the methodology for quantification, and the resulting evidence-based estimates.

| Impact Area | Impact Description & Beneficiaries | Calculation Methodology & Assumptions | Estimated Quantitative Impact (Pilot of 10,000 children) |
| :--- | :--- | :--- | :--- |
| **Primary Impact: Improved Early Identification** | **Main Impact:** Increase the proportion of children with delays identified before age 3. **Beneficiaries:** Children with delays, their families, and clinicians. | **Baseline:** ~1 in 6 children (16.7%) have a developmental delay; fewer than 50% are identified early.<br>**Calculation:** `(Total Children) * (Prevalence) * (Increase in Identification Rate)`. A conservative 20-percentage-point increase in the identification rate is assumed, based on app-driven workflow efficiency and parental engagement. | **~320 additional children** identified early. `10,000 * 0.167 * (0.70 - 0.50) = 334` |
| **Workflow Impact: Clinician Time Saved** | **Main Impact:** Drastically reduce administrative burden per screening visit.<br>**Beneficiaries:** Clinicians (Pediatricians, NPs, PAs). | **Assumptions:** Shifting screening upstream and automating documentation saves **10-15 minutes per visit**. Based on 12 visits/day.<br>**Calculation:** `(Time saved/visit) * (Visits/day)`. | **~2.4 Hours saved per clinician per day**, enabling higher quality care or increased patient volume. |
| **Economic Impact: ROI & Lifetime Savings** | **Main Impact:** Generate massive societal savings and direct clinic ROI.<br>**Beneficiaries:** School systems, taxpayers, and pediatric practices. | **Assumption:** Early intervention saves **$30k-$100k/child**. Direct ROI: **$50k-$85k/year** in clinician time saved (based on salary).<br>**Calculation:** `(Addl. children identified * $30k)` + `(Time saved * Hourly rate)`. | **$9.6M to $32M** in lifetime savings + **$50k-$85k** annual ROI per provider. |
| **Health System Impact: Optimized Specialist Utilization** | **Main Impact:** Reduce unnecessary specialist referrals for children developing typically, freeing capacity for complex cases.<br>**Beneficiaries:** Overburdened specialists, children awaiting diagnosis. | **Baseline:** Up to 30% of referrals to developmental pediatricians are for children with typical development.<br>**Assumption:** A reliable screening tool could reduce inappropriate referrals by 50%.<br>**Calculation:** Applied to the cohort of children screened "on track." | **Hundreds of specialist appointment hours saved annually** in a pilot region, reducing wait times for all. |
| **Equity Impact: Reducing Disparities** | **Main Impact:** Standardize access to high-quality screening, closing gaps for rural, low-income, and minority populations.<br>**Beneficiaries:** Underserved communities. | **Evidence:** Screening rates are lower for Medicaid enrollees and in lower-income zip codes.<br>**Calculation:** Deploy tool in target communities and measure the **closing gap in screening rates** compared to regional averages. | **Goal:** Achieve >90% screening rates in pilot communities, eliminating the existing 10-25 percentage point disparity. |
| **Family & Caregiver Impact** | **Main Impact:** Reduce parental anxiety, shorten "diagnostic odysseys," and empower families with knowledge and clear pathways.<br>**Beneficiaries:** Parents and primary caregivers. | **Qualitative Metric:** Measured via pre- and post-use surveys assessing anxiety, empowerment, and satisfaction.<br>**Quantitative Metric:** Reduction in time from first concern to accessing services (e.g., from 12 months to 3-4 months). | **Target:** Significantly improve caregiver quality-of-life scores and reduce time to service by >60%. |

### 🎯 Articulation of Anticipated Impact

If PediScreen AI works as designed, its impact will be **transformative, scalable, and equitable**:

1.  **For the Child**: The most critical impact is intercepting developmental challenges during the brain's peak plasticity. Earlier identification leads to more effective, less intensive interventions, directly improving long-term outcomes in language, cognition, and social integration. This changes life trajectories.
2.  **For the Healthcare System**: The tool acts as a **force multiplier**. It makes universal, high-quality screening feasible without requiring a tenfold increase in specialist capacity. By automating scoring and triage, it allows community health workers and general pediatricians to practice at the top of their license, creating a more efficient and resilient system.
3.  **For Society**: The economic argument is compelling. Investing in early childhood screening has one of the highest returns of any public health intervention. The millions saved per pilot community represent funds that can be redirected to other critical services. Furthermore, by building a more developmentally healthy population, we foster future educational achievement and community well-being.

### ⚠️ Limitations and Responsible Scaling
These impact projections are based on the successful adoption and effective use of the tool. Realizing them requires:
*   **Successful Integration**: Impact depends on the tool being woven into standard clinical and community workflows.
*   **Bias Mitigation**: The model must perform equitably across all demographics to ensure the equity impact is realized, not just projected. **PediScreen AI commits to continuous bias auditing across diverse demographic subgroups.**
*   **Sustainable Implementation**: Long-term impact requires a viable business or public health model for ongoing support and updates.

### 🧪 Technical Feasibility & Validation
Direct evidence shows that fine-tuning large models for pediatric tasks is a valid technical path. A 2025 Stanford study on AI for speech pathology found that while general-purpose models performed poorly on pediatric diagnostic tasks (e.g., ~55% accuracy), **fine-tuning on domain-specific data led to significant performance improvements**.

**The validation strategy includes:**
1.  **Benchmarking Against Gold Standards:** Comparing outputs to diagnoses from developmental-behavioral pediatricians and ASQ scores.
2.  **Standard Clinical Metrics:** Evaluation using sensitivity, specificity, and positive/negative predictive value.
3.  **Explainability:** Integrating XAI techniques to provide clear reasons for assessments, crucial for clinical trust.
