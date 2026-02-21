/**
 * Validate mock_data/cases/*.json against mock_data/schema/case_schema.json (required fields only).
 * Run: node scripts/validate_mock_data.js  (or yarn validate:mock)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'mock_data');
const casesDir = path.join(dataDir, 'cases');
const schemaPath = path.join(dataDir, 'schema', 'case_schema.json');

const required = ['case_id', 'created_at', 'age_months', 'locale', 'caregiver_text', 'images', 'mock_inference'];
const mockInferenceRequired = ['risk', 'confidence'];
const riskEnum = ['on_track', 'monitor', 'refer'];

function validateCase(doc, file) {
  const errors = [];
  for (const key of required) {
    if (doc[key] === undefined || doc[key] === null) {
      errors.push(`Missing required field: ${key}`);
    }
  }
  if (!Array.isArray(doc.images)) {
    errors.push('images must be an array');
  }
  const mi = doc.mock_inference;
  if (mi && typeof mi === 'object') {
    for (const key of mockInferenceRequired) {
      if (mi[key] === undefined && mi[key] !== 0) {
        errors.push(`mock_inference.${key} is required`);
      }
    }
    if (mi.risk != null && !riskEnum.includes(mi.risk)) {
      errors.push(`mock_inference.risk must be one of ${riskEnum.join(', ')}`);
    }
    if (mi.confidence != null && (typeof mi.confidence !== 'number' || mi.confidence < 0 || mi.confidence > 1)) {
      errors.push('mock_inference.confidence must be a number between 0 and 1');
    }
  } else {
    errors.push('mock_inference is required and must be an object');
  }
  if (doc.audit_log != null && !Array.isArray(doc.audit_log)) {
    errors.push('audit_log must be an array');
  }
  return errors;
}

if (!fs.existsSync(casesDir)) {
  console.error('mock_data/cases/ not found. Run yarn gen:mock first.');
  process.exit(1);
}

const files = fs.readdirSync(casesDir).filter((f) => f.endsWith('.json'));
let failed = 0;
for (const f of files) {
  const filePath = path.join(casesDir, f);
  const raw = fs.readFileSync(filePath, 'utf8');
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    console.error(`${f}: Invalid JSON - ${e.message}`);
    failed++;
    continue;
  }
  const errors = validateCase(doc, f);
  if (errors.length) {
    console.error(`${f}: ${errors.join('; ')}`);
    failed++;
  }
}

const indexPath = path.join(dataDir, 'index.json');
if (!fs.existsSync(indexPath)) {
  console.error('mock_data/index.json not found.');
  failed++;
} else {
  try {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    if (!Array.isArray(index)) {
      console.error('mock_data/index.json must be an array');
      failed++;
    }
  } catch (e) {
    console.error('mock_data/index.json: Invalid JSON');
    failed++;
  }
}

if (failed > 0) {
  process.exit(1);
}
console.log(`Validated ${files.length} case files and index.json.`);
