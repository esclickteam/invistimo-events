# Invistimo Staging Environment

**Goal:** Permanent Staging isolated from Production.  
**Flow:** Feature/PR → Preview → Staging → E2E/Smoke → Production  

**Venue work:** See binding rules in [`docs/venues-safety-contract.md`](./venues-safety-contract.md). Venue PRs must pass `npm run test:venue-safety` and Staging golden Regular + Venue regressions before Production.

---

## Architecture note

Invistimo is a **single Next.js full-stack app** on one Vercel project (`invistimo-events`).

- Staging frontend **and** Staging API are the same deployment: `https://staging.invistimo.com/api/*`
- There is no separate backend host today. Do **not** point Staging at `www.invistimo.com/api`.

---

## 1) Create Vercel Custom Environment `staging`

Requires Vercel Pro+ and project admin access.

### Dashboard

1. Vercel → Project `invistimo-events` → **Settings → Environments**
2. **Create Environment** → slug: `staging`
3. Branch tracking (recommended):
   - Type: `equals`
   - Pattern: `staging`
4. Attach domain: `staging.invistimo.com`
5. Enable **Deployment Protection** on Staging
6. Enable **Protection Bypass for Automation**
   - Store secret as env var `VERCEL_AUTOMATION_BYPASS_SECRET` on **staging** (and optionally preview)
   - **Do not** weaken Production protection

### CLI (with `VERCEL_TOKEN`)

```bash
# Create custom environment (once)
curl -X POST "https://api.vercel.com/v9/projects/invistimo-events/custom-environments?teamId=<TEAM_ID>" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"staging","description":"Isolated Invistimo staging","branchMatcher":{"type":"equals","pattern":"staging"}}'

# Deploy explicitly
vercel deploy --target=staging --prod=false

# Or push branch
git push origin staging
```

---

## 2) DNS (required — currently NXDOMAIN until added)

`invistimo.com` uses **external** DNS (`ns1.dns-parking.com` / `ns2.dns-parking.com`), not Vercel nameservers.  
The domain is attached + verified in Vercel, but public DNS still needs this record at the DNS host:

```
Type:  CNAME
Name:  staging
Value: cname.vercel-dns.com
TTL:   300 (or Auto)
```

Until that propagates, `staging.invistimo.com` will not resolve (NXDOMAIN).

**Automation alias (works today, SSO-protected):**

```
https://invistimo-events-env-staging-esclicks-projects.vercel.app
```

Use with Protection Bypass for Automation header `x-vercel-protection-bypass`.  
Custom domain `staging.invistimo.com` is exempt from SSO once DNS exists (`all_except_custom_domains`).

---

## 3) MongoDB isolation (critical)

Create a **separate database** (same Atlas cluster OK):

- Staging DB name: `invistimo_staging`
- Production DB name: keep existing (do not reuse)

Staging `MONGO_URI` must include `/invistimo_staging`.

Optional:

```
MONGO_ENV_LABEL=staging
```

Boot safety (`lib/env/safetyGuards.ts` + `lib/db.ts`):

- `APP_ENV=staging` + production-looking DB → **refuses to connect**
- `APP_ENV=production` + staging DB → **refuses to connect**

---

## 4) Required Staging env vars (names only)

### Must set (NEEDS STAGING VALUE)

