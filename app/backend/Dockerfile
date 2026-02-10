# Use a PyTorch runtime with CUDA if you will use GPU inference.
# Change tag to appropriate cuda/cudnn versions for your infra.
FROM pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy app
COPY app /app/app

EXPOSE 8000

ENV MEDGEMMA_MODEL_NAME=google/medgemma-2b-it
ENV ADAPTER_SOURCE=""
ENV ADAPTER_LOCAL_DIR=/app/adapters
ENV DEVICE_AUTO="1"
ENV LOG_LEVEL=INFO

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--loop", "uvloop"]
