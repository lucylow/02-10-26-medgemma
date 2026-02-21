/**
 * Mock telemetry API for local frontend development.
 * Usage: node index.js  (listens on port 3001)
 * Set VITE_TELEMETRY_URL=http://localhost:3001 in frontend .env to use this.
 */
const http = require("http");

const PORT = process.env.PORT || 3001;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, apikey, authorization",
};

const mockOverview = {
  active_connection: true,
  last_used: new Date().toISOString(),
  total_requests: 1250,
  success_count: 1200,
  error_count: 30,
  fallback_count: 20,
  avg_latency_ms: 420,
  total_cost_usd: 0.0156,
  number_of_models: 2,
  top_model: { model_id: "google/gemini-3-flash-preview", calls: 800 },
  timeseries: [
    { date: "2026-02-14", calls: 180, errors: 4, fallbacks: 2, cost: 0.0022 },
    { date: "2026-02-15", calls: 220, errors: 6, fallbacks: 5, cost: 0.0028 },
    { date: "2026-02-16", calls: 190, errors: 3, fallbacks: 1, cost: 0.0024 },
    { date: "2026-02-17", calls: 210, errors: 5, fallbacks: 4, cost: 0.0026 },
    { date: "2026-02-18", calls: 200, errors: 4, fallbacks: 3, cost: 0.0025 },
    { date: "2026-02-19", calls: 130, errors: 2, fallbacks: 1, cost: 0.0016 },
    { date: "2026-02-20", calls: 120, errors: 6, fallbacks: 4, cost: 0.0015 },
  ],
};

const mockModels = {
  models: [
    {
      model_id: "google/gemini-3-flash-preview",
      provider: "google",
      calls: 800,
      avg_latency_ms: 380,
      error_rate: 2.5,
      fallback_rate: 1.2,
      cost_estimate_usd: 0.012,
      adapters: ["default"],
      last_used: new Date().toISOString(),
    },
    {
      model_id: "fallback-model",
      provider: "openai",
      calls: 450,
      avg_latency_ms: 520,
      error_rate: 4.0,
      fallback_rate: 3.0,
      cost_estimate_usd: 0.0036,
      adapters: ["backup"],
      last_used: new Date().toISOString(),
    },
  ],
  since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  trace_id: null,
};

const mockErrors = {
  errors: [
    {
      id: "e1",
      timestamp: new Date().toISOString(),
      model_id: "google/gemini-3-flash-preview",
      error_code: "RATE_LIMIT",
      status_code: 429,
      fallback_reason: null,
      latency_ms: 1200,
      trace_id: "abc123",
    },
  ],
  since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  trace_id: null,
};

const mockFallbacks = {
  fallbacks: [
    {
      id: "f1",
      timestamp: new Date().toISOString(),
      model_id: "google/gemini-3-flash-preview",
      fallback_reason: "timeout",
      screening_id: null,
      latency_ms: 5000,
    },
  ],
  reason_summary: { timeout: 1 },
  since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  trace_id: null,
};

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  const url = new URL(req.url || "", `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const action = url.searchParams.get("action") || "overview";

  const send = (status, body) => {
    res.writeHead(status, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  // Match Supabase edge function style: /telemetry?action=...
  if (pathname === "/telemetry" || pathname === "/functions/v1/telemetry") {
    switch (action) {
      case "overview":
        return send(200, mockOverview);
      case "models":
        return send(200, mockModels);
      case "errors":
        return send(200, mockErrors);
      case "fallbacks":
        return send(200, mockFallbacks);
      default:
        return send(200, mockOverview);
    }
  }

  if (pathname === "/health") {
    return send(200, { status: "ok" });
  }

  send(404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Mock telemetry server at http://localhost:${PORT}`);
  console.log("  GET /telemetry?action=overview|models|errors|fallbacks");
});
