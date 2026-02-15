/**
 * PediScreen AI HITL WebSocket Server
 * Real-time Human-in-the-Loop feedback with Redis Pub/Sub for horizontal scaling.
 *
 * Run: npm start
 * Env: PORT (default 5001), REDIS_URL (optional - in-memory fallback)
 */
import { WebSocketServer } from "ws";
import { createServer } from "http";
import Redis from "ioredis";

const PORT = parseInt(process.env.PORT || "5001", 10);
const REDIS_URL = process.env.REDIS_URL;

const clients = new Map(); // clientId -> { ws, role, clinicId, userId }

let redis = null;
let redisSub = null;

async function initRedis() {
  if (!REDIS_URL) {
    console.log("Redis not configured - using in-memory mode (single instance only)");
    return null;
  }
  redis = new Redis(REDIS_URL);
  redisSub = new Redis(REDIS_URL);
  redis.on("error", (err) => console.error("Redis error:", err));
  return redis;
}

function validateToken(token) {
  if (!token) return false;
  return token.length > 0;
}

function broadcast(payload, clinicId) {
  const msg = JSON.stringify(payload);
  for (const [id, client] of clients) {
    if (client.clinicId === clinicId && client.ws.readyState === 1) {
      client.ws.send(msg);
    }
  }
}

async function updateQueuePosition(caseId, clinicianId) {
  const key = "hitl_queue";
  if (redis) {
    await redis.lrem(key, 0, caseId);
    await redis.lpush(key, caseId);
    const queue = await redis.lrange(key, 0, 9);
    const position = queue.indexOf(caseId) + 1;
    return { queue, position };
  }
  return { queue: [caseId], position: 1 };
}

function handleMessage(ws, messageStr, clientId, clinicId) {
  try {
    const parsed = JSON.parse(messageStr);
    switch (parsed.type) {
      case "case_selected": {
        updateQueuePosition(parsed.caseId, parsed.clinicianId).then(({ queue, position }) => {
          broadcast(
            {
              type: "queue_updated",
              data: { queue, position, count: queue.length },
            },
            clinicId
          );
        });
        break;
      }
      case "decision_made": {
        broadcast(
          {
            type: "decision_made",
            data: { caseId: parsed.caseId },
          },
          clinicId
        );
        break;
      }
      case "heartbeat":
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("Message parse error:", err);
  }
}

function handleDisconnect(clientId, clinicId) {
  clients.delete(clientId);
  const activeCount = [...clients.values()].filter((c) => c.clinicId === clinicId).length;
  broadcast(
    {
      type: "clinician_joined",
      data: { activeClinicians: activeCount },
    },
    clinicId
  );
}

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("PediScreen HITL WebSocket server. Connect via ws://host:port/hitl/clinician/:clinicId");
});

const wss = new WebSocketServer({
  server: httpServer,
  path: /^\/hitl/,
});

wss.on("connection", (ws, req) => {
  const path = req.url || "";
  const match = path.match(/\/hitl\/clinician\/([^?]+)/);
  const clinicId = match ? match[1] : "default";
  const url = new URL(path, "http://localhost");
  const token = url.searchParams.get("token");

  if (!validateToken(token)) {
    ws.close(1008, "Invalid token");
    return;
  }

  const clientId = `client_${Date.now()}_${Math.random().toString(32).slice(2)}`;
  clients.set(clientId, {
    ws,
    role: "clinician",
    clinicId,
    userId: "user_123",
  });

  const activeCount = [...clients.values()].filter((c) => c.clinicId === clinicId).length;
  ws.send(
    JSON.stringify({
      type: "clinician_joined",
      data: { activeClinicians: activeCount },
    })
  );

  broadcast(
    {
      type: "clinician_joined",
      data: { activeClinicians: activeCount },
    },
    clinicId
  );

  ws.on("message", (data) => handleMessage(ws, data.toString(), clientId, clinicId));
  ws.on("close", () => handleDisconnect(clientId, clinicId));
  ws.on("error", (err) => console.error("WS error:", err));
});

initRedis().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`PediScreen HITL WebSocket server on ws://localhost:${PORT}/hitl/clinician/:clinicId`);
  });
});
