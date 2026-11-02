# שינוי CTA ממוקד — משפך המרות (2026-11-02)

**ענף:** `fix/cta-conversion-funnel-2026-11-02`  
**היקף:** כפתורי פעולה + מדידת קליקים בלבד. ללא שינוי מחירים/חבילות/טפסים/רכישה.  
**אין Merge/Deploy ללא אישור.**  
**אין בקשת אינדוקס חוזרת** ל־`/rsvp/chatuna` / `/rsvp/bar-bat-mitzvah` (התקבלו 2.11.2026).

---

## לפני → אחרי

### דף הבית `/`

| מיקום | לפני | אחרי |
| --- | --- | --- |
| Hero primary «בואו נתחיל» | → `/try` | → **`/pricing`** (`select_cta`, placement `home_hero_primary`) |
| Hero secondary | «החבילות שלנו» → `/pricing` | **«נסו דמו»** → `/try` (`home_hero_demo`) |
| Final CTA | primary `/try` · secondary `/pricing` | primary **`/pricing`** · secondary **`/try`** |
| Header «נסו דמו עכשיו» | ללא שינוי | ללא שינוי |

### `/try` (התנהגות דמו ללא שינוי)

| מיקום | לפני | אחרי |
| --- | --- | --- |
| סיור / התנסות / API | ללא שינוי | ללא שינוי |
| סרגל תחתון | איפוס / סיום | + **לצפייה בחבילות** · **WhatsApp** |
| כרטיס סיום (Summary) | טופס ליד בלבד | + כפתורי **לצפייה בחבילות** / **פנייה ב־WhatsApp** מעל הטופס |

מספר WhatsApp: `https://wa.me/972555039072` (`FOOTER_WHATSAPP_HREF`).

### `/rsvp/chatuna`

| מיקום | לפני | אחרי |
| --- | --- | --- |
| Hero | pricing + how-it-works | אותם + **«שאלה בוואטסאפ»** (`chatuna_hero_whatsapp`) |
| שאר ה־CTAs | קיימים | נשמרו; נוספה מדידת `TrackedCtaLink` |

---

## מדידה (GA4)

| אירוע | מתי | לא נספר כ־ |
| --- | --- | --- |
| `select_cta` | קליק ל־`/pricing` (ו־CTA אחרים) | `purchase` |
| `click_whatsapp` | קליק ל־WA העסקי בלבד | `purchase` / `generate_lead` |
| `click_package` | הזמנת חבילה מ־WA עם `package_id` (קיים) | ללא שינוי |
| `trackFunnelClick` | קליקים מ־`/try` (בלי page_view מלא) | `purchase` |

אין שליחת שם/טלפון/אימייל בפרמטרי קליק. `safePublicPath` מוגבל ל־`invistimo.com` בלבד.

---

## בדיקות שבוצעו (מקומי, 2026-11-02)

| בדיקה | תוצאה |
| --- | --- |
| `npx tsc --noEmit` | **pass** |
| `npm run build` | **pass** |
| `public-conversion-events.test.ts` | **5/5 pass** |
| `seo-public.test.ts` + `interactive-demo.test.ts` | **38/38 pass** |

מובייל/דסקטופ: כפתורי Summary ב־`sm:grid-cols-2` + סרגל תחתון עם `flex-wrap`; Hero בית/Chatuna ב־`flex-wrap`.
