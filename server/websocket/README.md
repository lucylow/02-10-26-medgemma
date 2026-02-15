# PediScreen HITL WebSocket Server

Real-time Human-in-the-Loop (HITL) WebSocket server for clinician collaboration, case queue updates, and streaming notifications.

## Quick Start

```bash
cd server/websocket
npm install
npm start
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5001 | WebSocket server port |
| REDIS_URL | — | Redis URL for Pub/Sub (optional; in-memory fallback) |

## Frontend Config

Add to `.env`:

```
VITE_WS_URL=ws://localhost:5001
```

For production: `VITE_WS_URL=wss://your-api.example.com`

## API

- **Connect**: `ws://host:port/hitl/clinician/:clinicId?token=...`
- **Messages**: `clinician_join`, `case_selected`, `decision_made`, `heartbeat`
- **Events**: `hitl_pending`, `case_update`, `clinician_joined`, `queue_updated`, `decision_made`

## Deployment

```bash
# With Redis (Upstash/DigitalOcean)
REDIS_URL=redis://... npm start

# Vercel/Render: run as separate service
```
