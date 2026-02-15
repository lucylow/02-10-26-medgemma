.PHONY: dev test lint backend frontend orchestrator data-download data-generate-synthetic data-pipeline

# Quickstart: run backend + frontend
dev: backend

# Backend (FastAPI on port 8000)
backend:
	cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Vite on port 8080)
frontend:
	cd app/frontend && npm run dev

# Orchestrator (port 7000) — multi-agent pipeline (run from repo root)
orchestrator:
	PYTHONPATH=. python -m uvicorn orchestrator.main:app --reload --host 0.0.0.0 --port 7000

# Run backend tests
test:
	cd backend && pytest -q

# Lint backend
lint:
	cd backend && ruff check app/ && ruff format --check app/

# Download public datasets (M-CHAT, CDC milestones)
data-download:
	python data/download_public.py

# Generate 10K synthetic screening records
data-generate-synthetic:
	python src/data/synthetic_generator.py

# Run full data pipeline (Dagster)
data-pipeline:
	dagster dev -m pipelines.data_pipeline
