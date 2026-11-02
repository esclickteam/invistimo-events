# AI Visibility Pass #1 — INVISTIMO (2026-11-02)

**תאריך הרצה:** 2026-11-02 (Asia/Jerusalem)  
**ענף / PR:** `docs/seo-monitoring-baseline-2026-11-02` · PR #480  
**היקף:** ניטור בלבד — ללא שינוי תוכן/עיצוב/קוד; ללא Merge/Deploy.  
**שאלות מקור:** `ai-monitor-questions-baseline-2026-11-02.csv`  
**וריאנטים ניטרליים (ללא שם מותג):** `ai-pass1-neutral-questions-2026-11-02.csv`

### כללי דיווח
- **Brand mention** = שם Invistimo בטקסט התשובה.  
- **Citation / source** = קישור או מקור שמצביע ל־invistimo.com.  
- **Site entry** = כניסה בפועל לאתר (לא נמדד בסשן זה מעבר לציטוט עם לינק).  
- הרצה אחת ≠ דירוג קבוע.  
- מנוע לא נגיש = **Not tested** (אין המצאת תוצאות).  
- WebSearch אורגני ≠ ממשק AI Overviews / AI Mode / ChatGPT Search.

---

## תקציר מנהלים

1. **GSC Generative AI פעיל ומוכיח חשיפה אמיתית** — **266 הופעות / 3 חודשים** בדוח `…/performance/search-analytics/ai` (הנתיב `…/performance/generative-ai` מחזיר 404).  
2. **החשיפה מרוכזת בדף הבית** (217/266) — דפי מוצר מסחריים `/rsvp/chatuna` ו־`/rsvp/bar-bat-mitzvah` **אינם** ברשימת 18 הדפים עם הופעות AI.  
3. **ChatGPT Search** — דגימה חיובית: שאילתת WhatsApp RSVP ניטרלית → **מותג + ציטוט + לינק** ל־Invistimo.  
4. **Google AI Mode (10 שאילתות ניטרליות)** — Invistimo ב־**2/10**: Q22 מעקב RSVP (**מותג+ציטוט**), Q17 שיחות מוקלטות מול מוקד (**ציטוט בלבד**); ב־8/10 אין (מחיר/הושבה/בר מצווה/מתנות/חבילות וכו׳).  
5. **Gemini** — בדגימות WhatsApp + מחיר: אין Invistimo.  
6. **Bing AI Performance** — **0 Citations**; Copilot + Perplexity — **Not tested** (auth).  
7. **GA4** — User Acquisition 28d: רק Organic Social / Direct / Organic Search; **אין שורת Referral**.

---

## 1) GSC — תכונות מבוססות-AI גנרטיבי (Beta)

| שדה | ערך |
| --- | --- |
| URL תקין | `https://search.google.com/search-console/performance/search-analytics/ai?resource_id=sc-domain:invistimo.com` |
| URL שבור (משתמש) | `…/performance/generative-ai?…` → **404** |
| חלון | **3 חודשים** (~1.8.2026–31.10.2026) |
| סה״כ הופעות | **266** |
| עדכון אחרון UI | ~4 שעות לפני הצילום |
| דפים עם הופעות | **18** |
| מדינות | **6** (ישראל דומיננטית) |
| מכשירים | נייד **183** · מחשב **83** |

### 1.1 דפים (כל 18)

| # | URL | הופעות |
| ---: | --- | ---: |
| 1 | `https://www.invistimo.com/` | **217** |
| 2 | `/login` | 27 |
| 3 | `/credit-gifts` | 10 |
| 4 | `/event-management` | 5 |
| 5 | `/faq` | 5 |
| 6 | `/accessibility` | 4 |
| 7 | `/info/guides/cost-rsvp-wedding` | 4 |
| 8 | `/rsvp/whatsapp` | 4 |
| 9 | `/privacy` | 3 |
| 10 | `/seating-explained` | 3 |
| 11 | `/info/guides/how-to-choose-rsvp-company` | 2 |
| 12 | `/rsvp/save-the-date` | 2 |
| 13 | `/try/dashboard` | 2 |
| 14 | `/info/guides/guests-who-dont-reply` | 1 |
| 15 | `/info/guides/wedding-venue-guest-guarantee` | 1 |
| 16 | `/invitations/chatuna` | 1 |
| 17 | `/rsvp` | 1 |
| 18 | `/wedding-website` | 1 |

**חסרים מהרשימה (חשוב):** `/rsvp/chatuna`, `/rsvp/bar-bat-mitzvah`, `/pricing`.

### 1.2 מדינות

