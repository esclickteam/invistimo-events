# דוח בסיס — אינדוקס, חשיפות ומיקומים

**מטרה:** נקודת השוואה אחרי Deploy של PR #380.  
**מילוי:** רק ממספרים מיוצאים מ־GSC / Bing / GA4. **אין להמציא דירוגים.**

| שדה | ערך |
| --- | --- |
| תאריך Deploy לפרודקשן | 2026-10-23 (Asia/Jerusalem) — dpl_62koyWZn7tYuTDu7xT8d4xkyr73R / f189a80 |
| תאריך מילוי הבסיס |  |
| GSC property | לבדוק נכס קיים ל־`invistimo.com` / `https://www.invistimo.com` (DNS TXT + קובץ HTML כבר באתר) |
| Bing property |  |
| GA4 property / stream |  |
| Measurement ID |  |

**אימות GSC (טכני, ללא env):**  
- קובץ: https://www.invistimo.com/google0523bb34ab51dcb6.html → 200  
- DNS TXT: `google-site-verification=BdW7UhMwC_-D7tSazxn9ERzWa8jh3mp3Bk3tnRI5ujo`  
צעדים לבעלים: `measurement-connect-owner-steps.md`.

## 1) זמינות טכנית ביום ה־Deploy

| בדיקה | תוצאה | הערות |
| --- | --- | --- |
| https://www.invistimo.com/robots.txt | PASS | Googlebot/Bingbot/OAI; Sitemap listed; `/dashboard`/`/login` Disallow |
| https://www.invistimo.com/sitemap.xml | PASS | 28 marketing URLs; no private leaks |
| https://www.invistimo.com/answers.json | PASS | 200 |
| https://www.invistimo.com/llms.txt | PASS | 200 |
| View-Source `/rsvp` — `התשובה הקצרה` | PASS | answer-first + JSON-LD |
| View-Source `/pricing` — canonical | PASS | `https://www.invistimo.com/pricing` |
| Hubs `index,follow` (Googlebot UA) | PASS | `/`, `/rsvp`, `/pricing`, `/faq`, `/event-management` |
| Guest `/invite/…` | PASS | `noindex, nofollow` (רצוי) |
| gtag / GA4 ב־HTML חי | לא מחובר | ממתין ל־`NEXT_PUBLIC_GA_MEASUREMENT_ID` |

## 2) אינדוקס (GSC URL Inspection) — hubs

| URL | Requested | Last crawl | Indexed? | Notes |
| --- | --- | --- | --- | --- |
| `/` |  |  |  | |
| `/rsvp` |  |  |  | |
| `/rsvp/chatuna` |  |  |  | |
| `/rsvp/whatsapp` |  |  |  | |
| `/rsvp/save-the-date` |  |  |  | |
| `/invitations/chatuna` |  |  |  | |
| `/seating-explained` |  |  |  | |
| `/event-management` |  |  |  | |
| `/pricing` |  |  |  | |
| `/faq` |  |  |  | |
| `/info/guides` |  |  |  | |

## 3) כיסוי אינדוקס (שבוע 1)

| מצב | מספר | הערות |
| --- | --- | --- |
| Indexed |  | |
| Discovered – currently not indexed |  | |
| Crawled – currently not indexed |  | |
| Excluded by noindex (guest `/invite`, `/w`) |  | **צפוי ורצוי** |
| Blocked by robots.txt (`/dashboard`, `/login`, …) |  | **צפוי** |

## 4) ביצועים — חלון 28 יום ראשון אחרי Deploy

> אם אין מספיק נתונים — לרשום «insufficient data» ולא לנחש.

| Metric (GSC) | Value |
| --- | --- |
| Impressions |  |
| Clicks |  |
| CTR |  |
| Average position |  |

### 4א) שאילתות ליבה — שירותים

