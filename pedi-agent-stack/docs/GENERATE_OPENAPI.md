# OpenAPI Generator Commands

Generate server and client stubs from `openapi/pedi_agents.openapi.yaml`.

## Prerequisites

- **Java** (required by openapi-generator)
- **openapi-generator-cli**:
  - macOS: `brew install openapi-generator`
  - npm: `npm install @openapitools/openapi-generator-cli -g`

## Commands (copy-paste)

### 1. Python FastAPI server skeleton

```bash
openapi-generator-cli generate \
  -i openapi/pedi_agents.openapi.yaml \
  -g python-fastapi \
  -o generated-server/python-fastapi \
  --additional-properties=packageName=pedi_agents_api,packageVersion=1.0.0,projectName=pedi_agents_api
```

### 2. TypeScript/JavaScript client (Axios)

```bash
openapi-generator-cli generate \
  -i openapi/pedi_agents.openapi.yaml \
  -g typescript-axios \
  -o generated-client/ts-axios \
  --additional-properties=supportsES6=true,npmName=@yourorg/pedi-client,npmVersion=0.1.0
```

### 3. Python client

```bash
openapi-generator-cli generate \
  -i openapi/pedi_agents.openapi.yaml \
  -g python \
  -o generated-client/py \
  --additional-properties=packageName=pedi_client
```

## Usage

**Python client** (install locally):
```bash
pip install -e generated-client/py
```

**TypeScript client** (in clinician UI):
```typescript
import { DefaultApi } from './generated-client/ts-axios';

const api = new DefaultApi({ basePath: "http://localhost:7000" });
const response = await api.processCase({ /* body */ });
```

## Scripts

- `scripts/generate-openapi.sh` — run all generators (bash)
- `scripts/generate-openapi.ps1` — run all generators (PowerShell)
