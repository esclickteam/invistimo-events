export const BOT_FLOW = {
  start: {
    message: "היי 👋 איך נוכל לעזור לך?",
    options: [
      { label: "שאלות כלליות על Invistimo", next: "general" },
      { label: "עזרה בבחירת חבילה", next: "package_type" },
      { label: "ניהול אירוע והזמנות", next: "event" },
      { label: "אישורי הגעה וניהול אורחים", next: "rsvp" },
      { label: "הודעות SMS / WhatsApp", next: "messages" },
      { label: "תשלומים וחיובים", next: "payments" },
      { label: "תקלה או בעיה", next: "issue" },
      { label: "יצירת קשר עם תמיכה", next: "contact" },
    ],
  },

  general: {
    message:
      "Invistimo היא פלטפורמת SaaS מקצועית לניהול והפקת אירועים, הכוללת הזמנות דיגיטליות, אישורי הגעה, ניהול אורחים, סידורי הושבה ושליחת הודעות – הכל במקום אחד.",
    back: true,
  },

  package_type: {
    message: "איזה סוג אירוע מתכננים?",
    options: [
      { label: "חתונה", next: "package_size" },
      { label: "בר / בת מצווה", next: "package_size" },
      { label: "אירוע פרטי / עסקי", next: "package_size" },
    ],
  },

  package_size: {
    message: "כמה מוזמנים צפויים בערך?",
    options: [
      {
        label: "עד 100 מוזמנים",
        next: "package_result_small",
      },
      {
        label: "100–300 מוזמנים",
        next: "package_result_medium",
      },
      {
        label: "300+ מוזמנים",
        next: "package_result_large",
      },
    ],
  },

  package_result_small: {
    message:
      "לפי הנתונים שסיפקת, חבילת הבסיס מתאימה לאירוע שלך וכוללת הזמנות דיגיטליות, RSVP וניהול אורחים מלא.",
    back: true,
  },

  package_result_medium: {
    message:
      "מומלץ לבחור בחבילת ביניים הכוללת גם שליחת הודעות, תזכורות מתקדמות וכלי ניהול מורחבים.",
    back: true,
  },

  package_result_large: {
    message:
      "לאירועים גדולים מומלץ לבחור בחבילה מתקדמת הכוללת אוטומציות, ניהול מתקדם והודעות בכמות גבוהה.",
    back: true,
  },

  event: {
    message:
      "ניתן ליצור אירוע חדש דרך הדשבורד, להזין פרטי אירוע, לעצב הזמנה דיגיטלית ולשלוח אותה לאורחים בקלות.",
    back: true,
  },

  rsvp: {
    message:
      "האורחים מאשרים הגעה דרך ההזמנה הדיגיטלית, והמערכת מתעדכנת בזמן אמת עם סטטוסי הגעה ונוכחות.",
    back: true,
  },

  messages: {
    message:
      "המערכת מאפשרת שליחת הודעות SMS ו-WhatsApp, כולל תזכורות אוטומטיות והודעות מותאמות אישית.",
    back: true,
  },

  payments: {
    message:
      "התשלום באתר הינו חד-פעמי לפי חבילה. אין מנוי מתחדש, וכל החיובים מתבצעים בצורה מאובטחת.",
    back: true,
  },

  issue: {
    message:
      "אם נתקלת בתקלה, ניתן לפנות אלינו דרך טופס יצירת קשר או בדוא״ל support@invistimo.com ונשמח לעזור.",
    back: true,
  },

  contact: {
    message:
      "ניתן ליצור קשר דרך עמוד יצירת קשר באתר או ישירות בדוא״ל: support@invistimo.com",
    back: true,
  },
};
