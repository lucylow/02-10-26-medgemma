# Model server image (model-dev). Lightweight embed + infer API.
FROM python:3.11-slim

WORKDIR /app
COPY app/ /app/app/
COPY requirements.txt /app/ 2>/dev/null || true

RUN pip install --no-cache-dir fastapi uvicorn pydantic httpx pyyaml

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
