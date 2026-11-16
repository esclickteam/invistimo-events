# מיפוי קבצים

Commit שנבדק: `b8784ae2295d2139023fd428dda742920b155936` (ראש `main` בזמן הסריקה, 16.11.2026).

הסריקה סופרת קבצים. היא לא קוראת את תוכן כל קובץ. קובץ נחשב נקרא רק אם גוף פונקציה או diff שלו נקרא, והרשימה הזאת נמצאת בסוף.

## פקודה

```bash
python3 - << 'PY'
# walk of the repo, skipping .git, node_modules, .next
# prints TOTAL_FILES, SOURCE_FILES, top directories, extension counts
PY
```

הרצה מתוך שורש המאגר ב־16.11.2026.

## תוצאה

| מדד | מספר |
|---|---|
| קבצים שאינם ב־`.git`, `node_modules`, `.next` | 2380 |
| קובצי מקור (`.ts` `.tsx` `.js` `.jsx` `.mjs` `.cjs`) | 1924 |
| תיקיות עליונות | 17 |

סיומות עיקריות: `.ts` 1159, `.tsx` 619, `.jpg` 161, `.md` 78, `.mjs` 76, `.jsx` 58, `.js` 12.

תיקיות עליונות: `.github`, `app`, `audit`, `components`, `config`, `content`, `context`, `docs`, `lib`, `logic`, `mobile`, `models`, `public`, `scripts`, `store`, `types`, `workers`.

## קבצים שבהם מופיעים סמלי שרשרת השליחה

```bash
rg -l -g '!node_modules' -g '!.next' \
  'sendRsvpTemplateMedia|headerImageUrl|event_invitation|rsvp_invitation_media' \
  --glob '*.{ts,tsx,js,jsx,mjs}' | wc -l
```

תוצאה: 53 קבצים. החיפוש מאתר שמות. הוא לא נחשב קריאה של כל 53.

## מה נקרא בפועל

נקראו גופי הפונקציות במסלול השליחה, ב־`b8784ae2`:

- `app/dashboard/messages/MessagesClient.tsx` — קריאת `fetch` לשליחת אישור הגעה, שורה 785.
- `app/dashboard/messages/new/tabs/PreRsvpTab.tsx` — קריאת `fetch` להזמנה דיגיטלית, שורה 723.
- `app/dashboard/messages/new/shared/SendButton.tsx` — בחירת endpoint, שורה 147.
- `app/api/whatsapp/send-template/route.ts` — `POST` משורה 379, `buildPayloadTemplate` משורה 247, `insertMany` בשורה 852.
- `app/api/messages/pre-rsvp/whatsapp/route.ts` — `POST` משורה 647, `buildWhatsappTemplatePayload` משורה 429, `insertMany` בשורה 1281.
- `app/api/cron/whatsapp/route.ts` — `GET` משורה 308, `sendWhatsappTemplateFromQueue` משורה 72.
- `workers/sendScheduledSms.ts` — `sendScheduledWhatsapp` משורה 983, `sendWhatsappTemplate` משורה 368.
- `lib/whatsapp/sendRsvpTemplateMedia.ts` — `headerForRecipient` 330, `buildUrlButtonComponent` 347, `assembleTemplate` 408, `sendRsvpTemplateMedia` 363.
- `lib/whatsapp/prepareInvitationImage.ts` — `prepareWhatsappInvitationImageUrl` 216.
- `lib/whatsapp/provider/dialogProvider.ts` — `sendTemplate` 59.
- `lib/whatsapp/provider/index.ts` — `resolveWhatsAppProviderId` 15.
- `lib/cloudinary.ts` — `getHighQualityCloudinaryImageUrl` 40.
- `middleware.ts` — חיפוש המחרוזות `whatsapp`, `cloudinary`, `image`. אין בהן טיפול במדיה. השורה 149 קוראת כותרת HTTP, לא כותרת תמונה.

## מה לא נקרא

שאר 1924 קובצי המקור לא נקראו שורה־שורה. בהם יושבים אתר שיווקי, הושבה, אולמות, בלוג ומובייל. לא נמצאה בהם נקודת כניסה נוספת אל `sendRsvpTemplateMedia` מלבד הרשימה למעלה. זו לא טענה שכל שורה בהם נבדקה.
