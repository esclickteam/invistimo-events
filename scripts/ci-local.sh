#!/usr/bin/env bash
# Local gate to run before git push.
# GitHub Actions stays required. Do not bypass it with a commit trailer or a bracketed ci marker.
set -euo pipefail
cd "$(dirname "$0")/.."
section() { printf "\n== %s\n" "$*"; }
section "Install"
if [ ! -d node_modules ]; then npm ci; fi
section "Contact measurement tests"
npm run test:contact-inquiry-measurement
section "Venue safety tests"
npm run test:venue-safety
section "Build"
npm run build
section "The one-lead staging trace stays on GitHub Actions and is not run locally"

if [ "$#" -gt 0 ]; then
  section "Focused command"
  "$@"
fi
