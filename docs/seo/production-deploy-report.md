# דוח Deploy לפרודקשן — PR #380

**תאריך (Asia/Jerusalem):** 2026-10-23 ~17:20  
**אתר חי:** https://www.invistimo.com  
**PR:** https://github.com/esclickteam/invistimo-events/pull/380 → **MERGED**  
**Merge commit:** `f189a80c4cc3bd9cb4a975dd615b58e1f6a54781`  
**Production deployment:** `dpl_62koyWZn7tYuTDu7xT8d4xkyr73R` (**READY**, aliases כוללים `www.invistimo.com`)

## Rollback מוכן

| פריט | ערך |
| --- | --- |
| Deployment קודם (יציב) | `dpl_BbQkT3Kyx6U3dy1e1Wnun9K3GJio` |
| SHA קודם | `06ce0cab` |
| מצב | READY (זמין ל־Instant Rollback ב־Vercel) |
| איך | Vercel → Project → Deployments → Promote/Rollback ל־`dpl_BbQkT3Kyx6U3dy1e1Wnun9K3GJio` |

**לא בוצע Rollback** — הפריסה החדשה עברה קבלה.

## בדיקות אחרי עלייה (בלי פעולות אמיתיות)

| בדיקה | תוצאה |
| --- | --- |
| SEO acceptance חיה (28 URLs) | **28/28 PASS** (`acceptance-results-production.json`) |
| robots.txt / sitemap.xml (28 loc) / answers.json / llms.txt | **PASS** |
| Canonical על hubs | תואם `www.invistimo.com/...` |
| Answer-first + JSON-LD בדפי שיווק מרכזיים | נוכח |
| שמארקטינג חדשים (`/rsvp/save-the-date`, מדריכים וכו') | **200** |
| `/login`, `/dashboard`, `/pricing`, `/try/dashboard`, `/try/dashboard/seating` | **200** |
| מחשבון מחירים (packages/addons/slider testids) | **PASS** — ללא הזמנת וואטסאפ |
| נתיבי אורח פיקטיביים (`/invite`, `/e`, `/w`) | **200**, ללא דליפת «הצלחה» |
| אירועי Deploy (Vercel) עם error/fail | **0 interesting errors** ב־50 אירועים אחרונים |
| `/register` | **200** (WARN ב־smoke: טופס client-rendered; כותרת «חשבון» — לא חוסם) |

## חיבורי מדידה (מצב נוכחי)

| שירות | מצב |
| --- | --- |
| Google Search Console | **אימות טכני כבר באתר** — קובץ `google0523bb34ab51dcb6.html` + DNS TXT. **אין צורך** ב־`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`. נותר: כניסה ל־GSC → אישור נכס קיים → Submit sitemap + Request indexing |
| Google Analytics 4 | **לא מחובר** — אין `NEXT_PUBLIC_GA_MEASUREMENT_ID` ב־Vercel ואין gtag ב־HTML. לבדוק נכס GA4 קיים לפני יצירה |
| Bing Webmaster Tools | **לא מחובר** — אין meta/DNS. מומלץ **ייבוא מ־GSC** (בלי Redeploy) |
| הגשת sitemap | **ממתינה** ללחיצה בחשבון GSC/Bing של הבעלים |
| בקשות אינדוקס | **ממתינות** ל־GSC |

צעדים מדויקים ללחיצות: `measurement-connect-owner-steps.md`.  
גם: `post-publish-owner-runbook.md`, `connect-search-analytics.md`, `baseline-index-report.md`.

## מה נותר למדידת דירוגים ו־AI

1. חיבור GSC/GA4/Bing + Redeploy עם env  
2. הגשת `https://www.invistimo.com/sitemap.xml`  
3. Request indexing ל־hubs  
4. מילוי `baseline-index-report.md` אחרי 7–14 יום נתונים  
5. השלמת פרופילי Mit4Mit / MazalDay עם קישור לפרודקשן  
6. ניטור איכותי של `AI_MONITOR_QUESTIONS` (לא דירוג מספרי)
