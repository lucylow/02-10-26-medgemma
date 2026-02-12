# OpenAPI generator commands for PediScreen Agents API (PowerShell)
# Requires: openapi-generator-cli (npm install @openapitools/openapi-generator-cli -g)
# Java is required for openapi-generator

param(
    [string]$OpenApiSpec = "openapi/pedi_agents.openapi.yaml"
)

$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot\..

Write-Host "Using OpenAPI spec: $OpenApiSpec" -ForegroundColor Cyan

# 1) Generate Python FastAPI server skeleton
Write-Host "`n=== Generating Python FastAPI server skeleton ===" -ForegroundColor Yellow
npx @openapitools/openapi-generator-cli generate `
  -i $OpenApiSpec `
  -g python-fastapi `
  -o generated-server/python-fastapi `
  --additional-properties=packageName=pedi_agents_api,packageVersion=1.0.0,projectName=pedi_agents_api

# 2) Generate TypeScript/JavaScript client (Axios)
Write-Host "`n=== Generating TypeScript Axios client ===" -ForegroundColor Yellow
npx @openapitools/openapi-generator-cli generate `
  -i $OpenApiSpec `
  -g typescript-axios `
  -o generated-client/ts-axios `
  --additional-properties=supportsES6=true,npmName=@yourorg/pedi-client,npmVersion=0.1.0

# 3) Generate Python client
Write-Host "`n=== Generating Python client ===" -ForegroundColor Yellow
npx @openapitools/openapi-generator-cli generate `
  -i $OpenApiSpec `
  -g python `
  -o generated-client/py `
  --additional-properties=packageName=pedi_client

Write-Host "`nDone. Install Python client: pip install -e generated-client/py" -ForegroundColor Green
Pop-Location
