/**
 * Event types Invistimo supports in marketing copy.
 * Prefer routing multi-event queries to hubs (/rsvp, /invitations/chatuna, /seating-explained)
 * instead of spawning near-duplicate landing pages.
 */
export type EventTypeLink = {
  label: string;
  blurb: string;
};

export const EVENT_TYPES: EventTypeLink[] = [
  {
    label: "חתונה",
    blurb: "רשימות גדולות, סבבי וואטסאפ, הושבה ותזכורת עם מספר שולחן.",
  },
  {
    label: "בר/בת מצווה",
    blurb: "משפחות משני צדדים, הערות על הגעה, ומעקב אחרי מי עדיין לא ענה.",
  },
  {
    label: "ברית / בריתה",
    blurb: "רשימה קצרה יותר, שליחה מהירה, ואישור עם מספר מגיעים.",
  },
  {
    label: "חינה",
    blurb: "אורחים מקרובים ורחוקים, הזמנה דיגיטלית ואישור במקום אחד.",
  },
  {
    label: "יום הולדת ואירוע פרטי",
    blurb: "קישור אישי לכל אורח בלי לאסוף תשובות מצ'אטים מפוזרים.",
  },
  {
    label: "אירוע חברה / כנס",
    blurb: "רשימת מוזמנים מסודרת, סטטוסים בזמן אמת, ותזכורות לפני המועד.",
  },
];

export const EVENT_TYPE_SECTION = {
  heading: "מתאים לסוגי אירועים שונים",
  lede:
    "Invistimo נבנתה לניהול אורחים באירועים בישראל — לא רק לחתונה. אותו מודל של קישור אישי, רשימה אחת ותשובות במערכת עובד גם באירועים משפחתיים ועסקיים.",
};
