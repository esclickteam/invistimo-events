# ספריית מדיה — ממערכת הדמו (נתונים פיקטיביים)

**עודכן:** 2026-10-23 (Asia/Jerusalem)  
**מקור:** מסכי `/try`, `/invite/demo-share`, ותבניות `/wedding-website/*` — לא סטוק גנרי.

## צילומי מסך (WebP)

| קובץ | תוכן | שימוש עיקרי |
| --- | --- | --- |
| `/marketing/product/webp/desktop-try-dashboard.webp` | דשבורד אישורי הגעה | RSVP, מדריכים, `/for/*` |
| `/marketing/product/webp/mobile-try-dashboard.webp` | דשבורד בנייד | אותו |
| `/marketing/product/webp/desktop-try-seating.webp` | מפת הושבה | seating, seating-plan |
| `/marketing/product/webp/mobile-try-seating.webp` | הושבה בנייד | seating |
| `/marketing/product/webp/desktop-try-event-mgmt.webp` | ניהול אירוע | event-management, corporate |
| `/marketing/product/webp/desktop-wedding-*.webp` | תבניות אתר חתונה | wedding-website, guides |
| `/marketing/product/webp/mobile-wedding-*.webp` | תבניות בנייד | הזמנות / אתר |
| `/marketing/product/webp/desktop-guest-rsvp.webp` | **חדש** — מסך אורח מאשר בקישור | `/rsvp`, מדריכי RSVP |
| `/marketing/product/webp/desktop-guest-rsvp-confirm.webp` | **חדש** — בחירת מגיע | RSVP |
| `/marketing/product/webp/mobile-guest-rsvp.webp` | **חדש** — אורח בנייד | הזמנות / RSVP |
| `/marketing/product/webp/desktop-messages-sms.webp` | **חדש** — סבב SMS + תצוגה מקדימה | `/rsvp/sms`, reminders |
| `/marketing/product/webp/desktop-messages-sms-reminder.webp` | **חדש** — תזכורת SMS | תזכורות |
| `/marketing/product/webp/desktop-messages-save-the-date.webp` | **חדש** — Save the Date + preview | `/rsvp/save-the-date` |
| `/marketing/product/webp/mobile-messages-sms.webp` | **חדש** — SMS בנייד | SMS |
| `/marketing/product/webp/mobile-messages-save-the-date.webp` | **חדש** — STD בנייד | Save the Date |

## סרטונים

| קובץ | תוכן | שימוש |
| --- | --- | --- |
| `/marketing/videos/demo-guest-rsvp.webm` | **חדש** — הקלטת מסך אורח | מקור |
| `/marketing/videos/demo-guest-rsvp-captions.webm` | **חדש** — אורח עם כתוביות עברית | `/rsvp`, chatuna, מדריך when-to-send-rsvp |
| `/marketing/videos/demo-seating-unified-captions.webm` | **חדש** — ריל הושבה מאוחד 24ש׳ + 6 כתוביות | `/seating-explained`, seating-plan |
| `/marketing/videos/demo-try-dashboard.webm` | הקלטת דשבורד דמו | RSVP, מדריכים |
| `/marketing/videos/demo-try-seating.webm` | הקלטת הושבה קצרה | גיבוי |
| `/marketing/videos/demo-try-seating-raw.webm` | הקלטה חדשה מהדמו | מקור לריל |
| `/marketing/videos/demo-wedding-eternal-gold.webm` | תבנית אתר חתונה | wedding-website |
| `/videos/rsvp1.mp4` … `/videos/eventsit.mp4` | קליפי מוצר ישנים | משולבים בריל / גלריות |

## דמו פעיל (noindex: `/try`)

| נתיב | מה רואים |
| --- | --- |
| `/try` → `/try/dashboard` | דשבורד |
| `/try/dashboard/seating` | מפת הושבה |
| `/try/dashboard/messages/new` | SMS / תזכורת / Save the Date |
| `/invite/demo-share?token=dmo_noa` | מסך אורח (אורח פיקטיבי פתוח) |
| `/info/demo` | עמוד שיווקי שמקשר לדמו |

## דוגמאות אתר חתונה חיות

| נתיב | תבנית |
| --- | --- |
| `/wedding-website/eternal-gold` | Eternal Gold |
| `/wedding-website/midnight-velvet` | Midnight Velvet |
| `/wedding-website/garden-bloom` | Garden Bloom |

## גלריית QA מלאה

`/opt/cursor/artifacts/screenshots/gallery/` — דסקטופ + מובייל (+ mid-scroll) לכל עמודי השיווק, 17 המדריכים, `/for/*`, דגלים.

## סטטוס פערים קודמים

| פריט | סטטוס |
| --- | --- |
| סרטון אורח חדש מהדמו | ✅ `demo-guest-rsvp-captions.webm` |
| ריל הושבה מאוחד עם כתוביות | ✅ `demo-seating-unified-captions.webm` |
| צילומי SMS / Save the Date מממשק אמיתי | ✅ desktop + mobile |
| Vercel Preview | ❌ טוקן CLI לא תקף; Cloudflare Preview פעיל |
