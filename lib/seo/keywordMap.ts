/**
 * One primary URL per query. Search volume and competition are null until
 * Search Console or Keyword Planner is connected. SERP notes are a web-search
 * snapshot, not a Google rank report.
 */
export const KEYWORD_OBSERVED_AT = "2026-10-23";

export const KEYWORD_VOLUME_NOTE =
  "נפח חיפוש ורמת תחרות לא נמדדו. אין בחשבון הזה חיבור ל-Google Search Console או ל-Keyword Planner.";

export type SearchIntent = "commercial" | "informational" | "navigational";

export type KeywordRow = {
  query: string;
  intent: SearchIntent;
  primaryPath: string;
  supportingPaths: string[];
  volume: null;
  competition: null;
  observation: string;
};

export const KEYWORD_MAP: KeywordRow[] = [
  {
    query: "אישורי הגעה לחתונה",
    intent: "commercial",
    primaryPath: "/rsvp/chatuna",
    supportingPaths: ["/rsvp", "/pricing"],
    volume: null,
    competition: null,
    observation:
      "ב־23 באוקטובר 2026 חיפוש ברשת החזיר עמודים של Wedly, Guini ו־Flashback. זהו צילום של כלי החיפוש, לא מיקום בגוגל.",
  },
  {
    query: "אישורי הגעה לאירועים",
    intent: "commercial",
    primaryPath: "/rsvp",
    supportingPaths: ["/rsvp/chatuna", "/faq"],
    volume: null,
    competition: null,
    observation: "העמוד המרכזי לכל סוגי האירוע. עמוד החתונה נשאר לביטוי החתונה.",
  },
  {
    query: "אישורי הגעה בוואטסאפ",
    intent: "commercial",
    primaryPath: "/rsvp/whatsapp",
    supportingPaths: ["/rsvp/chatuna", "/info/guides/guests-who-dont-reply"],
    volume: null,
    competition: null,
    observation: "גוויני ו־Wedly מציגים בעמודיהם אישור בוואטסאפ. לא נמדד נפח לביטוי.",
  },
  {
    query: "הזמנות דיגיטליות לחתונה",
    intent: "commercial",
    primaryPath: "/invitations/chatuna",
    supportingPaths: ["/info/guides/send-digital-invitation", "/wedding-website"],
    volume: null,
    competition: null,
    observation:
      "חיפוש רחב ב־23 באוקטובר 2026 הציג גם את savethedate.co.il, savedate.co.il, ConfirMe ו־Evently. בלי דירוג ממוספר.",
  },
  {
    query: "Save the Date לחתונה",
    intent: "informational",
    primaryPath: "/rsvp/save-the-date",
    supportingPaths: ["/info/guides/save-the-date-vs-invitation"],
    volume: null,
    competition: null,
    observation:
      "קיימים עסקים בשם Save The Date. העמוד של Invistimo מסביר את ההודעה במערכת, לא משווה מחירים מול העסקים האלה.",
  },
  {
    query: "סידורי הושבה לחתונה",
    intent: "commercial",
    primaryPath: "/seating-explained",
    supportingPaths: ["/info/guides/seating-plan"],
    volume: null,
    competition: null,
    observation: "מתחרים מציגים הושבה בעמודי החתונה שלהם. אין כאן נתון על מיקום Invistimo.",
  },
  {
    query: "מערכת ניהול אירועים",
    intent: "commercial",
    primaryPath: "/event-management",
    supportingPaths: ["/rsvp", "/seating-explained"],
    volume: null,
    competition: null,
    observation: "עמוד המוצר הקיים הוא היעד. לא נוסף מדריך נפרד שמחזור את אותו מסך.",
  },
  {
    query: "כמה עולים אישורי הגעה לחתונה",
    intent: "informational",
    primaryPath: "/info/guides/cost-rsvp-wedding",
    supportingPaths: ["/pricing"],
    volume: null,
    competition: null,
    observation:
      "ל־Wedly יש עמוד השוואת מחירים משלהם, מעודכן אצלם לאוגוסט 2026. המספרים שם הם של Wedly, לא נתון של Invistimo.",
  },
  {
    query: "מתי לשלוח אישורי הגעה",
    intent: "informational",
    primaryPath: "/info/guides/when-to-send-rsvp",
    supportingPaths: ["/rsvp/chatuna"],
    volume: null,
    competition: null,
    observation: "כוונת מידע. עמוד החתונה נשאר למי שרוצה את השירות.",
  },
  {
    query: "אורחים שלא מאשרים הגעה",
    intent: "informational",
    primaryPath: "/info/guides/guests-who-dont-reply",
    supportingPaths: ["/rsvp/whatsapp", "/pricing"],
    volume: null,
    competition: null,
    observation: "המדריך מפריד בין סבב וואטסאפ שני לבין חבילות שיחה.",
  },
  {
    query: "חבילות אישורי הגעה",
    intent: "commercial",
    primaryPath: "/pricing",
    supportingPaths: ["/info/guides/cost-rsvp-wedding"],
    volume: null,
    competition: null,
    observation: "המחשבון הוא המקור למחיר. המדריך מסביר את שיטת החישוב בלי סכום סופי.",
  },
  {
    query: "Invistimo",
    intent: "navigational",
    primaryPath: "/",
    supportingPaths: ["/info/about", "/contact"],
    volume: null,
    competition: null,
    observation: "חיפוש מותג. לא נמצאו פרופילים רשמיים מאומתים ברשתות, ולכן אין sameAs בסכמה.",
  },
];

export const AI_MONITOR_QUESTIONS = [
  "מה זה Invistimo?",
  "איך שולחים אישורי הגעה לחתונה בוואטסאפ?",
  "מה כוללת חבילת ההודעות של Invistimo?",
  "האם Save the Date ב־Invistimo אוסף אישורי הגעה?",
  "איך מחשבים מחיר לאישורי הגעה ב־Invistimo?",
  "איך עובדים סידורי הושבה ב־Invistimo?",
];
