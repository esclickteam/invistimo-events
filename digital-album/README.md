# ALBUM — Digital Event Albums SaaS

מוצר SaaS עצמאי לאלבומים דיגיטליים לאירועים, עם מנוע משותף עתידי ל־Invistimo.

> תיקייה מבודדת בתוך הריפו. **לא משנה** את אפליקציית Invistimo הקיימת.

## התחלה מהירה

```bash
cd digital-album
cp .env.example .env   # אם צריך
npm install
npx prisma migrate dev
npm run db:seed
npm run dev            # http://localhost:3010
```

### חשבונות demo

- בעלים: `owner@album.local` / `OwnerDemo!23`
- מנהל־על: `admin@album.local` / `AlbumAdmin!23`
- אלבום: http://localhost:3010/a/mia-alon-wedding

## בדיקות קבלה

```bash
npm run dev &
npm run test:acceptance
```

## תיעוד

- [ארכיטקטורה ועלויות](./docs/ARCHITECTURE.md)
- [בדיקות קבלה](./docs/ACCEPTANCE.md)
- [אינטגרציית Invistimo](./docs/INVISTIMO_INTEGRATION.md)

## חשוב

- אין Deploy לפרודקשן / DNS / סליקה חיה / Rekognition ללא אישור.
- זיהוי פנים מוצג כלא־פעיל עד הגדרת ספק מאושרת.
- מחזור חיי האלבום נפרד ממחיקת אירועי Invistimo.
