# שרשרת הקריאות

Commit: `b8784ae2295d2139023fd428dda742920b155936`.

שני המסלולים נשמרים בתור ואינם קוראים ל־360dialog מתוך בקשת הדפדפן. השליחה יוצאת מ־cron.

## הזמנה דיגיטלית

1. `PreRsvpTab.tsx:723` — `POST /api/messages/pre-rsvp/whatsapp`.
2. `route.ts:647` `POST`.
3. `getPreRsvpSpecificImageUrl` בשורה 295 בוחר `preRsvpMedia.invitationOnlyImageUrl`.
4. `getHighQualityCloudinaryImageUrl` המקומי בשורה 89 מסיר מקטע טרנספורמציה מהכתובת.
5. `buildWhatsappTemplatePayload` בשורה 429. שם התבנית נקבע ב־`getTemplateNameByType` בשורה 160: `event_invitation`.
6. הרכיבים שנשמרים, שורות 478–494: כותרת `image.link` וגוף. אין כפתור.
7. שליחה מיידית: `WhatsappQueue.insertMany` בשורה 1281.
8. תזמון: `ScheduledMessage.create` בשורה 1165. התור נוצר אחר כך ב־worker.

## אישור הגעה

1. `MessagesClient.tsx:785` או `SendButton.tsx:147` — `POST /api/whatsapp/send-template`.
2. `route.ts:379` `POST`.
3. `buildPayloadTemplate` בשורה 247. התמונה היא `headerImageUrl`, ואם חסר אז `previewImageUrl`, `imageUrl`, `canvasImageUrl`.
4. `lib/cloudinary.ts:40` מסיר טרנספורמציה.
5. לתבנית `rsvp_invitation_media` נשמרים כותרת, גוף, וכפתור URL. הכפתור מתחיל בשורה 308.
6. שליחה מיידית: `WhatsappQueue.insertMany` בשורה 852.
7. תזמון: `ScheduledMessage.create` בשורה 683.

## המסלול המשותף אל 360dialog

1. `app/api/cron/whatsapp/route.ts:340` קורא ל־`sendScheduledWhatsapp`.
2. `workers/sendScheduledSms.ts:983` בונה קהל מחדש ויוצר `WhatsappQueue` בשורה 1354.
3. `sendWhatsappTemplate` בשורה 368 קורא ל־`sendRsvpTemplateMedia` בשורה 398.
4. אחר כך `processPendingWhatsappQueue` בשורה 128 שולח פריטים במצב `pending`.
5. `sendWhatsappTemplateFromQueue` בשורה 72 קורא ל־`sendRsvpTemplateMedia` בשורה 102.
6. `sendRsvpTemplateMedia` בשורה 363 קורא ל־`assembleTemplate` בשורה 408.
7. `headerForRecipient` בשורה 330 קורא ל־`prepareWhatsappInvitationImageUrl` או ל־`verifiedHeaderMediaId`.
8. ל־`rsvp_invitation_media` נוסף `buildUrlButtonComponent` בשורה 449.
9. ל־`event_invitation` אין קריאה ל־`buildUrlButtonComponent`. הרכיבים נגמרים בגוף, שורות 508–522.
10. `getWhatsAppProvider` ב־`lib/whatsapp/provider/index.ts:22`. ברירת המחדל היא `dialog` אלא אם `WHATSAPP_PROVIDER` הוא `bizuply`.
11. `dialogProvider.ts:59` שולח `POST https://waba-v2.360dialog.io/messages`.
12. מזהה ההודעה נשמר ב־`recordWhatsappSendSuccess` ב־`lib/whatsapp/roundDeliveryTracking.ts:639`.
13. webhook: `app/api/webhooks/whatsapp/route.ts:454` מעדכן סטטוס ב־`updateWhatsappQueueStatus` בשורה 516.

## מה לא הוכח בשרשרת הזאת

השרשרת מראה הבדל אחד בהרכבה: כפתור URL קיים רק באישור ההגעה. היא לא מראה איך WhatsApp מצייר את התמונה, ולא מוכיחה שהכפתור הוא סיבת המסגרת.
