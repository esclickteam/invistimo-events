# דוח מסירה סופי — מדיה ועיצוב אתר ציבורי (לפני התחברות)

**ענף:** `cursor/public-video-policy-b403` · **PR:** #450  
**עדכון:** 27 באוקטובר 2026, Asia/Jerusalem  
**מגבלות:** ללא Merge / Deploy ללא אישור · ללא שינוי מסכי post-login · צילומי מוצר מדמו מבודד `/try` בלבד

## סיכום לאישור

| תחום | תוצאה |
| --- | --- |
| מדיניות סרטונים אחידה (`PublicAutoplayVideo`) | PASS |
| 7 סרטונים ייעודיים חסרים (bar/bat, brit, calls, gifts, alcohol, WA/SMS, bit/PayBox) | PASS — נוצרו וחוברו |
| עצירת מיחזור אווירה (`hero-reception` / `hall-tables` / `venue`) | PASS — הוחלפו בנכסים ייחודיים לכל מדריך |
| צילומי מודולים ייחודיים מ־`/try` (לא העתקי קובץ) | PASS — ראו `public/images/marketing-captures/unique/` |
| QA וידאו דסקטופ + טאבלט + מובייל (23 עמודים × 3) | **PASS 69 / FAIL 0** (אחרי תיקון overflow ב־`/invitations/chatuna`) |
| תוויות SEO/AEO/GEO גלויות | PASS — לא נמצאו |
| Merge / Deploy | **לא בוצע** — ממתין לאישור מפורש |

**Preview:** ענף PR #450 (`cursor/public-video-policy-b403`) — קישור Preview של הסביבה/Vercel לפי הגדרות הריפו ב־PR.

**ראיות QA:** `docs/seo/public-video-policy/VIDEO-QA-RESULTS.json` · צילומים: `/opt/cursor/artifacts/screenshots/public-video-qa/`

---

## נכסים חדשים שנוצרו

### אווירה ייחודית (`/images/rsvp/guides/unique-atmosphere/`)
wedding-planning-hero/venue/hall · event-day-reception/venue/morning · event-mgmt-vs-prod-hero/venue/toast · choose-company-hero · seating-plan-hall · table-number-hall · whatsapp-vs-sms-hero · bit-paybox-hero · credit-gifts-hero · alcohol-hero · calls-concept · bar/bat/brit video stills · venue-guarantee-hall

### צילומי מערכת ייחודיים (`/images/marketing-captures/unique/`)
module-guests-overview/scrolled/pending-filter/mobile/tablet/stats-strip · module-seating-full/interaction/guest-panel/mobile/tablet/wide/panel-open/bottom-tables · module-messages-compose/sms-tab/whatsapp-focus · module-check-in · module-event-management(+tasks) · module-recorded-calls

### סרטונים (`/videos/marketing-captures/`)
**המחשות תכנוניות (Ken Burns):** `guide-bar-bat-mitzvah` · `guide-brit-brita` · `guide-rsvp-calls` · `guide-credit-gifts` · `guide-alcohol` · `guide-whatsapp-vs-sms` · `guide-bit-paybox`  
**הקלטות מסך מוצר מ־`/try`:** `product-guests-dashboard` · `product-seating-map` · `product-messages` · `product-recorded-calls` · `product-check-in` · `product-event-management`  
(+ הקלטות קודמות `demo-*` שנותרו בשימוש ייעודי בלי כפילות קבצים)

