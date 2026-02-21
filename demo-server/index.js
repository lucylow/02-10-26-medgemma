/**
 * PediScreen demo API: cases, inference, FHIR mock.
 * Run: node demo-server/index.js  (or from repo root: node demo-server/index.js)
 * Listens on port 4002. Set MOCK_LATENCY and MOCK_FAIL_RATE for testing.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const dataDir = path.join(__dirname, '..', 'mock_data');
const casesDir = path.join(dataDir, 'cases');
const fhirDir = path.join(dataDir, 'fhir');

if (!fs.existsSync(fhirDir)) {
  fs.mkdirSync(fhirDir, { recursive: true });
}

let indexCache = null;
function getIndex() {
  if (indexCache) return indexCache;
  const p = path.join(dataDir, 'index.json');
  if (!fs.existsSync(p)) return [];
  indexCache = JSON.parse(fs.readFileSync(p, 'utf8'));
  return indexCache;
}

// CORS for local frontend
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/cases', (req, res) => {
  try {
    const list = getIndex();
    if (list.length) {
      return res.json(list);
    }
    const files = fs.existsSync(casesDir) ? fs.readdirSync(casesDir).filter((f) => f.endsWith('.json')) : [];
    const out = files.slice(0, 100).map((f) => {
      const doc = JSON.parse(fs.readFileSync(path.join(casesDir, f), 'utf8'));
      return {
        case_id: doc.case_id,
        age_months: doc.age_months,
        locale: doc.locale,
        risk: doc.mock_inference?.risk,
        thumb: doc.images?.[0],
      };
    });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/case/:id', (req, res) => {
  const file = path.join(casesDir, `${req.params.id}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
  try {
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/infer', (req, res) => {
  const { case_id, simulate } = req.body || {};
  const file = path.join(casesDir, `${case_id}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'case not found' });
  if (simulate === 'timeout') {
    return setTimeout(() => res.status(504).json({ error: 'timeout' }), 15000);
  }
  const latencyMs = process.env.MOCK_LATENCY_MS
    ? Number(process.env.MOCK_LATENCY_MS)
    : (process.env.MOCK_LATENCY && Number(process.env.MOCK_LATENCY)) || 200 + Math.random() * 800;
  setTimeout(() => {
    if (process.env.MOCK_FAIL_RATE && Math.random() < Number(process.env.MOCK_FAIL_RATE)) {
      return res.status(500).json({ error: 'simulated backend failure' });
    }
    try {
      const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
      res.json(doc.mock_inference);
    } catch (e) {
      res.status(500).json({ error: String(e.message) });
    }
  }, latencyMs);
});

// Return embedding for a case (base64 float32). 404 if case has no valid embedding.
app.get('/embeddings/:case_id', (req, res) => {
  const file = path.join(casesDir, `${req.params.case_id}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
  try {
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    const b64 = doc.embedding_b64;
    if (!b64 || typeof b64 !== 'string') return res.status(404).json({ error: 'no embedding' });
    res.json({ case_id: doc.case_id, embedding_b64: b64, emb_version: doc.emb_version || 'medsiglip-v1' });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// FHIR mock: store DocumentReference in mock_data/fhir/
app.post('/fhir/document', (req, res) => {
  const body = req.body || {};
  const id = body.subject?.identifier?.value || `doc-${Date.now()}`;
  const file = path.join(fhirDir, `${id}-${Date.now()}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify(body, null, 2));
    res.status(201).json({ success: true, id, path: file });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'demo-server' });
});

const port = Number(process.env.DEMO_SERVER_PORT) || 4002;
app.listen(port, () => {
  console.log(`demo-server listening on http://localhost:${port}`);
  console.log('  GET /cases  GET /case/:id  POST /infer  POST /fhir/document');
});