| Query | Impressions | Clicks | Position | Landing URL |
| --- | --- | --- | --- | --- |
| אישורי הגעה |  |  |  | `/rsvp` |
| אישורי הגעה לאירועים |  |  |  | `/rsvp` |
| אישורי הגעה לחתונה |  |  |  | `/rsvp/chatuna` |
| אישורי הגעה בוואטסאפ |  |  |  | `/rsvp/whatsapp` |
| אישורי הגעה בSMS |  |  |  | `/rsvp/whatsapp` |
| Save the Date לחתונה |  |  |  | `/rsvp/save-the-date` |
| סייב דה דייט |  |  |  | `/rsvp/save-the-date` |
| הזמנות דיגיטליות לחתונה |  |  |  | `/invitations/chatuna` |
| סידורי הושבה לחתונה |  |  |  | `/seating-explained` |
| מספר שולחן לאורחים |  |  |  | `/info/guides/table-number-message` |
| מערכת ניהול אירועים |  |  |  | `/event-management` |
| חבילות אישורי הגעה |  |  |  | `/pricing` |
| כמה עולים אישורי הגעה לחתונה |  |  |  | `/info/guides/cost-rsvp-wedding` |
| מתי לשלוח אישורי הגעה |  |  |  | `/info/guides/when-to-send-rsvp` |
| אורחים שלא מאשרים הגעה |  |  |  | `/info/guides/guests-who-dont-reply` |
| ניהול רשימת מוזמנים |  |  |  | `/info/guides/guest-list` |
| תזכורת לאורחים לפני אירוע |  |  |  | `/rsvp/whatsapp` |
| הודעת תודה לאורחים |  |  |  | `/rsvp/whatsapp` |
| מה לבדוק לפני יום החתונה |  |  |  | `/info/guides/event-day-checklist` |
| Invistimo |  |  |  | `/` |

### 4ב) שאילתות לפי סוגי אירועים (ממופות ל־hubs — בלי עמודים דקים)

| Query | Impressions | Clicks | Position | Landing URL |
| --- | --- | --- | --- | --- |
| אישורי הגעה לבר מצווה |  |  |  | `/rsvp` |
| אישורי הגעה לבת מצווה |  |  |  | `/rsvp` |
| אישורי הגעה לברית |  |  |  | `/rsvp` |
| אישורי הגעה לבריתה |  |  |  | `/rsvp` |
| אישורי הגעה לחינה |  |  |  | `/rsvp` |
| אישורי הגעה לאירוע חברה |  |  |  | `/rsvp` |
| אישורי הגעה לכנס |  |  |  | `/rsvp` |
| הזמנה דיגיטלית ליום הולדת |  |  |  | `/invitations/chatuna` |
| הזמנה דיגיטלית לבת מצווה |  |  |  | `/invitations/chatuna` |
| הזמנה דיגיטלית לבר מצווה |  |  |  | `/invitations/chatuna` |
| סידורי הושבה לחינה |  |  |  | `/seating-explained` |
| סידורי הושבה לבר מצווה |  |  |  | `/seating-explained` |

מקור המיפוי: `lib/seo/keywordMap.ts` / `docs/seo/keyword-map.md`.

## 5) GA4 בסיס (שבוע 1)

| Metric | Value |
| --- | --- |
| Sessions (marketing) |  |
| Organic Search |  |
| `select_cta` |  |
| `generate_lead` / contact |  |
| `sign_up` |  |
| `ai_referral` (if any) |  |

## 6) Bing

| Metric | Value |
| --- | --- |
| Sitemap accepted |  |
| Impressions (if available) |  |
| Clicks |  |

## 7) AI crawlers / GEO

| Check | Result |
| --- | --- |
| robots.txt does not sitewide-block GPTBot / ClaudeBot / PerplexityBot / Google-Extended | PASS (rules allow AI crawlers; no sitewide block) |
| `llms.txt` + `answers.json` live on production | PASS |
| Manual AI question sample (optional, qualitative) | See `AI_MONITOR_QUESTIONS` in keyword map — after GSC/GA connect |

## 8) Off-page directories (registered)

| Directory | Profile URL | Link to site? | Notes |
| --- | --- | --- | --- |
| Mit4Mit |  |  | |
| MazalDay |  |  | |

## שימוש בהמשך

העתק שורה לדוח החודשי (`monthly-report-template.md`) והשווה Δ מול הבסיס הזה בלבד.
