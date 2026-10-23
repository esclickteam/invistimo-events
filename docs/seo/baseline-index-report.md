# דוח בסיס — אינדוקס, חשיפות ומיקומים

**מטרה:** נקודת השוואה אחרי Deploy של PR #380.  
**מילוי:** רק ממספרים מיוצאים מ־GSC / Bing / GA4. **אין להמציא דירוגים.**

| שדה | ערך |
| --- | --- |
| תאריך Deploy לפרודקשן | ____-__-__ (Asia/Jerusalem) |
| תאריך מילוי הבסיס |  |
| GSC property | https://www.invistimo.com |
| Bing property |  |
| GA4 property / stream |  |

## 1) זמינות טכנית ביום ה־Deploy

| בדיקה | תוצאה | הערות |
| --- | --- | --- |
| https://www.invistimo.com/robots.txt |  | |
| https://www.invistimo.com/sitemap.xml |  | צפוי ~28 URL שיווקיים |
| https://www.invistimo.com/answers.json |  | |
| https://www.invistimo.com/llms.txt |  | |
| View-Source `/rsvp` — `התשובה הקצרה` |  | |
| View-Source `/pricing` — canonical |  | |

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

## 4) ביצועים — חלון 28 יום ראשון אחרי Deploy

> אם אין מספיק נתונים — לרשום «insufficient data» ולא לנחש.

| Metric (GSC) | Value |
| --- | --- |
| Impressions |  |
| Clicks |  |
| CTR |  |
| Average position |  |

### שאילתות מפתח מהמפה (primary)

| Query | Impressions | Clicks | Position | Landing URL |
| --- | --- | --- | --- | --- |
| אישורי הגעה |  |  |  | `/rsvp` |
| אישורי הגעה לחתונה |  |  |  | `/rsvp/chatuna` |
| אישורי הגעה בוואטסאפ |  |  |  | `/rsvp/whatsapp` |
| Save the Date לחתונה |  |  |  | `/rsvp/save-the-date` |
| הזמנות דיגיטליות לחתונה |  |  |  | `/invitations/chatuna` |
| סידורי הושבה לחתונה |  |  |  | `/seating-explained` |
| חבילות אישורי הגעה |  |  |  | `/pricing` |

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
| robots.txt does not sitewide-block GPTBot / ClaudeBot / PerplexityBot / Google-Extended |  |
| `llms.txt` + `answers.json` live on production |  |
| Manual AI question sample (optional, qualitative) | See `AI_MONITOR_QUESTIONS` in keyword map |

## 8) Off-page directories (registered)

| Directory | Profile URL | Link to site? | Notes |
| --- | --- | --- | --- |
| Mit4Mit |  |  | |
| MazalDay |  |  | |

## שימוש בהמשך

העתק שורה לדוח החודשי (`monthly-report-template.md`) והשווה Δ מול הבסיס הזה בלבד.
