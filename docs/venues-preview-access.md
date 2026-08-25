# Venues Preview Access — Deployment Protection

**Goal:** Allow authenticated E2E / smoke against the PR Preview without weakening Production protection.

## Current blocker

Vercel Preview deployments for this project redirect unauthenticated browsers to **Vercel Authentication (SSO / Deployment Protection)**. Cloud agents without a Vercel team session cannot complete interactive Preview E2E.

## Safe solution (Preview-only)

Do **not** disable Production Deployment Protection.

### Option A — Automation Bypass Secret (recommended)

1. In Vercel → Project → Settings → Deployment Protection  
2. Keep Production protection as-is (Standard / Vercel Authentication).  
3. For **Preview**, enable **Protection Bypass for Automation** and set a long random secret.  
4. Store the same value as project env:
   - `VERCEL_AUTOMATION_BYPASS_SECRET` (Preview + optionally Development; **not required on Production**)
5. Smoke / E2E requests must send:
   - Header: `x-vercel-protection-bypass: <secret>`
   - Or query: `?x-vercel-protection-bypass=<secret>`

Script helper (when secret is available in the agent env):

```bash
PREVIEW_URL="https://<preview>.vercel.app" \
VERCEL_AUTOMATION_BYPASS_SECRET="***" \
node scripts/venues/preview-smoke.mjs
```

### Option B — Shareable Preview link (temporary)

Generate a shareable link from the Vercel deployment page for the PR Preview only. Revoke after E2E. Still does not change Production.

### Option C — Temporarily set Preview protection to “None”

Only if the team accepts a short window of public Preview HTML. Re-enable immediately after E2E. **Never** apply this to Production.

## What we changed in-repo

- Documented this procedure (`docs/venues-preview-access.md`).
- Added `scripts/venues/preview-smoke.mjs` which uses the bypass header when present and fails closed when Preview is still SSO-gated.

## Verification gate

`PREVIEW ACCESS = PASS` only when an automated smoke can load `/login` (HTTP 200 HTML) without Vercel SSO redirect.