| מדינה | הופעות |
| --- | ---: |
| ישראל | **259** |
| הולנד | 3 |
| קפריסין | 1 |
| צרפת | 1 |
| רוסיה | 1 |
| ארצות הברית | 1 |

### 1.3 הגדרות הכללה / robots

| בדיקה | תוצאה |
| --- | --- |
| GSC UI «הגדרות הכללה ל־AI» | **לא אומת בממשק** בסשן זה (לא נמצא מסך ייעודי שנפתח) |
| `robots.txt` חי | אין חסימת `Google-Extended`; יש `User-Agent: OAI-SearchBot` עם `Allow: /` (+ אותם Disallow כמו Googlebot) |
| הערה | `/login` ב־Disallow אך קיבל **27** הופעות בדוח AI — כנראה ייחוס הופעה שאינו תלוי ב־crawl נוכחי בלבד |

---

## 2) Bing Webmaster — AI Performance (BETA)

| מדד (3M) | ערך חי |
| --- | --- |
| Citations | **0** |
| Avg Cited Pages | **0** |
| Grounding Queries | ריק |
| Cited Pages | ריק |

**מסקנה:** אין עדות לציטוטי Copilot/Bing AI עבור invistimo.com בחלון זה.

---

## 3) GA4 — הפניות AI

| בדיקה | תוצאה |
| --- | --- |
| נכס | INVISTIMO `p561016940` |
| דוח | User Acquisition · First user primary channel group · **5.10–1.11.2026 (28d)** |
| ערוצים שנראו | Organic Social **39** · Direct **24** · Organic Search **19** · סה״כ users **82** |
| Referral / AI domains | **לא הופיעה שורת Referral**; לא בוצע פירוט Source=`chatgpt.com` / `perplexity.ai` / `gemini.google.com` / `copilot.microsoft.com` בסשן זה |

**סטטוס:** אין עדות לערוץ Referral מ־AI ב־28d ברמת Default Channel Group. סינון Source ספציפי = follow-up.

---

## 4) הרצות מנועי AI (דגימה Pass #1)

שאלות הורצו בוריאנט **ניטרלי בעברית** (ללא «Invistimo»).  
רק שאלות שסומנו למטה הורצו בפועל; השאר = `not_run` / מנוע = **Not tested**.

### 4.1 טבלת דגימות מתועדות

| id | נושא | מנוע | Brand | Citation | Linked URL | הערה |
| ---: | --- | --- | :---: | :---: | --- | --- |
| 2 | whatsapp_rsvp | **ChatGPT Search** | **כן** | **כן** | כן | פתרון מוביל + לינק אתר |
| 2 | whatsapp_rsvp | **Gemini** | לא | לא | — | Easy / Weddoo / Eventify / PicAEvent |
| 5 | pricing | **Gemini** | לא | לא | — | My Invite / Wedly / Vitoo |
| 5 | pricing | **Google AI Mode** | לא | לא | — | My Invite / השושבין / Mit4Mit וכו׳ |
| 6 | seating | **Google AI Mode** | לא | לא | — | תשובה כללית |
| 7 | bar_bat_mitzvah | **Google AI Mode** | לא | לא | — | תשובה כללית |
| 13 | table_number | **Google AI Mode** | לא | לא | — | תשובה כללית |
| 19 | credit_gifts | **Google AI Mode** | לא | לא | — | תשובה כללית |
| **22** | **rsvp_tracking** | **Google AI Mode** | **כן** | **כן** | כן (`› rsvp`) | מותג בטקסט + כרטיס מקור WhatsApp RSVP; גם Attending / Diginet |
| **17** | **calls** | **Google AI Mode** | לא (בפרוזה) | **כן** | כן | כרטיס מקור «שיחות AI ומוקד אנושי - Invistimo» בלבד |
| 15 | seating | **Google AI Mode** | לא | לא | — | ציטוט קתדרה |
| 30 | personal_rsvp | **Google AI Mode** | לא | לא | — | Ceremo / RSVPd / Fotify / Paperlust |
| 3 | packages | **Google AI Mode** | לא | לא | — | DIGINET / My Invite / vixsolutions |
| * | * | **Perplexity** | — | — | — | **Not tested** — Google sign-in |
| * | * | **Microsoft Copilot** | — | — | — | **Not tested** — Microsoft sign-in; Bing Citations=0 |

### 4.2 שיעורי הופעה (על בסיס דגימות בלבד)

