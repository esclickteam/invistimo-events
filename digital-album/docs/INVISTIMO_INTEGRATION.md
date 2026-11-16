# נקודות אינטגרציה עם Invistimo

**סטטוס:** מתוכנן + stub API בפיתוח. לא מחובר ל־Production. לא משנה את קוד Invistimo.

## חוזה ליבה

1. מנוע האלבומים הוא שירות נפרד עם DB ואחסון משלו.
2. Invistimo קורא ל־API שותפים ליצירת/קישור אלבום.
3. `Event.retentionUntil` עצמאי — מחיקת אירוע ב־Invistimo **לא** מוחקת אלבום.
4. מקור הזכאות נשמר ב־`Entitlement.source` למניעת חיוב כפול.

## Endpoint (פיתוח)

```
POST /api/integrations/invistimo/albums
Headers:
  x-partner-client-id: invistimo-dev
  x-partner-client-secret: invistimo-dev-secret
Body:
  {
    "invistimoEventId": "...",
    "invistimoTenantId": "...",
    "hostNames": "מיה ואלון",
    "eventDate": "2026-10-24T18:00:00.000Z",
    "planCode": "premium",
    "externalOrderRef": "optional-order-id"
  }
```

דורש `INVISTIMO_INTEGRATION_ENABLED=true`.

## מיפוי UI ב־Invistimo (עתידי, אחרי אישור)

- שירות "אלבום דיגיטלי" בחבילות ובדשבורד האירוע
- קישור בהזמנה / הודעות אחרי אירוע / QR
- SSO מאובטח (לא מיושם עדיין)
- שימוש ברשימת אורחים רק כשנחוץ ומורשה — בלי שכפול מיותר

## סדר מימוש מומלץ

1. השלמת מוצר עצמאי + בדיקות קבלה (כאן)
2. Staging משותף עם מפתחות שותף
3. Feature flag ב־Invistimo שמצביע ל־staging של ALBUM
4. אישור מפורש לפני Production
