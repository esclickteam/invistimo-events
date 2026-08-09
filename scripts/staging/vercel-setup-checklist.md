# Vercel Staging Setup Checklist (human / token required)

Cloud agents currently **cannot** create Vercel Custom Environments without `VERCEL_TOKEN`.

## Project (from GitHub deployments)

- Project name: `invistimo-events`
- Homepage (legacy): `https://invistimo-events.vercel.app`
- Production domain: `https://www.invistimo.com`
- Production branch: `main`
- Existing environments observed via GitHub Deployments: `Production`, `Preview`
- Custom `staging` environment: **NOT observed yet** (must create)

## Manual steps

1. [ ] Create Custom Environment `staging`
2. [ ] Branch matcher: equals `staging`
3. [ ] Attach domain `staging.invistimo.com` + verify DNS/SSL
4. [ ] Copy env vars from Production → Staging, then **replace** all NEEDS STAGING VALUE items (see `docs/staging-environment.md`)
5. [ ] Set `APP_ENV=staging`
6. [ ] Set Staging `MONGO_URI` → database `invistimo_staging`
7. [ ] Set Stripe `sk_test_...` only
8. [ ] Set `EXTERNAL_SENDS_MODE=disabled`
9. [ ] Set `NEXT_PUBLIC_SITE_URL=https://staging.invistimo.com`
10. [ ] Set `JWT_SECRET` unique for staging
11. [ ] Enable Deployment Protection + Automation Bypass secret
12. [ ] Create git branch `staging` from this infra PR once merged
13. [ ] Deploy: `git push origin staging` or `vercel deploy --target=staging`
14. [ ] Hit `/api/system/env-isolation` and confirm `ok: true`
15. [ ] Run `npm run staging:seed` against Staging DB
16. [ ] Deploy Venues PR #48 onto Staging and run E2E

## Do not

- Change Production env vars except adding new optional keys if needed
- Point Staging `MONGO_URI` at Production DB
- Use `sk_live_` on Staging
- Disable Production Deployment Protection