| מנוע | Brand | Citation | סטטוס |
| --- | --- | --- | --- |
| ChatGPT Search | 1/1 (Q2) | 1/1 | **מופיע** |
| Gemini | 0/2 (Q2,Q5) | 0/2 | **לא מופיע** |
| Google AI Mode | **1/10** (Q22) | **2/10** (Q22, Q17) | **מופיע חלקית** — לא כפוקוס יחיד |
| Perplexity | — | — | **Not tested** |
| Copilot | — | — | **Not tested** (+ Bing Citations=0) |

**אזהרה:** דגימת UI; אין להסיק דירוג יציב.

### 4.3 SERP AI Overview (3 שאילתות נפרדות — לא נספר כ־AI Mode matrix)

| id | AI Overview עם Invistimo | Organic invistimo.com |
| ---: | :---: | :---: |
| 5 pricing | לא | כן |
| 22 rsvp_tracking | כן | כן |
| 17 calls | כן («מדריך של Invistimo») | כן (#1) |

---

## 5) סטטוס INVISTIMO לפי מנוע

| מנוע | סטטוס | על אילו שאלות הופיע (בדגימה) | נושאים לחיזוק |
| --- | --- | --- | --- |
| **GSC AI Overviews / AI Mode (מדידה)** | חשיפה קיימת, מרוכזת בבית | לא לפי שאילתה בדוח Pages — בעיקר `/` | דפי מוצר מסחריים (`/rsvp/chatuna`, `/rsvp/bar-bat-mitzvah`, `/pricing`); מדריכי בחירה/מחיר כבר עם הופעות מיקרו |
| **ChatGPT Search** | חיובי בדגימה | Q2 WhatsApp RSVP | להרחיב דגימה ל־pricing / seating / bar-mitzvah / credit-gifts |
| **Gemini** | שלילי בדגימה | אף אחת מ־Q2/Q5 | WhatsApp + מחיר בקטגוריה ש־Gemini מצטט |
| **Google AI Mode** | חיובי חלקי (2/10) | **Q22** מעקב RSVP (מותג+ציטוט); **Q17** שיחות (ציטוט בלבד) | מחיר, הושבה, בר מצווה, מספר שולחן, מתנות אשראי, RSVP אישי, חבילות הודעות |
| **Copilot / Bing AI** | Not tested + Citations=0 | — | תוכן ש־Bing מצטט; הרצה אחרי sign-in |
| **Perplexity** | Not tested | — | להריץ אחרי התחברות |

---

## 6) אפשרויות שיפור (המלצות ניטור — לא מיושם)

1. **אינדוקס + חשיפת דפי מוצר** — לוודא ש־`/rsvp/chatuna` ו־`/rsvp/bar-bat-mitzvah` נכנסים לאינדקס (Stage E: Request Indexing כבר התקבלה; לא להגיש שוב) ואז לעקוב אם נכנסים לדוח GSC AI.  
2. **חיזוק דפי כוונה מסחרית שכבר ב־AI ברמה מיקרו** — `/rsvp/whatsapp`, `/info/guides/cost-rsvp-wedding`, `/info/guides/how-to-choose-rsvp-company`, `/seating-explained`, `/credit-gifts`.  
3. **הפחתת רעש** — `/login` עם 27 הופעות AI למרות Disallow; לבדוק למה Google מייחס הופעות לדף התחברות.  
4. **Pass #2** — להשלים 30×מנועים נגישים; Perplexity+Copilot אחרי auth; סינון GA4 Source ל־chatgpt/perplexity/gemini/copilot.  
5. **אין שינוי תוכן/עיצוב בקובץ זה** — רק תיעוד.

---

## 7) קבצים נלווים

| קובץ | תפקיד |
| --- | --- |
| `ai-pass1-neutral-questions-2026-11-02.csv` | מיפוי 30 שאלות → שאילתות ניטרליות |
| `ai-pass1-engine-runs-2026-11-02.csv` | יומן הרצות מנוע בדגימה |
| `ai-pass1-summary-2026-11-02.json` | סיכום מובנה |
| `ai-monitor-questions-baseline-2026-11-02.csv` | עודכן חלקית לפי דגימות |

---

## 8) מה לא בוצע / מגבלות

- לא הורצו כל 30 השאלות × 5 מנועים (Google AI Mode: 10/30; ChatGPT/Gemini: דגימות חלקיות).  
- Perplexity + Copilot UI = Not tested (auth).  

- GA4: לא נפתח פירוט Source/Medium לכל דומיין AI.  
- GSC AI inclusion settings בממשק = לא אומתו ויזואלית.  
- אין השוואות אתרים מתחרים מעבר לציון שמות שהופיעו בתשובות AI שנצפו.
