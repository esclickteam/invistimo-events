/** Marketing copy for /rsvp/calls — aligned with verified product capabilities. */

export const CALLS_PATH = "/rsvp/calls";

export const CALLS_META = {
  title: "אישורי הגעה בשיחות טלפון | שיחות AI ומוקד אנושי — Invistimo",
  description:
    "אישורי הגעה בשיחות מוקלטות עם קריינות AI ובמוקד אנושי. מעקב אחרי מי שלא ענה, שיחות חוזרות ושילוב עם WhatsApp. הכירו את Invistimo.",
} as const;

export const LINKS = {
  pricing: "/pricing",
  contact: "/contact",
  rsvp: "/rsvp",
  whatsapp: "/rsvp/whatsapp",
  chatuna: "/rsvp/chatuna",
  seating: "/seating-explained",
  guides: "/info/guides",
  whenToSend: "/info/guides/when-to-send-rsvp",
  noReply: "/info/guides/guests-who-dont-reply",
  whatsappVsSms: "/info/guides/whatsapp-vs-sms-rsvp",
  venue: "/info/guides/wedding-venue-guest-guarantee",
  guestList: "/info/guides/guest-list",
  cost: "/info/guides/cost-rsvp-wedding",
} as const;

/** Demo event name used across RSVP marketing pages. */
export const DEMO_EVENT_NAME = "החתונה של מיה ואלון";

/**
 * Outbound IVR script from lib/calls/ivrScript.ts (IVR_GLOBAL_PACK_TEXTS),
 * composed for the demo event — same three clips guests hear concatenated.
 * Keys: 1=yes(+count), 2=no, 3=maybe.
 */
export const DEMO_SCRIPT_LINES = [
  `שלום, אנחנו מתקשרים בנוגע לאירוע ${DEMO_EVENT_NAME}.`,
  "נשמח לדעת האם תוכלו להגיע ולחגוג איתנו.",
  "לאישור הגעה, הקישו 1.",
  "לאי הגעה, הקישו 2.",
  "אם עדיין אינכם יודעים, הקישו 3.",
] as const;

/** Static Dana demo — generated via scripts/generate-rsvp-calls-demo-audio.mjs */
export const DEMO_AUDIO_SRC = "/audio/rsvp-calls-dana-demo.mp3";
export const DEMO_AUDIO_VOICE = "Dana";
export const DEMO_AUDIO_VOICE_NOTE =
  "קריינות דנה — אותו קול נשי נעול בשיחות IVR של Invistimo (ElevenLabs).";

export const DEMO_KEYPAD = [
  { digit: "1", label: "אישור הגעה", result: "אישר הגעה", next: "לאחר מכן מקישים את מספר האורחים שיגיעו, כולל אתכם." },
  { digit: "2", label: "לא מגיע", result: "לא מגיע", next: "התשובה מתעדכנת ברשימת המוזמנים." },
  { digit: "3", label: "עדיין לא יודעים", result: "מתלבט", next: "הרשומה נשארת במעקב להמשך טיפול." },
] as const;

/** Status chips for hero — labels that exist in IVR report / RSVP results. */
export const HERO_STATUSES = [
  { label: "לא ענה", tone: "wait" as const },
  { label: "נענתה", tone: "live" as const },
  { label: "אישר הגעה", tone: "yes" as const },
  { label: "לא מגיע", tone: "no" as const },
  { label: "מתלבט", tone: "maybe" as const },
] as const;

export const WHY_CARDS = [
  {
    title: "לא כולם עונים להודעות",
    text: "הודעה שנשלחה אינה בהכרח הודעה שנקראה, והודעה שנקראה אינה בהכרח אישור הגעה.",
  },
  {
    title: "יש אורחים שמעדיפים טלפון",
    text: "במיוחד כאשר האורח אינו רגיל להשתמש בקישורים דיגיטליים, שיחה עשויה להיות נוחה יותר.",
  },
  {
    title: "אפשר לברר תשובות לא סופיות",
    text: "שיחה אנושית יכולה לעזור להבין אם אורח מתלבט, צריך לבדוק משהו או מעוניין לעדכן את מספר המשתתפים.",
  },
  {
    title: "תמונה מסודרת יותר לפני האירוע",
    text: "ככל שיש יותר תשובות מעודכנות, קל יותר לתכנן את ההושבה ואת ההיערכות מול האולם.",
  },
] as const;

