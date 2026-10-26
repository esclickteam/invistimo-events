# QA — seating-cards-vs-qr

**Local base:** `http://localhost:3000`  
**Artifacts:** `/opt/cursor/artifacts/seating-cards-vs-qr/`

## PASS / FAIL / NOT VERIFIED

| Check | Result | Notes |
| --- | --- | --- |
| Desktop 1440 render HTTP 200 | PASS | |
| Mobile 390 no page overflow | PASS | |
| Tablet 768 render | PASS | |
| Single H1 | PASS | |
| 30 FAQ accordion items | PASS | all openable |
| Interactive tabs (cards / team / QR) | PASS | QR shows table only after simulated staff confirm |
| Comparison table + mobile stacked cards | PASS | |
| MarketingVideo muted/loop/controls/contain | PASS | shared `MarketingVideo` + `objectFit="contain"` |
| Real try-environment demo videos (4) | PASS | fictitious guests only |
| No SEO/GEO/AEO/«התשובה הקצרה» chrome | PASS | |
| Canonical + Article + Breadcrumb + FAQPage + Organization | PASS | FAQ rich results not promised |
| Internal links to existing URLs | PASS | seating / RSVP / pricing / guides / try |
| Product truth: no printed cards by Invistimo | PASS | |
| Product truth: table after check-in on QR path | PASS | |
| Production merge/deploy | NOT VERIFIED | awaiting explicit approval |
| Google Search Console indexing | NOT VERIFIED | post-publish |
| Live camera QR scan recording | NOT VERIFIED | demo host skips camera; guest pass + staff confirm recorded |
| Keyword volumes | NOT VERIFIED | null until Keyword Planner / GSC |

## Automated

| Suite | Result |
| --- | --- |
| `seo-public.test.ts` (guide coverage / answers / keywords) | PASS for new guide paths; 1 pre-existing Footer `/pricing` assertion unrelated |
| `public-no-internal-labels.test.ts` | PASS |

## Artifacts checklist (requested)

1. Preview of guide — local URL above  
2. Hero screenshot — `desktop-hero.png` / `mobile-hero.png`  
3. Three tabs — `desktop-tab-cards.png`, `desktop-tab-team.png`, `desktop-tab-qr.png`  
4. Mobile comparison — `mobile-compare.png`  
5. Real demo videos — `public/marketing/videos/guides/*.webm`  
6. All 30 FAQs — PASS  
7. SEO technical notes — this file + `DELIVERABLES.md`  
8. Links + structured data — PASS  
9. PASS/FAIL/NOT VERIFIED — this table  
