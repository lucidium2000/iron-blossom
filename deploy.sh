#!/usr/bin/env bash
# Deploy to GitHub Pages with a fresh cache-busting build id.
#
# GitHub Pages serves js/*.js with a ten-minute cache, so pushing alone leaves
# visitors on the old code until it expires. Stamping a new ?v= on every script
# tag changes the URL, so browsers fetch the new files straight away.
#
#   ./deploy.sh "what changed"
set -euo pipefail

cd "$(dirname "$0")"
MSG="${1:-Update}"
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"

echo "→ stamping build id"
python3 tools/stamp.py

if [ -z "$(git status --porcelain)" ]; then
  echo "nothing to deploy — working tree is clean"
  exit 0
fi

echo "→ committing"
git add -A
git commit -q -m "$MSG"

echo "→ pushing"
git push -q origin main

echo "→ waiting for Pages build"
for _ in $(seq 1 60); do
  STATUS="$(gh api "repos/$REPO/pages/builds/latest" --jq .status 2>/dev/null || echo "")"
  SHA="$(gh api "repos/$REPO/pages/builds/latest" --jq .commit 2>/dev/null || echo "")"
  if [ "$STATUS" = "built" ] && [ "${SHA:0:7}" = "$(git rev-parse --short=7 HEAD)" ]; then
    echo "✓ live: https://$(echo "$REPO" | cut -d/ -f1).github.io/$(echo "$REPO" | cut -d/ -f2)/"
    exit 0
  fi
  if [ "$STATUS" = "errored" ]; then
    echo "✗ Pages build errored" >&2
    exit 1
  fi
  sleep 5
done
echo "still building — check https://github.com/$REPO/deployments"