export const AI_STEPS = [
  {
    title: "מכינים את רשימת המוזמנים",
    text: "המערכת מזהה את הרשומות המיועדות לסבב השיחות בהתאם להגדרות האירוע והחבילה.",
  },
  {
    title: "מתבצעת שיחה מוקלטת",
    text: "האורח שומע הודעה קולית עם פרטי האירוע והנחיות למענה.",
  },
  {
    title: "האורח משיב",
    text: "האורח בוחר באפשרות המתאימה באמצעות מקשי הטלפון — 1 לאישור, 2 לאי־הגעה, 3 אם עדיין לא יודעים.",
  },
  {
    title: "התשובה מתעדכנת",
    text: "תשובה תקינה מתעדכנת ברשימת המוזמנים. באישור הגעה נאסף גם מספר האורחים שיגיעו.",
  },
  {
    title: "מי שלא ענה נשאר למעקב",
    text: "אם השיחה לא נענתה או לא התקבלה תשובה תקינה, הרשומה נשארת לטיפול נוסף בהתאם לכללי הסבבים והחבילה.",
  },
] as const;

export const AI_BENEFITS = [
  "פנייה קולית למספר מוזמנים",
  "מסר אחיד לפי תסריט מוגדר",
  "קריינות AI עם שם האירוע",
  "מענה דרך מקשי הטלפון",
  "מעקב אחרי תוצאות השיחה",
  "חיסכון בעבודת חיוג ידנית",
  "אפשרות לסבבים נוספים למי שלא ענה",
] as const;

/** Dial outcome distinctions that exist in IVR report statuses. */
export const DIAL_OUTCOMES = [
  { code: "no_answer", label: "לא ענה" },
  { code: "busy", label: "תפוס" },
  { code: "failed", label: "נכשל (כשל טכני)" },
  { code: "answered_no_digit", label: "נענה – ללא הקשה" },
  { code: "yes", label: "תשובה תקינה שנקלטה" },
] as const;

export const HUMAN_CASES = [
  {
    title: "אורחים שלא הגיבו לכמה פניות",
    text: "נציג יכול לפנות בצורה אישית ולברר אם התקבלה החלטה.",
  },
  {
    title: "משפחות עם מספר משתתפים משתנה",
    text: "אפשר לברר כמה בני משפחה צפויים להגיע.",
  },
  {
    title: "אורחים שזקוקים להסבר",
    text: "אפשר להסביר את פרטי האירוע ולסייע במענה.",
  },
  {
    title: "תשובות שדורשות בירור",
    text: "למשל אורח שאומר שהוא עדיין לא יודע אם יגיע — הסטטוס נשאר מתלבט עד להחלטה.",
  },
] as const;

export const COMPARE_ROWS = [
  { topic: "אופן הפנייה", ai: "הודעה קולית אוטומטית", human: "נציג מתקשר" },
  { topic: "אופי השיחה", ai: "תסריט מוגדר", human: "שיחה אישית" },
  { topic: "מענה", ai: "מקשי טלפון (1 / 2 / 3)", human: "תשובה בשיחה" },
  { topic: "פנייה למוזמנים רבים", ai: "מתאימה לתהליך רחב", human: "תלויה בזמינות הצוות" },
  { topic: "בירור תשובות מורכבות", ai: "מוגבל לאפשרויות שהוגדרו", human: "מאפשר בירור גמיש" },
  { topic: "אחידות המסר", ai: "גבוהה", human: "תלויה בתסריט ובהנחיות" },
  { topic: "התאמה לאורחים שצריכים עזרה", ai: "מוגבלת", human: "לרוב גמישה יותר" },
  { topic: "עלות", ai: "לפי החבילה והמחירון", human: "לפי החבילה והמחירון" },
] as const;

