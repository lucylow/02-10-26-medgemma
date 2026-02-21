/**
 * Generate mock_data/cases/*.json and mock_data/index.json for PediScreen demo.
 * Run: node scripts/generate_mock_data.js  (or yarn gen:mock)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, '..', 'mock_data');
const casesDir = path.join(out, 'cases');
const thumbnailsDir = path.join(out, 'thumbnails');

if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
if (!fs.existsSync(casesDir)) fs.mkdirSync(casesDir, { recursive: true });
if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

function makeEmbedding(dim = 256) {
  const arr = new Float32Array(dim);
  for (let i = 0; i < dim; i++) arr[i] = Math.random() * 2 - 1;
  const norm = Math.sqrt([...arr].reduce((s, v) => s + v * v, 0));
  for (let i = 0; i < dim; i++) arr[i] /= norm;
  return Buffer.from(arr.buffer).toString('base64');
}

const sampleTextsEn = [
  'He says 7 words, but no phrase.',
  'Points to things, seems social.',
  'Limited eye contact, repetitive play.',
  'Parent concerned about speech.',
  'He says 8 words and points, but no two-word phrases.',
  'Runs and climbs well, still wobbly on one foot.',
  'Uses spoon, sometimes fork; spills often.',
  'Plays alongside others, minimal sharing.',
];

const sampleTextsEs = [
  'No dice frases de dos palabras.',
  'Señala cosas, parece sociable.',
  'Contacto visual limitado, juego repetitivo.',
  'Padre preocupado por el habla.',
  'Dice unas 8 palabras, no frases de dos palabras.',
  'Corre y trepa bien, aún inestable en un pie.',
  'Usa cuchara, a veces tenedor; derrama a veces.',
  'Juega junto a otros, comparte poco.',
];

const risks = ['on_track', 'monitor', 'refer'];
const ages = [6, 12, 18, 24, 36, 48];

const indexList = [];

for (let i = 1; i <= 50; i++) {
  const id = `case-${String(i).padStart(4, '0')}`;
  const age = ages[Math.floor(Math.random() * ages.length)];
  const isSpanish = i <= 10;
  const locale = isSpanish ? 'es-ES' : 'en-US';
  const caregiver_text = isSpanish
    ? sampleTextsEs[Math.floor(Math.random() * sampleTextsEs.length)]
    : sampleTextsEn[Math.floor(Math.random() * sampleTextsEn.length)];

  // Edge cases: 8 cases (e.g. 41-48): missing age, noisy, preterm, etc.
  const edgeCase = i >= 41 && i <= 48;
  const adversarial = i >= 44 && i <= 50; // overlapping: ambiguous/conflicting
  const ageMonths = edgeCase && i % 4 === 0 ? null : age; // some missing age for edge

  const riskWeights = edgeCase ? [0.33, 0.34, 0.33] : adversarial ? [0.2, 0.5, 0.3] : [0.5, 0.3, 0.2];
  let ri = 0;
  let r = Math.random();
  for (let w = 0; w < riskWeights.length; w++) {
    r -= riskWeights[w];
    if (r <= 0) {
      ri = w;
      break;
    }
  }
  const risk = risks[ri];

  const mock_inference = {
    summary: [`Mock summary for ${id}${isSpanish ? ' (es)' : ''}.`],
    risk,
    recommendations: ['Short play-based activities', 'Rescreen in 3 months'],
    parent_text: isSpanish
      ? 'Pruebe actividades de lenguaje diarias; revisar en 3 meses.'
      : 'Try daily language play; re-check in 3 months.',
    explainability: [
      { type: 'text', detail: 'No two-word phrases', score: 0.6 + Math.random() * 0.3 },
    ],
    confidence: parseFloat((0.5 + Math.random() * 0.45).toFixed(2)),
    adapter_id: 'mock/adapter_v1',
    model_id: 'mock/medgemma',
  };

  const doc = {
    schema_version: '1.0',
    case_id: id,
    created_at: new Date().toISOString(),
    consent_id: 'consent-demo',
    age_months: ageMonths,
    locale,
    caregiver_text,
    images: [`thumbnails/thumb_${String(i).padStart(3, '0')}.svg`],
    embedding_b64: makeEmbedding(),
    emb_version: 'medsiglip-v1',
    mock_inference,
    audit_log: i % 5 === 0 ? [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        actor_type: 'model',
        actor_id: 'mock/medgemma',
        action: 'inference',
        reason: '',
        model_version: 'mock-v1',
        adapter_id: 'mock/adapter_v1',
      },
    ] : [],
  };

  if (i <= 15) {
    doc.time_to_referral_days = risk === 'refer' ? 7 + Math.floor(Math.random() * 14) : null;
    doc.D_base = risk !== 'on_track' && Math.random() < 0.4;
  }
  doc.data_quality = ['synthetic'];
  doc.provenance = { source: 'demo', origin: 'siteA', collected_by: 'CHW_001' };
  if (mock_inference.confidence < 0.55) mock_inference.uncertainty_reason = 'Limited caregiver description; consider follow-up questions.';
  if (i % 4 === 0) {
    mock_inference.explainability.push({ type: 'image_region', detail: `grip pattern consistent with ${(ageMonths ?? age)}-month drawing`, score: 0.5 + Math.random() * 0.2 });
  }
  if (i % 5 === 0) {
    mock_inference.nearest_neighbors = [
      { case_id: `case-${String((i % 50) + 1).padStart(4, '0')}`, similarity: 0.75 + Math.random() * 0.15, thumbnail: `thumbnails/thumb_${String((i % 50) + 1).padStart(3, '0')}.svg` },
    ];
  }

  fs.writeFileSync(path.join(casesDir, `${id}.json`), JSON.stringify(doc, null, 2));

  indexList.push({
    case_id: doc.case_id,
    age_months: doc.age_months,
    locale: doc.locale,
    risk: doc.mock_inference.risk,
    thumb: doc.images[0],
  });
}

fs.writeFileSync(
  path.join(out, 'index.json'),
  JSON.stringify(indexList, null, 2)
);
fs.writeFileSync(path.join(out, 'MOCK_DATA_VERSION.txt'), '1.0\n');

// Placeholder SVG thumbnails (no real photos)
for (let i = 1; i <= 50; i++) {
  const name = `thumb_${String(i).padStart(3, '0')}.svg`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#f0f0f0"/><text x="60" y="65" text-anchor="middle" fill="#999" font-size="14">${i}</text></svg>`;
  fs.writeFileSync(path.join(thumbnailsDir, name), svg);
}

console.log('Wrote 50 mock cases to mock_data/cases/ and mock_data/index.json');
console.log('Wrote placeholder thumbnails to mock_data/thumbnails/');
