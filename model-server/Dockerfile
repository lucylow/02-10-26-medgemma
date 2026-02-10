# model-server/Dockerfile
FROM pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime

# set a working dir
WORKDIR /app

# system deps (small)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# copy requirements first for better caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# copy app code
COPY app /app/app

# expose port
EXPOSE 8000

# environment variables you can override at run time
ENV MEDGEMMA_MODEL_PATH=google/medgemma-2b-it
ENV TRANSFORMERS_OFFLINE=0

# start uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--loop", "uvloop"]