export const COMBINED_STEPS = [
  {
    title: "הודעת WhatsApp",
    text: "האורחים מקבלים הודעה עם קישור אישי לאישור הגעה.",
  },
  {
    title: "טיפול במי שלא השיב",
    text: "בהתאם לסבבים שנרכשו, ממשיכים בפניות למוזמנים שעדיין אין מהם תשובה.",
  },
  {
    title: "שיחה מוקלטת",
    text: "אפשר לשלב שיחת AI כדי לנסות לקבל מענה מאורחים שלא השיבו להודעות.",
  },
  {
    title: "מוקד אנושי",
    text: "במקרים המתאימים, נציג יכול לפנות למוזמנים שנותרו ללא תשובה או זקוקים לבירור.",
  },
  {
    title: "סיכום",
    text: "המערכת מרכזת את תשובות האורחים לצורך תכנון האירוע.",
  },
] as const;

export const FLOW_PATH = [
  "WhatsApp",
  "לא השיב",
  "שיחת AI",
  "נדרש בירור",
  "מוקד אנושי",
  "תשובה מעודכנת",
] as const;

export const NO_ANSWER_EXAMPLES = [
  { name: "נועה", status: "אישר הגעה", detail: "השיחה נענתה והתקבלה תשובה תקינה" },
  { name: "יוסי", status: "לא ענה", detail: "ממתין לניסיון נוסף בסבב הבא" },
  { name: "משפחת כהן", status: "מתלבט", detail: "נדרש בירור מספר משתתפים" },
  { name: "דנה", status: "לא מגיע", detail: "אישרה שלא תגיע" },
] as const;

/** Fictional demo rows for call report mock — columns that exist in IVR reports. */
export const REPORT_DEMO_ROWS = [
  {
    time: "14:02",
    guest: "נועה לוי",
    phone: "050-000-0101",
    round: "1",
    status: "אישר הגעה",
    answered: "כן",
    digit: "1",
    rsvp: "אישר הגעה",
  },
  {
    time: "14:05",
    guest: "יוסי כהן",
    phone: "052-000-0202",
    round: "1",
    status: "לא ענה",
    answered: "לא",
    digit: "—",
    rsvp: "אין תשובה",
  },
  {
    time: "14:08",
    guest: "משפחת אברהם",
    phone: "054-000-0303",
    round: "2",
    status: "מתלבט",
    answered: "כן",
    digit: "3",
    rsvp: "מתלבט",
  },
  {
    time: "14:12",
    guest: "דנה שמש",
    phone: "053-000-0404",
    round: "1",
    status: "לא מגיע",
    answered: "כן",
    digit: "2",
    rsvp: "לא מגיע",
  },
  {
    time: "14:15",
    guest: "אורי מזרחי",
    phone: "058-000-0505",
    round: "2",
    status: "נענה – ללא הקשה",
    answered: "כן",
    digit: "—",
    rsvp: "אין תשובה",
  },
] as const;

export const REPORT_FIELDS = [
  "מספר טלפון",
  "שם הרשומה",
  "סבב וניסיון",
  "מועד השיחה",
  "תוצאת ניסיון החיוג",
  "האם השיחה נענתה",
  "הקשה שנקלטה",
  "תשובת אישור ההגעה",
  "מספר המשתתפים (כשנאסף)",
  "משך השיחה וסיבת כישלון כשיש",
] as const;

export const EVENT_TYPES = [
  {
    title: "חתונה",
    text: "כשיש רשימת מוזמנים גדולה ומספר משמעותי של אורחים שעדיין לא השיבו, שיחות יכולות לעזור להשלים את התמונה לקראת ההתחייבות לאולם וסידורי ההושבה.",
    href: LINKS.chatuna,
  },
  {
    title: "חינה",
    text: "גם באירוע משפחתי מצומצם יחסית, חשוב לדעת מי מגיע, במיוחד כאשר יש חלוקה בין משפחות וקבוצות מוזמנים.",
    href: LINKS.rsvp,
  },
  {
    title: "בר ובת מצווה",
    text: "שיחות יכולות להתאים למשפחה ולחברים של ההורים. לגבי חברים מהכיתה, כדאי להתחשב בכך שההורים הם לעיתים אלה שמרכזים את אישורי ההגעה.",
    href: LINKS.rsvp,
  },
  {
    title: "ברית ובריתה",
    text: "כאשר האירוע מתארגן בהתראה קצרה, שיחה עשויה להיות דרך נוספת להגיע למוזמנים שלא השיבו להודעה.",
    href: LINKS.rsvp,
  },
] as const;

