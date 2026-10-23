# Actions that need owner approval or access

| # | Action | Why blocked here |
| --- | --- | --- |
| 1 | Merge PR #380 / deploy to production | Explicitly forbidden until you approve |
| 2 | Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Secret / property ownership |
| 3 | Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | GSC ownership |
| 4 | Set `NEXT_PUBLIC_BING_SITE_VERIFICATION` | Bing ownership |
| 5 | Submit sitemap in GSC / Bing + URL Inspection requests | Account access |
| 6 | Google Keyword Planner / Ads account for volumes | Paid / account access |
| 7 | Create Google Business Profile or social profiles | Brand ownership; required before `sameAs` |
| 8 | Outreach to Engaged / editors / venues | Must be in Invistimo’s name with approval |
| 9 | Purchase any SEO SaaS, IndexNow paid tier, or link placements | Cost approval |
| 10 | Publish third-party guest posts or press | Brand voice approval |
| 11 | Add AggregateRating / Review schema | Needs real review corpus |
| 12 | Add VideoObject | Needs verified posters + upload dates for public clips |
| 13 | Change prices, packages, or product capabilities | Business decision — out of SEO scope |
| 14 | Add `sameAs` for Mit4Mit / MazalDay / social | Needs stable public profile URLs |
| 15 | Complete Mit4Mit / MazalDay profile publish + production links | Owner registered; follow `directory-profiles-mit4mit-mazalday.md` |
| 16 | Post-deploy GSC/GA4/Bing connect + sitemap + index requests | Account access — `post-publish-owner-runbook.md` |

## Already implemented without those approvals

- Technical SEO, answer-first HTML, keyword map with null volumes, pillar/cluster content, schema without fake ratings, GA4 hooks (dormant until ID), AI referral + CWV events, robots/sitemap/llms/answers.json, regression tests, research docs.
