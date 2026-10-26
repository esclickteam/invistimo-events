# ALBUM — ארכיטקטורה ומודל נתונים

## עקרון מוצר

מנוע טכנולוגי **אחד** לאלבומים דיגיטליים:

1. **SaaS עצמאי** — אתר שיווקי, הרשמה, פורטל, חבילות, Admin.
2. **תוסף Invistimo** — יצירת/קישור אלבום דרך API שותפים, בלי שכפול מערכת.
3. **שותפים עתידיים** — אותו API / אותם שירותי ליבה.

הפרויקט חי בתיקייה מבודדת `digital-album/` ולא משנה את קוד Production של Invistimo/Bizuply.

## ארבעה אזורים

| אזור | נתיב | תפקיד |
|------|------|--------|
| שיווקי | `/` | מכירת השירות, חבילות, הסבר Invistimo |
| פורטל לקוח | `/portal` | אירועים, הרשאות, תור אישור, העלאות |
| אלבום אורחים | `/a/[slug]` | גלריה, העלאה, ברכות, LIVE, AI (כשפעיל) |
| מנהל־על | `/admin` | לקוחות, חבילות, מכסות, לוגים |

## סטאק (פיתוח מבודד)

- **Next.js 15** (App Router) + TypeScript + Tailwind
- **Prisma + SQLite** מקומי (`prisma/dev.db`) — יעד פרודקשן: PostgreSQL (אותה סכמה)
- **אחסון קבצים מקומי** תחת `data/` עם קישורי חתימה HMAC — יעד פרודקשן: S3/Blob תואם
- **תור עבודות** בטבלת `BackgroundJob` (thumbnails, video, face index)
- **ffmpeg + sharp** לעיבוד מדיה מחוץ ל־request ככל האפשר (kick מיידי ב־dev)
- **Face AI**: ממשק ספק (`none` / `local_dev` / `rekognition`) — ברירת מחדל `none`

## Multi-tenant

- `Tenant` → `Event` → `Album` / `MediaAsset` / …
- כל שאילתת מדיה מסוננת לפי `eventId` + `tenantId`
- בדיקות הרשאה בשרת (`permissions.ts`) — לא רק UI
- מניעת IDOR: גישה לאירוע דורשת חברות ב־tenant או תפקיד SUPER_ADMIN

## הרשאות העלאה / צפייה / הורדה

שדות ב־`Event`:

- `uploadMode`: `GUESTS_ONLY` | `OWNERS_ONLY` | `EVERYONE`
- `mediaAllowed`: `PHOTOS_ONLY` | `VIDEOS_ONLY` | `BOTH`
- `allowDownload`, `allowZip`, `visibility`, `requireApproval`

שינוי מצב נאכף מיד ב־API `/api/upload/*` ו־`/api/public/album/*`.

## העלאות

1. `POST /api/upload/init` — בדיקת הרשאות, מכסה, כפילות checksum
2. `PUT /api/upload/chunk` — multipart/resumable לפי offset
3. `POST /api/upload/complete` — אימות גודל/checksum, תור עיבוד
4. קבצים **לא** נשמרים ב־DB — רק מפתחות אחסון

## זיהוי פנים

- Collection **פר־אירוע** בלבד (אין חיפוש גלובלי בין אירועים)
- הסכמה מפורשת לפני סלפי
- מחיקת סלפי / `FaceSearch` לפי מדיניות
- **לא מוצג כפעיל** עד `FACE_AI_ENABLED_GLOBALLY=true` + ספק מוגדר ומאושר
- Rekognition: Group1 ≈ **$0.001**/תמונה (Index/Search) + אחסון וקטורים ≈ **$0.00001**/פנים/חודש

## Invistimo

- `POST /api/integrations/invistimo/albums` (כבוי עד `INVISTIMO_INTEGRATION_ENABLED=true`)
- מעביר `hostNames`, `eventDate`, `invistimoEventId`
- מחזיר `independentLifecycle: true` — **מחיקת אירוע ב־Invistimo לא מוחקת אלבום**
- זכאות נפרדת: `Entitlement.source = INVISTIMO | SELF_SERVE | ADMIN_GRANT | PROFESSIONAL`

## מחזור חיים ושמירה

- `Event.retentionUntil` / `Entitlement.retentionUntil` עצמאיים
- מחיקת מדיה: soft-delete + מחיקת קבצים נגזרים + FaceIndex
- אין קישור אוטומטי למנגנון מחיקת אירועי Invistimo

## אומדן עלויות (סדר גודל, USD/חודש)

הנחות ממוצעות לאירוע פעיל: **800 תמונות (≈3MB orig + 0.4MB preview)**, **40 סרטונים (≈80MB orig + 25MB preview)**, **120 חיפושי פנים** (Premium+), egress הורדות ≈ **1.2× אחסון/חודש**.

| רכיב | 10 אירועים | 100 | 1,000 |
|------|------------|-----|-------|
| אחסון אובייקטים (≈0.5–0.8TB / 100) | $15–25 | $150–250 | $1.5k–2.5k |
| תעבורה/הורדות | $10–30 | $100–300 | $1k–3k |
| עיבוד וידאו (compute/ffmpeg workers) | $20–40 | $150–400 | $1.5k–4k |
| Rekognition Index+Search | $0 (כבוי) / ~$10 | ~$100 | ~$1k |
| DB + App hosting | $30–80 | $150–400 | $800–2k |
| **סה״כ גס (בלי מרווח)** | **~$80–180** | **~$650–1.5k** | **~$6k–14k** |

*אין יצירת משאבים בתשלום ללא אישור מפורש.*

## מפת מסכים (עיקריים)

- שיווק: `/`
- Auth: `/login`, `/register`
- פורטל: `/portal`, `/portal/events/new`, `/portal/events/[id]`, upload
- אורח: `/a/[slug]` (מובייל CTAs + masonry + stories)
- LIVE: `/live/[slug]`
- Admin: `/admin`
- Docs: `/docs`

## סביבות

| | Dev (כאן) | Staging עתידי | Production |
|--|-----------|---------------|------------|
| DB | SQLite מקומי | Postgres ייעודי | Postgres |
| Storage | `./data` | Bucket נפרד | Bucket פרוד |
| AI | `none` | בדיקות מאושרות | מאושר בלבד |
| Payments | `none` | sandbox | חי אחרי אישור |
| Invistimo | כבוי / stub | בדיקות מבודדות | אחרי אישור |

## מה דורש אישור לפני ביצוע

- הפעלת AWS Rekognition / מפתחות
- ספקי סליקה ו־DNS / Deploy פרודקשן
- שינוי קוד Invistimo Production
- חיבור אמיתי ל־SSO של Invistimo
