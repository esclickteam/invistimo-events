export type DemoTourStep = {
  id: string;
  title: string;
  learn: string;
  body: string;
  route: string;
  selector: string;
  advance: "continue" | "action" | "click";
  action?: string;
};

export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    id: "dashboard",
    title: "הדשבורד של האירוע",
    learn: "איך נראית תמונת המצב של האירוע",
    body: "כאן רואים את שם האירוע, כמה מגיעים, מי עדיין לא ענה ומה קרה לאחרונה. המספרים מתעדכנים לפי הפעולות שתבצעו בדמו.",
    route: "/try/dashboard",
    selector: "#rsvp-stats",
    advance: "continue",
  },
  {
    id: "add-guest",
    title: "הוספת אורח",
    learn: "איך מוסיפים רשומה חדשה",
    body: "לחצו על הוספת מוזמן, מלאו שם ומספר, ושמרו. הרשומה תיכנס לרשימה ולספירה למעלה.",
    route: "/try/dashboard",
    selector: "[data-tour='add-guest']",
    advance: "action",
    action: "add-guest",
  },
  {
    id: "guest-link",
    title: "קישור אישי להזמנה",
    learn: "איך כל אורח מקבל הזמנה משלו",
    body: "לחצו על סימן הקישור בשורת האורח. זה הקישור האישי שלו. אפשר לאשר הגעה מתוכו, והתשובה חוזרת לדשבורד.",
    route: "/try/dashboard",
    selector: "[data-tour='guest-link']",
    advance: "click",
  },
  {
    id: "messages",
    title: "סבב WhatsApp או SMS",
    learn: "איך שולחים אישורי הגעה",
    body: "בחרו שליחה מיידית, ואז לחצו על כפתור השליחה. זו הדמיה: אף הודעה לא יוצאת, והסבב נרשם בדמו.",
    route: "/try/dashboard/messages/new",
    selector: "[data-tour='message-send']",
    advance: "action",
    action: "simulate-send",
  },
  {
    id: "ivr",
    title: "שיחת IVR",
    learn: "איך הקשה של אורח מעדכנת סטטוס",
    body: "בחרו אורח והקישו 1 למגיע, 2 ללא מגיע או 3 למתלבט. אין חיוג אמיתי. הסטטוס ברשימת האורחים מתעדכן מיד.",
    route: "/try/dashboard/recorded-calls",
    selector: "[data-tour='ivr-keypad']",
    advance: "action",
    action: "ivr",
  },
  {
    id: "calls",
    title: "תיעוד שיחות",
    learn: "איפה רואים תשובות מסבבי שיחה",
    body: "לחצו על אייקון הטלפון בשורת האורח. כאן בעל האירוע רואה את תיעוד השיחות והתשובות, בלי מסך עובדים.",
    route: "/try/dashboard",
    selector: "[data-tour='call-task']",
    advance: "click",
  },
  {
    id: "seating",
    title: "מפת הושבה",
    learn: "איך משבצים ומעבירים שולחן",
    body: "לחצו הושב ליד אורח ובחרו שולחן. התפוסה במפה מתעדכנת, ואפשר גם להעביר אורח שכבר יושב.",
    route: "/try/dashboard/seating",
    selector: "[data-tour='seating-guest']",
    advance: "action",
    action: "seat-guest",
  },
  {
    id: "check-in",
    title: "כניסה ביום האירוע",
    learn: "איך מסמנים הגעה בפועל",
    body: "חפשו אורח לפי שם וסמנו כמה הגיעו. הרישום נשמר רק בדמו ומופיע במספר מגיעים בפועל.",
    route: "/try/dashboard/check-in",
    selector: "[data-tour='checkin-search']",
    advance: "action",
    action: "check-in",
  },
  {
    id: "reports",
    title: "סטטיסטיקות ודוחות",
    learn: "איך רואים מה השתנה",
    body: "הכרטיסים האלה הם הדוח החי: מגיעים, לא מגיעים, ממתינים ופעילות אחרונה. הם כבר כוללים את מה שעשיתם בסיור.",
    route: "/try/dashboard",
    selector: "#rsvp-stats",
    advance: "continue",
  },
  {
    id: "more",
    title: "מה עוד יש לבעל האירוע",
    learn: "אילו אזורים זמינים בתפריט",
    body: "בתפריט: הזמנה, מוזמנים, הודעות, הושבה, שיחות מוקלטות וכניסה לאירוע. אתר חתונה, הסעות ואתגרים נפתחים רק אם הם כלולים בחבילה.",
    route: "/try/dashboard",
    selector: "[data-tour='customer-nav']",
    advance: "continue",
  },
];

export function tourStepCount() {
  return DEMO_TOUR_STEPS.length;
}
