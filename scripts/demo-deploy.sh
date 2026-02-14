#!/bin/bash
# Demo deploy — builds Storybook and optionally uploads to GitHub Pages or creates artifact
# Usage: ./scripts/demo-deploy.sh [upload]
# Without upload: just builds storybook-static/
# With upload: requires GH_TOKEN for GitHub Pages (or adapt for Netlify)

set -e
cd "$(dirname "$0")/.."

echo "Building Storybook..."
npm run build-storybook

if [ "$1" = "upload" ] && [ -n "$GH_TOKEN" ]; then
  echo "Uploading to GitHub Pages..."
  # Requires: npm install -g gh-pages
  npx gh-pages -d storybook-static --repo "$(git config remote.origin.url)" --user "GitHub Actions" --email "actions@github.com" || true
else
  echo "Storybook built to storybook-static/"
  echo "To upload: set GH_TOKEN and run with 'upload' argument"
  echo "Or: npx serve storybook-static -p 6006"
fi
