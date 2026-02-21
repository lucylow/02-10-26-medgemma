/**
 * Mock agent + monitoring API for demos, judges, and pilots.
 * POST /agent/run, GET /monitoring/drift, GET /monitoring/bias, GET /health
 * Configurable via env: PORT, MOCK_LATENCY_MIN_MS, MOCK_LATENCY_MAX_MS, MOCK_ERROR_RATE, MOCK_DRIFT_SPIKE
 */
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 4000;
const LATENCY_MIN = Number(process.env.MOCK_LATENCY_MIN_MS) || 200;
const LATENCY_MAX = Number(process.env.MOCK_LATENCY_MAX_MS) || 700;
const ERROR_RATE = Number(process.env.MOCK_ERROR_RATE) || 0;
const DRIFT_SPIKE = process.env.MOCK_DRIFT_SPIKE === "true";

const dataDir = path.join(__dirname, "data");
let mockData = [];
let mockDrift = [];
let mockBias = {};

function loadMockData() {
  try {
    const dataPath = path.join(dataDir, "mock_data.json");
    if (fs.existsSync(dataPath)) {
      mockData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    }
  } catch (e) {
    console.warn("mock_data.json not found or invalid, using in-memory responses");
  }
  try {
    const driftPath = path.join(dataDir, "mock_drift.json");
    if (fs.existsSync(driftPath)) {
      mockDrift = JSON.parse(fs.readFileSync(driftPath, "utf8"));
    } else {
      mockDrift = [
        { date: "2026-01", psi_score: 0.12 },
        { date: "2026-02", psi_score: DRIFT_SPIKE ? 0.31 : 0.18 },
      ];
    }
  } catch (e) {
    mockDrift = [{ date: "2026-02", psi_score: DRIFT_SPIKE ? 0.28 : 0.15 }];
  }
  try {
    const biasPath = path.join(dataDir, "mock_bias.json");
    if (fs.existsSync(biasPath)) {
      mockBias = JSON.parse(fs.readFileSync(biasPath, "utf8"));
    } else {
      mockBias = { disparate_impact: 0.82, flag: true };
    }
  } catch (e) {
    mockBias = { disparate_impact: 0.82, flag: true };
  }
}

loadMockData();

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

app.post("/agent/run", (req, res) => {
  const latency = randomBetween(LATENCY_MIN, LATENCY_MAX);

  if (ERROR_RATE > 0 && Math.random() < ERROR_RATE) {
    setTimeout(() => {
      res.status(503).json({
        error: "Service temporarily unavailable",
        fallback_reason: "MODEL_FALLBACK",
      });
    }, latency);
    return;
  }

  const lowConfidence = Math.random() < 0.2;
  const riskChoices = ["low", "monitor", "refer"];
  const risk = riskChoices[Math.floor(Math.random() * riskChoices.length)];

  setTimeout(() => {
    res.json({
      risk,
      confidence: lowConfidence ? parseFloat((randomBetween(0.4, 0.58)).toFixed(2)) : parseFloat((randomBetween(0.65, 0.92)).toFixed(2)),
      uncertainty: lowConfidence ? 0.45 : parseFloat((randomBetween(0.08, 0.25)).toFixed(2)),
      evidence: [
        { type: "milestone", detail: "Expressive language below norm" },
        { type: "score", detail: "ASQ communication 30/60" },
      ],
      rationale: [
        "Language milestone delay at 24 months",
        "Below cutoff threshold",
      ],
      recommended_actions: risk === "refer"
        ? ["Refer to EI", "Re-screen in 3 months"]
        : ["Re-screen in 3 months", "Consider speech referral"],
      manual_review_required: lowConfidence || risk === "refer",
    });
  }, latency);
});

app.get("/monitoring/drift", (req, res) => {
  res.json(mockDrift);
});

app.get("/monitoring/bias", (req, res) => {
  res.json(mockBias);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "mock-agent", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Mock agent server at http://localhost:${PORT}`);
  console.log("  POST /agent/run  GET /monitoring/drift  GET /monitoring/bias  GET /health");
});