### מותג משותף שנשאר בכוונה
לוגו · הזמנות דמו (`invite-*-mia-alon` וכד') · פוסטרים של מסע אורח / Save the Date כשזה אותו מוצר מותג

---

## טבלת עמודים — ליבה

| URL | תמונות שנבדקו | סרטונים שנבדקו | הוחלף / חדש | Desktop | Tablet | Mobile | סטטוס |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | hero journey + seating poster ייחודי | 2 | pause/contain; seating לא ממוחזר מ־try ישן | PASS | PASS | PASS | **PASS** |
| `/rsvp` | posters + journey | 2 | PublicAutoplay | PASS | PASS | PASS | **PASS** |
| `/rsvp/chatuna` | media chatuna | 5 | policy | PASS | PASS | PASS | **PASS** |
| `/rsvp/hina` | dashboard ייחודי ממודול event-mgmt | 1 | dashboard ייחודי; חלק מצילומי טלפון עדיין מ־chatuna (מותג מוצר דומה) | PASS | PASS | PASS | **PASS** (טלפונים מותג — ראו הערות) |
| `/rsvp/bar-bat-mitzvah` | מדיה ייעודית קיימת | 2 חדשים | `product-guests` + `guide-bar-bat` | PASS | PASS | PASS | **PASS** |
| `/rsvp/brit-brita` | מדיה ייעודית | 2 חדשים | `demo-seating-map` + `guide-brit` | PASS | PASS | PASS | **PASS** |
| `/rsvp/whatsapp` | journey | 1–3 | policy | PASS | PASS | PASS | **PASS** |
| `/rsvp/calls` | UI + אודיו | 1 חדש | `product-recorded-calls` | PASS | PASS | PASS | **PASS** |
| `/rsvp/save-the-date` | STD | 1 | — | PASS | PASS | PASS | **PASS** |
| `/invitations/chatuna` | designs | 2 | overflow-x-hidden במובייל | PASS | PASS | PASS | **PASS** |
| `/seating-explained` | product | 1 | — | PASS | PASS | PASS | **PASS** |
| `/event-management` | product | 4 | policy | PASS | PASS | PASS | **PASS** |
| `/credit-gifts` | hero ייחודי + dashboard ייחודי | 1 חדש | `guide-credit-gifts` + hero-envelope-unique | PASS | PASS | PASS | **PASS** |
| `/wedding-website` | templates | 1 | — | PASS | PASS | PASS | **PASS** |
| `/pricing` | מעט | 0 | ביקורת תוכן בסיסית | — | — | — | **PASS** (ללא וידאו) |
| `/faq` `/info/about` `/info/guides` `/contact` | טקסט/מינימלי | 0 | — | — | — | — | **PASS** (ללא וידאו) |
| `/terms` `/privacy` `/accessibility` | טקסט | 0 | — | — | — | — | **PASS** |

## מדריכים

| URL | תמונות | סרטונים | נכסים חדשים/הוחלפו | D/T/M | סטטוס |
| --- | --- | --- | --- | --- | --- |
| `/info/guides/seating-plan` | hall ייחודי + seating-full | product-seating-map | כן | PASS×3 | **PASS** |
| `/info/guides/guests-who-dont-reply` | guests-pending ייחודי | demo-guests-dashboard | כן | PASS×3 | **PASS** |
| `/info/guides/whatsapp-vs-sms-rsvp` | whatsapp-vs-sms-hero | product-messages | כן | PASS×3 | **PASS** |
| `/info/guides/bit-paybox-wedding-invitation` | bit-paybox-hero (לא credit משותף) | guide-bit-paybox | כן | PASS×3 | **PASS** |
| `/info/guides/wedding-alcohol-calculator` | alcohol-hero ייחודי | guide-alcohol | כן | PASS×3 | **PASS** |
| `/info/guides/event-day-checklist` | reception/venue ייחודיים + check-in/seating | product-check-in | כן | PASS×3 | **PASS** |
| `/info/guides/event-management-vs-production` | hero/venue/toast ייחודיים + event-mgmt | product-event-management | כן | PASS×3 | **PASS** |
| `/info/guides/wedding-planning` | hero/venue/hall ייחודיים | 0 | אווירה יוחדה | — | **PASS** (מדריך תכנון; בלי סרטון מוצר חובה) |
| `/info/guides/table-number-message` | table-number-hall + seating-mobile | 0 | כן | — | **PASS** |
| `/info/guides/guest-list` | guests-scrolled | 0 | כן | — | **PASS** |
| `/info/guides/cost-rsvp-wedding` | guests-mobile | 0 | כן | — | **PASS** |
| `/info/guides/how-to-choose-rsvp-company` | choose-hero + guests-stats + seating-tablet | 0 | כן | — | **PASS** |
| `/info/guides/send-digital-invitation` | messages-compose | 2 קיימים | dashboard ייחודי | PASS×3 | **PASS** |
| `/info/guides/save-the-date-vs-invitation` | STD מותג | 1 | — | PASS×3 | **PASS** |
| `/info/guides/wedding-venue-guest-guarantee` | terrace venue + guests-overview | 0 | כן | — | **PASS** |
| `/info/guides/wedding-seating-arrangements` | seating panel + poster | 0 | כן | — | **PASS** |
| `/info/guides/when-to-send-rsvp` | posters מותג | 0 | — | — | **PASS** |
| `/info/guides/wedding-vendors-contracts` | תוכן | 0 | ביקורת בסיסית | — | **PASS** (ללא מדיה כבדה) |

---

## QA וידאו — מה נבדק בכל עמוד עם סרטון

- Autoplay מושתק ב־viewport · Loop · playsInline · Pause/Play נגיש («השהיה/ניגון»)
- `object-fit: contain` · יחס ממדים מה־registry · ללא חיתוך מדיניות
- טעינה אחרי גלילה · אין תוויות פנימיות גלויות · overflow אופקי
- Hero בית: כפתור השהיה קומפקטי משולב (לא Play ענק) — אומת במובייל

תוצאה מצטברת: **69 PASS / 0 FAIL** בקובץ `VIDEO-QA-RESULTS.json`.

---

## Before / After

| לפני | אחרי |
| --- | --- |
| `hero-reception` / `hall-tables` / `venue` חוזרים בין מדריכים | קובץ אווירה ייחודי לכל מדריך תחת `unique-atmosphere/` |
| «צילומי דמו» שהיו העתק MD5 זהה בשמות שונים | צילומי מודול עם hash ייחודי + מצבי UI שונים |
| bar/bat, brit, calls, gifts, alcohol, WA/SMS, bit ללא סרטון | סרטון ייעודי לכל אחד (+ הקלטת מסך כשיש פיצ׳ר במערכת) |
| Hero בית בלי השהיה ברורה במובייל | כפתור השהיה/ניגון משולב |
| `/invitations/chatuna` overflow במובייל | `overflow-x-hidden` על מעטפת העמוד |

צילומי מסך: `/opt/cursor/artifacts/screenshots/public-video-qa/` ו־`public-audit/`.

---

## הערות כנות (לא מסומן PASS במקום שאין)

1. **דמו `/try` הוא חתונה אחת** — אין אירועי בר־מצווה/ברית/חינה נפרדים בדמו. סרטוני מוצר לבר/בת וברית הם הקלטות מודולי RSVP/הושבה מהדמו + המחשת אווירה ייעודית. לא הוצגו יכולות שלא קיימות.
2. **טלפוני hina** — חלק מצילומי מסגרת הטלפון עדיין משותפים עם chatuna (אותו מסע אורח במוצר). הדשבורד הוחלף לייחודי.
3. **bit/PayBox ומתנות** — אין מסך הגדרת תשלומים מלא ב־`/try`; לכן סרטון ההמחשה הוא תכנוני/קונספט, לא הקלטת סליקה.
4. **אלכוהול** — מדריך תכנון + מחשבון; סרטון המחשה (לא פיצ׳ר מערכת Invistimo ב־`/try`).
5. **לא בוצע Merge/Deploy.**

---

## בדיקות אוטומטיות

`npx tsx --test scripts/tests/public-video-policy.test.ts` → **5/5 pass**  
מלאי: `node scripts/audit-public-media.mjs` → `MEDIA-INVENTORY.json` עודכן