| Variable | Notes |
|---|---|
| `APP_ENV` | `staging` |
| `MONGO_URI` | URI with `/invistimo_staging` |
| `MONGO_ENV_LABEL` | `staging` (recommended) |
| `JWT_SECRET` | **different** from Production |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | different from Production if used |
| `NEXT_PUBLIC_SITE_URL` | `https://staging.invistimo.com` |
| `NEXT_PUBLIC_APP_URL` | `https://staging.invistimo.com` |
| `NEXT_PUBLIC_BASE_URL` | `https://staging.invistimo.com` |
| `NEXTAUTH_URL` | `https://staging.invistimo.com` |
| `CLOUDINARY_*` | same account OK |
| `CLOUDINARY_ROOT_FOLDER` | `invistimo/staging` (optional; auto if APP_ENV=staging) |
| `STRIPE_SECRET_KEY` | **`sk_test_...` only** |
| `STRIPE_WEBHOOK_SECRET` | staging/test webhook |
| `EXTERNAL_SENDS_MODE` | `disabled` (default) or `allowlist` |
| `EXTERNAL_SENDS_EMAIL_ALLOWLIST` | if allowlist mode |
| `EXTERNAL_SENDS_PHONE_ALLOWLIST` | if allowlist mode |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | for E2E |
| `CRON_SECRET` | staging-specific |

### Safe to omit / leave empty on Staging

SMS/WhatsApp production credentials (recommended empty while `EXTERNAL_SENDS_MODE=disabled`)

### Production only (do not copy live)

| Variable |
|---|
| Production `MONGO_URI` |
| `STRIPE_SECRET_KEY` live (`sk_live_`) |
| Production JWT/session secrets (reuse discouraged) |
| Production webhook signing secrets for live providers |

---

## 5) Cookie / auth isolation

`lib/auth/clearAuthCookies.ts` now uses `.invistimo.com` **only** when `APP_ENV=production`.

Staging cookies are **host-only** → login on staging does not authenticate Production.

---

## 6) External sends / payments

- Staging default: external email/SMS/WhatsApp **blocked**
- Staging + `sk_live_` Stripe → boot/route failure
- Cloudinary folders: `invistimo/staging/...` vs `invistimo/production/...`

---

## 7) Deploy flow

```
feature/*  → Preview (every PR)
staging    → Staging custom environment (manual promote / branch push)
main       → Production (only after Staging E2E PASS)
```

Promote Venues PR #48 to Staging **after** this environment exists:

```bash
# Option A: merge staging-infra → staging branch, then merge venues into staging
# Option B: vercel deploy --target=staging from the venues branch
```

---

## 8) Seed fixtures (Staging DB only)

```bash
APP_ENV=staging \
MONGO_URI='mongodb+srv://.../invistimo_staging' \
MONGO_ENV_LABEL=staging \
npx tsx scripts/staging/seed-staging-fixtures.ts
```

Accounts are marked `isStagingFixture: true` and use `@invistimo.test` emails.

---

## 9) Smoke / isolation proof

```bash
# Preferred once DNS exists:
curl -sS https://staging.invistimo.com/api/system/env-isolation

# Until DNS exists, use Staging alias + bypass:
curl -sS https://invistimo-events-env-staging-esclicks-projects.vercel.app/api/system/env-isolation \
  -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" \
  -H "x-vercel-set-bypass-cookie: true" -L
```

Expect:

- `appEnv: "staging"`
- `mongoDbName: "invistimo_staging"`
- `stripeMode: "test"` or `"missing"`
- `externalSends: "disabled"` or `"allowlist"`
- `cloudinaryRootFolder` contains `staging`
- `ok: true`

Production check (endpoint ships with Staging infra PR; may 404 until merged):

```bash
curl -sS https://www.invistimo.com/api/system/env-isolation
```

---

## 10) Live Venues E2E (Staging)

```bash
STAGING_BASE_URL=https://invistimo-events-env-staging-esclicks-projects.vercel.app \
VERCEL_AUTOMATION_BYPASS_SECRET=... \
npm run test:venues:staging-live
```

Covers: isolation, fixture logins, hall switcher A/B, tenant deny, calendar create, CRM lead→event convert, files/employees lists, regular host has no venues.

**Do not** promote Venues to Production until this PASS **and** `staging.invistimo.com` DNS resolves.

---

## 11) Production safety

- Production must remain untouched during Staging setup
- Do not copy live Stripe / production JWT / production WhatsApp mutation secrets to Staging
- Preview historically may share Production `MONGO_URI` — Staging deliberately does not
