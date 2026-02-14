# backend/Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# WeasyPrint (PDF) system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpango-1.0-0 libgdk-pixbuf2.0-0 libffi-dev libcairo2 \
    libpango1.0-dev libgdk-pixbuf2.0-dev shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

ENV PYTHONPATH=/app

EXPOSE 8080
ENV PORT=8080

# Cloud Run sets PORT; use it for compatibility
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
