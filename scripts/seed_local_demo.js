/**
 * Seed demo data for offline use: read mock_data/index.json and cases, write public/demo-cases.json
 * so the app can load case list and first N cases for offline demo.
 * Run: node scripts/seed_local_demo.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockData = path.join(__dirname, '..', 'mock_data');
const casesDir = path.join(mockData, 'cases');
const indexPath = path.join(mockData, 'index.json');
const outDir = path.join(__dirname, '..', 'public');
const outFile = path.join(outDir, 'demo-cases.json');

if (!fs.existsSync(indexPath)) {
  console.error('Run yarn gen:mock first.');
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const maxCases = 20;
const cases = [];
for (let i = 0; i < Math.min(maxCases, index.length); i++) {
  const c = index[i];
  const casePath = path.join(casesDir, `${c.case_id}.json`);
  if (fs.existsSync(casePath)) {
    cases.push(JSON.parse(fs.readFileSync(casePath, 'utf8')));
  }
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ index, cases }, null, 2));
console.log(`Wrote ${index.length} index entries and ${cases.length} full cases to public/demo-cases.json`);
