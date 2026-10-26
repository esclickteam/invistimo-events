# דוח מדיניות סרטונים — אתר ציבורי Invistimo

**היקף:** עמודים ציבוריים לפני התחברות בלבד.  
**לא נכלל:** דשבורד, ניהול אירועים מחובר, תבניות אתר חתונה של לקוחות, עורך WW.  
**תוכן טקסטואלי:** לא שונה — רק ניגון, יחס ממדים ותצוגת סרטונים.

## מדיניות משותפת

רכיב: `components/marketing/PublicAutoplayVideo.tsx`  
מטא־נתונים: `lib/marketing/publicVideoMeta.ts`

| דרישה | יישום |
| --- | --- |
| Autoplay | כן, כשנכנס ל־viewport (~20%+), מושתק |
| muted / loop / playsInline | כן |
| preload | `metadata` כשנטען / eager; אחרת `none` עד קרוב למסך |
| object-fit | `contain` בלבד (ללא חיתוך) |
| aspect-ratio | ממדי ffprobe אמיתיים לכל קובץ |
| prefers-reduced-motion | השהיה + כפתור ניגון נגיש |
| חסימת autoplay | הודעה + כפתור «ניגון» |
| הגדלה למסכי מערכת | כפתור «הגדלה» (lightbox) |
| קריינות | `allowUnmute` בעמודי ניהול אירוע |

## מידות מקור (ffprobe)

| קובץ | מידות | יחס | אוריינטציה |
| --- | --- | --- | --- |
| `/marketing/videos/hero-guest-journey.webm` | 390×844 | ~9:16 | אנכי |
| `/marketing/videos/home-save-the-date.webm` | 1280×720 | 16:9 | אופקי |
| `/marketing/videos/wedding-website-scroll.webm` | 1280×720 | 16:9 | אופקי |
| `/videos/rsvp-hero-wa.mp4` | 840×1520 | ~9:16 | אנכי |
| `/videos/rsvp-steps-wa.mp4` | 840×1520 | ~9:16 | אנכי |
| `/videos/chatuna-guests.mp4` | 1280×720 | 16:9 | אופקי |
| `/videos/chatuna-timing-v.mp4` | 720×1280 | 9:16 | אנכי |
| `/videos/smartsit.mp4` | 1280×720 | 16:9 | אופקי |
| `/videos/tablesit.mp4` | 1882×898 | ~21:10 | אופקי |
| `/videos/eventsit.mp4` | 1280×720 | 16:9 | אופקי |
| `/videos/sit4.mp4` | 500×500 | 1:1 | מרובע |
| `/videos/rsvp2.mp4` | 1920×1080 | 16:9 | אופקי |
| `/videos/event-management/*.webm` | 1280×800 | 8:5 | אופקי (מערכת) |

## עמודים שעודכנו

| עמוד / מדריך | סרטון | תצוגה | תוצאה |
| --- | --- | --- | --- |
| `/` (Hero) | hero-guest-journey | contain בתוך מסגרת טלפון; טעינה אחרי LCP | תקין — ללא חיתוך |
| `/` (STD section) | home-save-the-date | PublicAutoplay · 16:9 contain | תקין |
| `/rsvp` | rsvp-hero-wa + journey | MarketingVideo → shared | תקין |
| `/rsvp/whatsapp` | rsvp-steps-wa | QuietVideo → shared · 9:16 | תקין |
| `/rsvp/chatuna` | hero/guests/seating/timing | ChatunaVideo contain | תקין |
| `/rsvp/hina` | smartsit | PublicAutoplay + הגדלה | תקין |
| `/rsvp/save-the-date` | home-save-the-date | PublicAutoplay | תקין |
| `/invitations/chatuna` | hero-guest-journey ×2 | PublicAutoplay · 9:16 | תקין |
| `/seating-explained` | tablesit | SeatingDemoVideo + הגדלה | תקין |
| `/wedding-website` | wedding-website-scroll | aspect-video contain | תקין |
| `/event-management` (שיווק) | 4× system webm | 8:5 · unmute · captions · הגדלה | תקין |
| מדריך send-digital-invitation | journey + steps | PublicAutoplay | תקין |
| מדריך save-the-date-vs-invitation | home-save-the-date | PublicAutoplay | תקין |
| PublicContentPage (שירותי SEO) | rsvp-steps-wa / rsvp2 | לפי variant phone/wide | תקין |

## מה לא נגענו בו (בכוונה)

- תבניות / עורך אתר חתונה (`components/wedding-website/**`) — מוצר אחרי התחברות / אתרי לקוח
- דשבורד ומסכי ניהול מחוברים
- תוכן טקסטואלי של עמודים ומדריכים
- החלפת קבצי מדיה חדשים / צילומי מסך חדשים (משימת מדיה נפרדת אם נדרש)

## אימות מול מלאי מלא

לאחר מיפוי כל 25 מופעי הנגן הציבוריים, כל המופעים החיים עברו ל־`PublicAutoplayVideo` (או Hero בית עם contain + deferred load).  
נכסים שמופיעים ב־`content.ts` / `services.ts` אך **לא מורנדרים** (`rsvp2.mp4`, `eventsit.mp4`) נשארו מחוץ ל־UI — אין פעולת מדיניות נדרשת עד שיחוברו לעמוד.

## חסר / המשך מומלץ

1. מדריכים רבים עדיין ללא סרטון ייעודי לעמוד (רק חלק מהמדריכים משתמשים בוידאו) — יצירת סרטוני מוצר חדשים דורשת סביבת בדיקה והקלטה, מחוץ לשינוי מדיניות הניגון.
2. דחיסת נוספת של `hero-guest-journey.webm` (~כבד) תשפר LCP במובייל.
3. בדיקת דפדפן ידנית בדסקטופ + מובייל אחרי deploy ל־preview (ללא merge/prod ללא אישור).

## בדיקות אוטומטיות

- `scripts/tests/public-video-policy.test.ts`
- עדכון `scripts/tests/seo-public.test.ts`
- נכלל ב־`npm run test:seo`
