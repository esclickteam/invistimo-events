/**
 * Event types Invistimo supports in marketing copy.
 * Dedicated landings live under `/for/*` when intent + unique content justify a page.
 * Wedding stays on existing hubs (`/rsvp/chatuna`, `/wedding-website`, …).
 */
export type EventTypeLink = {
  label: string;
  blurb: string;
  href?: string;
};

export const EVENT_TYPES: EventTypeLink[] = [
  {
    label: "חתונה",
    href: "/rsvp/chatuna",
    blurb:
      "רשימה גדולה משני צדדים, Save the Date והזמנה מוקדם, ואז סבבי אישור כשהתאריך מתקרב — עם הושבה ותזכורת מספר שולחן אם נרכשו.",
  },
  {
    label: "בר מצווה",
    href: "/for/bar-mitzvah",
    blurb:
      "משפחה וחברים ברשימה אחת. חשוב לראות מי ענה לפני שסוגרים מנות, בלי לרדוף אחרי כולם בטלפון.",
  },
  {
    label: "בת מצווה",
    href: "/for/bat-mitzvah",
    blurb:
      "משפחה, חברות והורים — תשובות במקום אחד לפני סגירה מול האולם.",
  },
  {
    label: "ברית / בריתה",
    href: "/for/brit",
    blurb:
      "רשימה קצרה יותר וזמן קצר יותר. קישור אישי ושני סבבי וואטסאפ מספיקים לרוב בלי לבנות תהליך «חתונה מלא».",
  },
  {
    label: "חינה",
    href: "/for/henna",
    blurb:
      "אורחים מקרובים ורחוקים, לפעמים עם הושבה. אותה רשימה מזינה גם אישור וגם שיבוץ שולחנות כשיש תוספת.",
  },
  {
    label: "יום הולדת / עגול",
    href: "/for/birthday",
    blurb:
      "במקום לאסוף «כן/לא» מצ'אטים מפוזרים — קישור אישי לכל אורח ותשובות במערכת אחת. כולל ימי הולדת עגולים.",
  },
  {
    label: "מסיבה / אירוע פרטי",
    href: "/for/private-party",
    blurb:
      "אירוע פרטי בלי מסע חתונה מלא: הזמנה, אישורים ותזכורת לפי החבילה.",
  },
  {
    label: "אירוע חברה / כנס",
    href: "/for/corporate",
    blurb:
      "רשימת מוזמנים מסודרת, סטטוסים בזמן אמת, ותזכורות לפני המועד. ניהול אירוע כתוספת כשצריך משימות ותקציב.",
  },
];

export const EVENT_TYPE_SECTION = {
  heading: "אותה מערכת — תרחישים שונים",
  lede:
    "לא כל אירוע צריך את כל השלבים. חתונה עשויה לעבור Save the Date → הזמנה → אתר → אישורים → הושבה. ברית לעיתים מסתפקת בהזמנה ושני סבבי אישור. מה שמשותף: קישור אישי ורשימה אחת — לפי החבילה שרכשתם.",
};
