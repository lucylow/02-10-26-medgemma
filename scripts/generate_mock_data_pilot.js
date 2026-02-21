/**
 * Generate 10k pediatric screening records + mock_drift.json + mock_bias.json for demos, judges, pilots.
 * Deterministic: use seed PEDI_SEED for reproducibility.
 * Run: node scripts/generate_mock_data_pilot.js  (or yarn gen:mock:pilot)
 */
const fs = require("fs");
const path = require("path");

const SEED = process.env.PEDI_SEED || "pedi-seed-2026";

// Seeded LCG (no extra deps)
function createRng(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (Math.imul(31, h) + seedStr.charCodeAt(i)) >>> 0;
  let state = (h || 1) % 2147483647;
  return function () {
    state = (Math.imul(16807, state)) % 2147483647;
    return state / 2147483647;
  };
}

const rng = createRng(SEED);

function rand(min, max) {
  return Math.floor(rng() * (max - min)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

const races = ["white", "black", "hispanic", "asian", "rural", "other"];
const risks = ["low", "monitor", "refer"];
const milestones = [
  "expressive_language",
  "receptive_language",
  "gross_motor",
  "fine_motor",
  "social",
  "cognitive",
];

const records = [];
const N = 10000;

for (let i = 0; i < N; i++) {
  const race = randomChoice(races);
  const risk = randomChoice(risks);
  const ageMonths = rand(12, 49);
  const asqBase = risk === "refer" ? rand(15, 40) : risk === "monitor" ? rand(35, 55) : rand(45, 60);
  const asq_score = Math.min(60, Math.max(20, asqBase + rand(-5, 6)));
  const confidence = parseFloat((rng() * 0.45 + 0.5).toFixed(2));
  const hasDelay = risk !== "low" && rng() < 0.6;
  const delayedMilestone = hasDelay ? randomChoice(milestones) : null;

  records.push({
    id: i,
    age_months: ageMonths,
    race,
    asq_score,
    risk,
    confidence,
    referral_delay_months: risk === "refer" ? rand(0, 18) : null,
    delayed_milestone: delayedMilestone,
    locale: rng() < 0.2 ? "es" : "en",
  });
}

const outDir = path.join(__dirname, "..", "mock-server", "data");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, "mock_data.json"),
  JSON.stringify(records, null, 2)
);

// Drift time series: PSI scores over months (deterministic; one spike)
const driftSeries = [];
const months = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];
const rng2 = createRng(SEED + "-drift");
for (let i = 0; i < months.length; i++) {
  let psi = 0.05 + rng2() * 0.12;
  if (i === 4) psi = 0.28; // spike in 2026-01
  if (i === 5) psi = 0.15;
  driftSeries.push({ date: months[i], psi_score: parseFloat(psi.toFixed(3)) });
}
fs.writeFileSync(
  path.join(outDir, "mock_drift.json"),
  JSON.stringify(driftSeries, null, 2)
);

// Bias report: demographic parity, equalized odds, disparate impact
const biasReport = {
  demographic_parity: { white: 0.22, black: 0.31, hispanic: 0.28, asian: 0.18, rural: 0.35, other: 0.24 },
  equalized_odds: {
    white: { fpr: 0.08, fnr: 0.12 },
    black: { fpr: 0.14, fnr: 0.09 },
    hispanic: { fpr: 0.11, fnr: 0.11 },
    asian: { fpr: 0.06, fnr: 0.14 },
    rural: { fpr: 0.16, fnr: 0.10 },
    other: { fpr: 0.09, fnr: 0.13 },
  },
  disparate_impact: 0.82,
  flag: true,
  subgroup_confusion: {
    white: { tp: 120, tn: 800, fp: 70, fn: 50 },
    black: { tp: 80, tn: 350, fp: 55, fn: 25 },
    hispanic: { tp: 95, tn: 420, fp: 48, fn: 37 },
  },
};
fs.writeFileSync(
  path.join(outDir, "mock_bias.json"),
  JSON.stringify(biasReport, null, 2)
);

console.log("Pilot mock data generated (seed=%s):", SEED);
console.log("  mock-server/data/mock_data.json (%d records)", records.length);
console.log("  mock-server/data/mock_drift.json (%d points)", driftSeries.length);
console.log("  mock-server/data/mock_bias.json");