/** Three equal service paths — none framed as a mistake. */
export const CALL_PATH_CARDS = [
  {
    id: "voice",
    icon: "ai" as const,
    title: "שיחה מוקלטת. אישור הגעה פשוט ומהיר.",
    body: "האורחים מקבלים שיחה אוטומטית עם קריינות בעברית, שומעים את פרטי האירוע ומשיבים באמצעות מקשי הטלפון. אפשר לאשר הגעה, לעדכן שלא מגיעים או לציין שעדיין לא יודעים. המסלול מתאים למי שמעדיף תהליך מובנה, יעיל ונוח, ללא צורך בנציג אנושי בכל שיחה.",
    benefits: [
      "תהליך אחיד ומסודר",
      "מענה באמצעות מקשי הטלפון",
      "מתאים גם להיקף גדול של מוזמנים",
      "אפשרות לחזרה לאורחים שלא ענו, בהתאם להגדרות השירות",
    ],
    closing: "מתאים למי שמחפש פתרון אוטומטי ונוח.",
  },
  {
    id: "personal",
    icon: "human" as const,
    title: "שיחה אישית. יחס אנושי לכל אורח.",
    body: "נציגי המוקד מתקשרים לאורחים, משוחחים איתם ומבררים אם הם מתכננים להגיע לאירוע. השיחה מאפשרת התייחסות אישית, בירור תשובות ועדכון סטטוס ההגעה בהתאם למענה.",
    benefits: [
      "שיחה אישית עם נציג",
      "אפשרות לשאול שאלות ולהבהיר תשובות",
      "מתאים לאורחים שמעדיפים תקשורת אנושית",
      "גישה אישית ומכבדת",
    ],
    closing: "מתאים למי שמעדיף שירות אישי באמצעות נציגים.",
  },
  {
    id: "hybrid",
    icon: "hybrid" as const,
    title: "שני העולמות. תהליך אחד מסודר.",
    body: "אפשר להתחיל בשיחות מוקלטות כדי לאסוף תשובות בצורה יעילה, ולהיעזר במוקד אנושי בהמשך עבור אורחים שעדיין לא התקבלה מהם תשובה או שדורשים בירור נוסף. כך ניתן ליהנות מהיעילות של שיחות אוטומטיות ומהיחס האישי של נציג אנושי.",
    benefits: [
      "איסוף תשובות באמצעות שיחות מוקלטות",
      "אפשרות להמשך טיפול אנושי",
      "התאמה לקבוצות שונות של מוזמנים",
      "תהליך גמיש בהתאם לצורכי האירוע",
    ],
    closing: "מתאים למי שרוצה לשלב אוטומציה עם מענה אישי.",
  },
] as const;

export const MORE_GUIDES = [
  {
    href: LINKS.whatsappVsSms,
    title: "WhatsApp או SMS — מה עדיף?",
    text: "השוואה בין ערוצי ההודעות ואיך בוחרים נכון.",
  },
  {
    href: LINKS.noReply,
    title: "מה עושים עם אורחים שלא עונים?",
    text: "מעקב, סבבים והשלמת תשובות בלי להלחיץ.",
  },
  {
    href: LINKS.whenToSend,
    title: "מתי מתחילים אישורי הגעה?",
    text: "תזמון סבבים לפי מועד מסירת הכמות לאולם.",
  },
  {
    href: LINKS.venue,
    title: "איך מתכננים התחייבות לאולם?",
    text: "מספר מנות, מרווח ביטחון ומועד סגירה.",
  },
] as const;

export const PACKAGE_BLURBS = [
  {
    title: "שיחות מוקלטות",
    text: "בסיס ההודעות + שלושה סבבי שיחה מוקלטת עם קריינות AI למי שעדיין לא השיב.",
  },
  {
    title: "שיחות אנושיות",
    text: "בסיס ההודעות + שלושה סבבים במוקד אנושי.",
  },
  {
    title: "מסלול משולב",
    text: "בסיס ההודעות + שני סבבים מוקלטים וסבב אנושי אחד — בהתאם לחבילה במחשבון.",
  },
] as const;
