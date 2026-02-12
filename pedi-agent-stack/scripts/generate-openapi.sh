#!/bin/bash
# OpenAPI generator commands for PediScreen Agents API
# Requires: openapi-generator-cli (brew install openapi-generator OR npm install @openapitools/openapi-generator-cli -g)
# Java is required for openapi-generator
# Run from pedi-agent-stack directory: ./scripts/generate-openapi.sh

set -e
cd "$(dirname "$0")/.."
OPENAPI_SPEC="${1:-openapi/pedi_agents.openapi.yaml}"

echo "Using OpenAPI spec: $OPENAPI_SPEC"
echo ""

# 1) Generate Python FastAPI server skeleton
echo "=== Generating Python FastAPI server skeleton ==="
openapi-generator-cli generate \
  -i "$OPENAPI_SPEC" \
  -g python-fastapi \
  -o generated-server/python-fastapi \
  --additional-properties=packageName=pedi_agents_api,packageVersion=1.0.0,projectName=pedi_agents_api

echo "Created: generated-server/python-fastapi"
echo ""

# 2) Generate TypeScript/JavaScript client (Axios)
echo "=== Generating TypeScript Axios client ==="
openapi-generator-cli generate \
  -i "$OPENAPI_SPEC" \
  -g typescript-axios \
  -o generated-client/ts-axios \
  --additional-properties=supportsES6=true,npmName=@yourorg/pedi-client,npmVersion=0.1.0

echo "Created: generated-client/ts-axios"
echo ""

# 3) Generate Python client
echo "=== Generating Python client ==="
openapi-generator-cli generate \
  -i "$OPENAPI_SPEC" \
  -g python \
  -o generated-client/py \
  --additional-properties=packageName=pedi_client

echo "Created: generated-client/py"
echo ""
echo "Done. Install Python client locally: pip install -e generated-client/py"
