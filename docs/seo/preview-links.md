# קישורי Preview ציבוריים — PR #382

**עודכן:** 2026-10-23 22:45 (Asia/Jerusalem)  
**אין Deploy / Merge בלי אישור.**

## Preview פעיל (Cloudflare Tunnel)

**https://refurbished-recommend-jail-super.trycloudflare.com**

נבדק עם HTTP 200 מהסביבה (User-Agent דפדפן). לא דורש התחברות.  
Tunnel ל־`localhost:3010` על הענף `cursor/premium-marketing-upgrade-3a61`.

> קישורי trycloudflare ישנים (כולל `brake-latino-edt-von…`) מחזירים 530/403 אחרי סיום ה־tunnel — השתמשו רק בקישור למעלה.

## Vercel Preview

| פריט | סטטוס |
| --- | --- |
| `VERCEL_TOKEN` ב־CLI | ❌ `User not found` — לא ניתן לפרוס Preview מ־CLI עם הטוקן הנוכחי |
| `vercel.json` → `git.deploymentEnabled: true` | עודכן ב־PR כדי לאפשר Preview לכל ענף אחרי שהפרויקט ב־Vercel מקבל את ההגדרה (פרודקשן נשאר מ־`main` בהגדרות הפרויקט) |
| Deploy לפרודקשן | **לא בוצע ולא יבוצע בלי אישור** |

אם יש לכם טוקן Vercel תקף / הרשאת פרויקט — אפשר ליצור Preview ידני בלי לגעת ב־Production.

## דגלים

| עמוד | קישור |
| --- | --- |
| בית | https://refurbished-recommend-jail-super.trycloudflare.com/ |
| אישורי הגעה | https://refurbished-recommend-jail-super.trycloudflare.com/rsvp |
| סידורי הושבה | https://refurbished-recommend-jail-super.trycloudflare.com/seating-explained |
| אתר חתונה | https://refurbished-recommend-jail-super.trycloudflare.com/wedding-website |
| SMS | https://refurbished-recommend-jail-super.trycloudflare.com/rsvp/sms |
| Save the Date | https://refurbished-recommend-jail-super.trycloudflare.com/rsvp/save-the-date |
| דמו | https://refurbished-recommend-jail-super.trycloudflare.com/try/dashboard |
| דמו הושבה | https://refurbished-recommend-jail-super.trycloudflare.com/try/dashboard/seating |
| דמו אורח | https://refurbished-recommend-jail-super.trycloudflare.com/invite/demo-share?token=dmo_noa |
| דמו הודעות | https://refurbished-recommend-jail-super.trycloudflare.com/try/dashboard/messages/new |

## גלריית צילומים (גיבוי אם Preview לא נפתח)

`/opt/cursor/artifacts/screenshots/gallery/` — דסקטופ + מובייל לכל עמודי השיווק והמדריכים.

PR: https://github.com/esclickteam/invistimo-events/pull/382
