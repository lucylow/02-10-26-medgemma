# PediScreen Backend

A production-minded FastAPI service for developmental screening analysis. Supports form-data submit, MongoDB persistence, and pluggable model inference.

## Quick Start

### Local (venv)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Unix: source .venv/bin/activate
pip install -r requirements.txt
```

Set `MONGO_URI=mongodb://localhost:27017/pediscreen` (or run Mongo via Docker) and:

```bash
uvicorn app.main:app --reload --port 8000
```

### Docker Compose (recommended)

```bash
cd backend
docker-compose up --build
```

Backend: http://localhost:8000  
Health: http://localhost:8000/health

### Frontend

Set in `.env`:

```
VITE_PEDISCREEN_BACKEND_URL=http://localhost:8000
VITE_API_KEY=dev-example-key
```

## Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | — | Health check |
| `/api/analyze` | POST | `x-api-key` | Submit screening (form-data: childAge, domain, observations, image?) |
| `/api/screenings` | GET | `x-api-key` | List screenings |
| `/api/screenings/{id}` | GET | `x-api-key` | Get screening by ID |

## Example curl

```bash
curl -X POST "http://localhost:8000/api/analyze" \
  -H "x-api-key: dev-example-key" \
  -F "childAge=24" \
  -F "domain=language" \
  -F "observations=My 2-year-old says only about 10 words"
```

## Tests

```bash
cd backend
MONGO_URI=mongodb://localhost:27017/pediscreen API_KEY=dev-example-key pytest -q
```

## Config (.env)

See `.env.example`. Key vars:

- `API_KEY` — Required for `/api/*` endpoints
- `MONGO_URI` — MongoDB connection string
- `MEDGEMMA_MODE` / `MEDGEMMA_MODEL_NAME` — Optional HF model
- `ALLOWED_ORIGINS` — CORS origins (comma-separated)
