#!/usr/bin/env bash
# deploy_jetson.sh — Install JetPack deps, pull medgemma-server image, run benchmark
set -e
echo "Jetson deploy: ensure JetPack is installed, then build and run embedding/inference service."
docker build -t medgemma-server .
docker run --runtime nvidia -p 8000:8000 medgemma-server
