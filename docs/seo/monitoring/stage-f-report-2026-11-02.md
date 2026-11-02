# שלב ו׳ — שיפור נראות מסחרית במנועי AI (INVISTIMO)

**תאריך:** 2026-11-02 (Asia/Jerusalem)  
**ענף / PR:** `stage-f-ai-commercial-visibility-2026-11-02` (PR נפרד מ־#480)  
**היקף:** אבחון + שיפורי תוכן/קישורים מאושרים; **אין** Merge/Deploy ללא אישור.  
**מגבלות שקוימו:** אין בלוג/השוואות חדשות; אין שינוי מחירים/חבילות/עיצוב/טפסים/URL; אין Request Indexing חוזר; אין כותרות SEO/GEO/AEO לגולש; אין המצאת תוצאות AI.

מקור נתוני AI Pass #1: `ai-pass1-report-2026-11-02.md` (הועתק לענף זה לצורך מעקב).

---

## 1) אבחון: למה ~82% מהופעות AI על הבית?

| גורם | עדות |
| --- | --- |
| **ריכוז סמכות ב־`/`** | 217/266 הופעות GSC AI (3M) על דף הבית — תשובה כללית למותג/קטגוריה |
| **דפי מוצר מרכזיים לא באינדקס** | `/rsvp/chatuna` ו־`/rsvp/bar-bat-mitzvah`: Stage E = Crawled–not indexed; GSC «אין דף מפנה»; **0** הופעות בדוח AI Pages |
| **`/pricing` באינדקס אך 0 AI** | לא ברשימת 18 דפי AI — מחשבון/מסחרי פחות מצוטט מתשובות כלליות |
| **מדריכים עם הופעות מיקרו** | cost / choose-company / no-reply / venue-guarantee — סה״כ 8; חזקים יותר מחלק מדפי השירות |
| **קישורי IN חלשים ל־bar-bat** | לפני Stage F: לא ב־ServiceLinks; לא ב־4 מדריכי AI; `LINKS.whatsapp` ב־bar-bat לא רונדר |
| **חפיפת נושא חתונה** | `/invitations/chatuna` Indexed (1 הופעת AI) מול `/rsvp/chatuna` לא באינדקס — סיכון דילול |

**מסקנה תפעולית:** בלי אינדוקס + אותות הפניה חזקים לדפי השירות, Google AI ממשיך לייחס חשיפה לבית ולמדריכים. Stage F מחזק רשת קישורים הקשרית ותשובות עובדתיות ייחודיות — **בלי** להגיש אינדוקס מחדש.

---

## 2) שינויי תוכן/קישורים שבוצעו

### 2.1 רשת קישורים פנימיים

| שינוי | קבצים |
| --- | --- |
| הוספת `/rsvp/bar-bat-mitzvah` ל־ServiceLinks | `components/marketing/ServiceLinks.tsx` |
| קישור WhatsApp + seating בפוטר FAQ של bar-bat | `BarBatMitzvahMarketingPage.tsx` |
| קישור bar-bat מ־chatuna FAQ cluster | `ChatunaMarketingPage.tsx` + `content.ts` |
| seating → bar-bat / WhatsApp / invitations | `seating-explained/content.ts` + `SeatingMarketingPage.tsx` |
| invitations → seating + bar-bat | `ChatunaInvitationsPage.tsx` |
| 4 מדריכי AI → bar-bat | cost / choose-company / no-reply / venue-guarantee |
| הסרת כרטיס חינה כפול ב־WhatsApp EVENTS | `WhatsappRsvpMarketingPage.tsx` |
| ניסוח RSVP בבית מזכיר חתונה + בר/בת מצווה | `HomeMarketingSections.tsx` |

### 2.2 תוכן עובדתי (ללא שינוי מחירים)

| עמוד | שיפור |
| --- | --- |
| `/rsvp/chatuna` FAQ מחיר | דוגמת ~250 רשומות, 2 סבבי WA, הושבה כתוספת — מפנה למחשבון |
| `/rsvp/bar-bat-mitzvah` FAQ מחיר + הושבה | רשומות בלי טלפון, הורים/כיתה, הפניה למחשבון/הושבה |
| `/rsvp/whatsapp` FAQ מחיר | ממוקד ערוץ (2 סבבים) + הפניה לעמודי סוג אירוע |
| `/seating-explained` FAQ אירועים אחרים | מפנה במפורש לעמודי chatuna / bar-bat |
| `PAGE_ANSWERS` | חידוד ייחודיות chatuna מול whatsapp/hub; bar-bat מול רשומות |

### 2.3 מה לא נגענו בו

מחירים · חבילות · עיצוב · טפסים · URL · מחיקת מדריכים · Request Indexing · הבטחות AI.

---

## 3) מדדי בסיס למעקב 30 ו־90 יום

קובץ מפורט: `stage-f-ai-impressions-baseline-2026-11-02.csv`  
JSON: `stage-f-summary-2026-11-02.json`

| מדד | בסיס 2026-11-02 | יעד מעקב 30d | יעד מעקב 90d |
| --- | ---: | --- | --- |
| GSC AI impressions סה״כ (גלגול 3M) | **266** | מגמה | מגמה |
| הופעות `/` | **217** (~81.6%) | ירידת **שיעור** אם דפי שירות עולים | שיעור בית <75% אם אפשר |
| סכום עדיפות עם הופעות (whatsapp+seating+invitations) | **8** | עלייה | עלייה |
| `/rsvp/chatuna` AI impressions | **0** | >0 אחרי אינדוקס | יציב |
| `/rsvp/bar-bat-mitzvah` AI impressions | **0** | >0 אחרי אינדוקס | יציב |
| `/pricing` AI impressions | **0** | מעקב | מעקב |
| סכום 4 מדריכי AI | **8** | לא חייבים לרדת | איזון מול שירות |
| Bing AI Citations | **0** | >0 | יציב |
| GA4 Session Referral / AI sources | אין שורת Referral (112 sessions channel); source/medium **לא הושלם** | Session source/medium | Session source/medium |

**אינדקס (לא להגיש שוב):** chatuna + bar-bat = Request Indexing התקבל 2.11.2026 — מעקב סטטוס בלבד בעוד 3–7 ימים+.

---

## 4) בדיקות מנועי AI (השלמה Stage F)

פירוט הרצות: `stage-f-engine-runs-2026-11-02.csv` (+ Pass1 ב־`ai-pass1-engine-runs-2026-11-02.csv`).

### 4.1 סטטוס לפי מנוע

| מנוע | כיסוי | Brand / Citation Invistimo | הערה |
| --- | --- | --- | --- |
| **Google AI Mode** | 10 (Pass1) + 12 מזהים חדשים | **Q22** מותג+ציטוט; **Q17** ציטוט בלבד; שאר הדגימות — לא | מתחרים: My Invite, Attending, Diginet, WiWi… |
| **Gemini** (Flash-Lite לא מחובר) | Q2,Q5 + 8 מזהים (1,4,8–12,14) | **0** | אין grounding links |
| **ChatGPT Search** | Q2 בלבד | **Q2** מותג+ציטוט+לינק | יתר 29: **Not tested** (login) |
| **Copilot** | — | — | **Not tested** (sign-in) |
| **Perplexity** | — | — | **Not tested** (sign-in) |

### 4.2 הפרדה

- **Brand** ≠ **Citation** ≠ **organic site entry** (SERP) — מתועד בקבצי הרצה.
- אין המצאת תוצאות למנועים חסומים.

### 4.3 GA4

- Traffic Acquisition · **Session default channel group** · 28d: Direct 41 / Organic Social 39 / Organic Search 31 / Unassigned 1 · **אין Referral**.
- **Session source/medium** לדומייני AI: **Not tested** (חסימת UI/ממד בסשן).

---

## 5) בדיקות איכות PR

| בדיקה | תוצאה |
| --- | --- |
| `npm run test:seo` | **PASS** (31 pass · 1 skipped live crawl) |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| QA ידני קצר | קישורים חדשים ב־ServiceLinks / FAQ footers / מדריכים — לאימות אחרי Deploy |

---

## 6) המלצות מעקב (לא מיושם כאן)

1. בעוד 3–7 ימים: URL Inspection ל־chatuna / bar-bat — סטטוס אינדקס בלבד.  
2. חזרה על GSC AI Pages בעוד 30 ו־90 יום מול CSV הבסיס.  
3. השלמת ChatGPT/Copilot/Perplexity אחרי auth.  
4. GA4 Session source/medium ל־chatgpt.com / perplexity.ai / gemini.google.com / copilot.
