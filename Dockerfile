# Multi-stage minimal image for PediScreen API
FROM python:3.10-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.10-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY . /app
ENV PYTHONUNBUFFERED=1
# CI-friendly defaults; override with REAL_MODE=true EMBED_MODE=real for production
ENV REAL_MODE=false
ENV EMBED_MODE=dummy
ENV FALLBACK_ON_ERROR=true
EXPOSE 8000
CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
