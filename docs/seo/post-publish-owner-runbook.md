# Runbook בעלים — אחרי אישור Merge + Deploy

לבצע **רק אחרי** Deploy לפרודקשן של PR #380. הסוכן לא מבצע את הצעדים האלה בלי גישה לחשבונות.

## 1) Google Search Console

1. הוסיפו property ל־`https://www.invistimo.com` (או Domain).
2. אימות: DNS TXT **או** תג HTML → הגדירו `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` ב־Vercel → Redeploy.
3. Sitemaps → שלחו `https://www.invistimo.com/sitemap.xml`.
4. URL Inspection → Request indexing ל־hubs (ראו `post-publish-index-checklist.md`).
5. מלאו את טבלת האינדוקס ב־`baseline-index-report.md`.

פירוט: `connect-search-analytics.md`.

## 2) Google Analytics 4

1. צרו Web stream → Measurement ID `G-XXXXXXXX`.
2. הגדירו `NEXT_PUBLIC_GA_MEASUREMENT_ID` בפרודקשן → Redeploy.
3. בדקו Realtime על `/pricing` ו־`/rsvp` (לא על `/invite/...`).
4. אירועים מוכנים בקוד: `select_cta`, `ai_referral`, `web_vital`, `content_group`.
5. המרות מומלצות לסמן ב־GA4: `generate_lead` / contact success, `sign_up`, CTA ל־`/pricing`.

## 3) Bing Webmaster Tools

1. ייבוא מ־GSC או הוספה ידנית.
2. אימות → `NEXT_PUBLIC_BING_SITE_VERIFICATION` → Redeploy.
3. שלחו את אותו sitemap.

## 4) מפת אתר + בקשות אינדוקס

- GSC + Bing: sitemap מעודכן.
- GSC URL Inspection לרשימת ה־hubs ב־`post-publish-index-checklist.md`.
- תעדו תאריך ותוצאה ב־`baseline-index-report.md`.

## 5) זמינות לסורקי AI

1. בדקו `https://www.invistimo.com/robots.txt` — אין `Disallow: /` גלובלי ל־GPTBot / ClaudeBot / PerplexityBot / Google-Extended (אלא אם בעלים מחליטים אחרת).
2. בדקו `llms.txt` ו־`answers.json` חיים.
3. אופציונלי: שאלו ידנית שאלות מ־`AI_MONITOR_QUESTIONS` ותעדו אם המותג מוזכר (איכותי, לא דירוג).

## 6) דוח בסיס

מלאו `baseline-index-report.md` תוך 7–14 יום מ־Deploy (כשיש נתונים).  
אחר כך המשיכו עם `monthly-report-template.md`.

## 7) Mit4Mit + MazalDay

השלימו checklist ב־`directory-profiles-mit4mit-mazalday.md`: קישור לפרודקשן, תיאור עובדתי, URL פרופיל לתיעוד.
