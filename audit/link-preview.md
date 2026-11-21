# תצוגת קישור אישי מול כותרת התמונה

Commit: `b8784ae2295d2139023fd428dda742920b155936`.

## פקודות

```bash
curl -A 'WhatsApp/2.23.20.0' -sS https://www.invistimo.com/invite/audit-check
curl -A 'WhatsApp/2.23.20.0' -sS https://www.invistimo.com/w/audit-check
rg -n 'og:image|openGraph' app/invite app/w app/layout.tsx lib/seo/site.ts
rg -n 'tap_target|buildUrlButtonComponent' lib/whatsapp/sendRsvpTemplateMedia.ts
```

`audit-check` אינו מזהה הזמנה אמיתי. הוא בודק את ה־HTML הראשון שסורק מקבל, לפני JavaScript.

## מה חוזר מהעמוד

שתי הכתובות החזירו `200` בלי redirect של השרת.

יש `og:title`, `og:description`, `og:site_name`, `og:locale`, `og:type`.

אין `og:image`. אין `og:url`. `twitter:card` הוא `summary`, בלי תמונה.

הכותרת והתיאור הם של אתר Invistimo, לא של הזמנה. הם מגיעים מ־`app/layout.tsx` שורות 29–43. `openGraph` שם לא מגדיר `images`. `app/invite/layout.tsx` ו־`app/w/layout.tsx` מוסיפים רק `NOINDEX` מ־`lib/seo/site.ts` שורה 77. אין שם תמונת הזמנה.

מעבר מ־`/invite/` אל `/w/` קורה בדפדפן, אחרי טעינת הנתונים, ב־`app/invite/[shareId]/page.tsx` שורות 166–178. הסורק שקורא את ה־HTML הראשון לא מקבל את המעבר הזה, וגם `/w/` אין בו `og:image`.

## Payload

ב־`assembleTemplate`:

- כותרת התמונה היא כתובת Cloudinary בלבד, דרך `headerForRecipient`.
- גוף אישור ההגעה הוא שם, תאריך ומיקום. אין בו את כתובת האורח.
- הקישור האישי נשלח רק כסיומת של כפתור URL: `shareId?token=`. הבסיס קבוע בתבנית: `https://www.invistimo.com/invite/{{1}}`.
- להזמנה הדיגיטלית אין רכיב כפתור.
- אין רכיב שני של תמונה ואין רכיב link preview. חיפוש `tap_target` במאגר לא מצא התאמה.

כתובת התמונה וכתובת הקישור הן hosts שונים: `res.cloudinary.com` מול `www.invistimo.com`.

## מסקנה על Open Graph

התמונה הקטנה בהודעה אינה תמונת Open Graph של הקישור האישי. לעמוד אין `og:image`, ולכן אין תמונת הזמנה ש־WhatsApp יכול לקחת משם.

התיאור של הלחיצה, תמונה קטנה מול שטח לבן באותה מסגרת, גם אינו כרטיס תצוגה מקדימה נפרד מתחת לטקסט. זה אזור אחד. הממצא שולל את הקישור האישי כמקור של תמונה שנייה. הוא לא מוכיח מה מצייר את המסגרת.

## מה עדיין חסר

לא נקראו רכיבי התבנית החיים. לא בוצע ניסוי שמבודד את כפתור ה־URL מאותו קובץ תמונה. בלי שני אלה אי אפשר לקבוע אם המסגרת נוצרת בגלל הכפתור, בגלל הגדרה השמורה בתבנית, או בגלל ציור של WhatsApp.
