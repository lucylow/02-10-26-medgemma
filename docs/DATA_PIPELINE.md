# PediScreen AI - Pediatric Developmental Datasets Research

## Quickstart & Data Pipeline

```bash
# 1. Clone & setup
git clone https://github.com/lucylow/02-10-26-medgemma
cd 02-10-26-medgemma
pip install -r requirements-data.txt

# 2. Download public datasets
make data-download
# Or on Windows: python data/download_public.py

# 3. Generate synthetic dataset (10K records)
make data-generate-synthetic
# Or on Windows: python src/data/synthetic_generator.py

# 4. Launch validation dashboard
streamlit run validation/dashboard.py
```

## Dataset Inventory

- **M-CHAT-R/F**: 17K+ autism screenings (mchatscreen.com)
- **CDC Milestones**: 300+ ground truth items (0–60 months)
- **Synthetic**: 10K CDC-grounded screening records

## Documentation

- **[Cursor Project Prompt: Production Data Pipeline & Privacy Overhaul](CURSOR_PROMPT_DATA_PIPELINE.md)** – 15+ page specification for synthetic data generation, HIPAA/GDPR privacy, anonymization, and production readiness

## Next Steps

- [ ] Clinician review 1K samples (Week 2)
- [ ] Taiwan DD dataset collaboration (Week 3)
- [ ] LoRA fine-tuning (Week 4)
- [ ] Multi-site validation (Month 2)
