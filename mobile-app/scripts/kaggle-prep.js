#!/usr/bin/env node
/**
 * Kaggle submission prep: generates README snippet and placeholder paths for demo.mp4 + screenshots.
 * Run from mobile-app: npm run build:kaggle
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'kaggle-submission');
const readmePath = path.join(outDir, 'README_SNIPPET.md');

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(outDir, 'screenshots'), { recursive: true });

const snippet = `# PediScreen AI — Kaggle submission package (generated)

- **Demo video:** Add demo.mp4 to this folder (2 min: QR → screening → risk → PDF).
- **Screenshots:** Add key screens to \`screenshots/\`.
- **Live demo:** Replit URL + Expo QR link in main repo README.
`;

fs.writeFileSync(readmePath, snippet, 'utf8');
console.log('Kaggle prep: wrote', readmePath);
console.log('Add demo.mp4 and screenshots to kaggle-submission/ then zip for submission.');
