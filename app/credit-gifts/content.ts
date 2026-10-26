export const CREDIT_GIFTS_PATH = "/credit-gifts";
export const UPDATED_AT = "2026-10-26";

export const CREDIT_GIFTS_META = {
  title: "מתנות לחתונה באשראי, bit ו־PayBox | Invistimo",
  description:
    "מתנות לחתונה באשראי דרך RSVP, קישור PayBox ומספר bit להעתקה. הכירו את שלוש אפשרויות המתנה הדיגיטליות ב־Invistimo ואיך משלבים אותן בהזמנה ובאישורי ההגעה.",
};

/** Short page intro used in the hero. */
export const PAGE_ANSWER =
  "ב־Invistimo יש שלוש אפשרויות מתנה דיגיטליות לאורחים: קישור מתנה באשראי שמתקבל אחרי פתיחת משתמש אצל ספק הסליקה החיצוני RSVP, קישור PayBox אישי שבעלי האירוע מזינים, ומספר טלפון להעתקה להעברה ב־bit. האורח בוחר מבין מה שהופעל באירוע; הסליקה באשראי אצל RSVP, ו־PayBox ו־bit מוצגים בלבד — בלי סליקה של Invistimo.";

export const LINKS = {
  pricing: "/pricing",
  demo: "/try",
  invitations: "/invitations/chatuna",
  rsvp: "/rsvp",
  rsvpWedding: "/rsvp/chatuna",
  seating: "/seating-explained",
  eventManagement: "/event-management",
  guides: "/info/guides",
  sendInvite: "/info/guides/send-digital-invitation",
  guideBitPaybox: "/info/guides/bit-paybox-wedding-invitation",
  contact: "/contact",
  terms: "/terms",
  privacy: "/privacy",
  barBat: "/rsvp/bar-bat-mitzvah",
  hina: "/rsvp/hina",
  weddingWebsite: "/wedding-website",
} as const;

export const MEDIA = {
  hero: "/marketing/credit-gifts/hero-envelope-unique.jpg",
  giftPageIcon: "/icons/gift-page.png",
  paymentIcon: "/icons/payment.png",
  installmentsIcon: "/icons/installments.png",
  transferIcon: "/icons/transfer.png",
  summaryIcon: "/icons/summary.png",
  scheduleIcon: "/icons/schedule.png",
  dashboard: "/images/marketing-captures/unique/module-messages-whatsapp-focus.webp",
  phoneInvite: "/images/rsvp/chatuna/phone-invite.jpg",
  phoneThanks: "/images/rsvp/chatuna/phone-thanks.jpg",
  video: "/videos/marketing-captures/guide-credit-gifts.webm",
  videoPoster: "/videos/marketing-captures/guide-credit-gifts-poster.jpg",
} as const;

/** Demo-only values — never real payment details. */
export const DEMO_GIFTS = {
  creditUrl: "https://example.com/demo-credit-gift",
  payboxUrl: "https://payboxapp.com/demo-invistimo-gift",
  bitPhone: "0500000000",
} as const;

export type GiftMethodId = "credit" | "paybox" | "bit" | "cash" | "blessing";

export type GiftMethod = {
  id: GiftMethodId;
  title: string;
  subtitle: string;
  status: "active" | "display_only" | "informational";
  statusLabel: string;
  whoHandles: string;
  paragraphs: string[];
  bullets: string[];
  caveats: string[];
};

/** Product scope: credit link (RSVP), PayBox link, bit phone copy — only. */
export const GIFT_METHODS: GiftMethod[] = [
  {
    id: "credit",
    title: "מתנה בכרטיס אשראי",
    subtitle: "קישור מתנות אחרי פתיחת משתמש אצל RSVP",
    status: "active",
    statusLabel: "שירות פעיל באמצעות ספק חיצוני",
    whoHandles: "ספק הסליקה החיצוני RSVP",
    paragraphs: [
      "נרשמים לשירות המתנות באשראי אצל ספק הסליקה החיצוני RSVP. אחרי פתיחת משתמש ואישור הספק מקבלים קישור תשלום, ומזינים אותו בפרטי האירוע ב־Invistimo.",
      "האורח עובר לעמוד התשלום של RSVP, בוחר סכום ומשלים את התשלום אצל הספק. Invistimo מציגה את הקישור במסכי האורח — ואינה סולקת את כרטיס האשראי בעצמה.",
    ],
    bullets: [
      "הרשמה ל־RSVP ואישור פתיחת משתמש — עד כיומיים עסקים ממועד השלמת הפרטים, לפי תנאי הספק.",
      "הדבקת קישור המתנות בפרטי האירוע אחרי קבלתו מהספק.",
      "בחירת סכום וברכה בעמוד הספק, לפי מה שמוצע שם.",
      "עמלת סליקה של 2.5% מסכום המתנה — משולמת על ידי האורח במעמד התשלום, לפי תנאי RSVP במסמכי המכירה של Invistimo.",
      "זיכוי לחשבון שהוגדר אצל RSVP — עד 5 ימי עסקים; «העברת זהב» בעלות 100 ₪ עד יום עסקים אחד, בכפוף לזמינות ולאישור הספק.",
    ],
    caveats: [
      "בלי הוספת הקישור בפרטי האירוע — האורחים לא יראו אפשרות אשראי.",
      "אין להבטיח זיכוי מיידי ללא בדיקה מול תנאי RSVP.",
    ],
  },
  {
    id: "paybox",
    title: "מתנה ב־PayBox",
    subtitle: "קישור PayBox שבעלי האירוע מזינים",
    status: "active",
    statusLabel: "פעיל — הצגת קישור בלבד",
    whoHandles: "PayBox (שירות חיצוני)",
    paragraphs: [
      "יוצרים קישור PayBox באפליקציה שלכם, ומדביקים אותו בהגדרות המתנות של האירוע. האורח לוחץ על הכפתור ונפתח הקישור החיצוני.",
      "Invistimo אינה מקבלת ואינה מעבירה את הכסף — היא מציגה את קישור ה־PayBox שבחרתם להציג.",
    ],
    bullets: [
      "הפעלה או כיבוי בפרטי האירוע.",
      "שדה קישור עם בדיקת פורמט כתובת (https).",
      "כפתור PayBox במסך האורח כשהאפשרות פעילה.",
    ],
    caveats: [
      "מגבלות העברה וקופה נקבעות על ידי PayBox.",
      "אין עדכון אוטומטי של מתנות PayBox בדוח Invistimo.",
    ],
  },
  {
    id: "bit",
    title: "מתנה ב־bit",
    subtitle: "מספר טלפון להעתקה בלבד",
    status: "active",
    statusLabel: "פעיל — מספר להעתקה",
    whoHandles: "bit (שירות חיצוני)",
    paragraphs: [
      "מזינים בפרטי האירוע מספר טלפון ישראלי לקבלת העברות ב־bit. האורח רואה את האפשרות ומעתיק את המספר — ואז מעביר באפליקציית bit.",
      "זהו מספר להעתקה בלבד. אין בעורך קישור bit, אין QR bit, ואין יצירה אוטומטית של קישור ממספר הטלפון.",
    ],
    bullets: [
      "הפעלה או כיבוי ומספר בפורמט ישראלי תקין (05XXXXXXXX).",
      "העתקת מספר במסך האורח עם משוב הצלחה.",
      "לא נפתח מסך העברה אוטומטי ב־bit מהמערכת.",
    ],
    caveats: [
      "מגבלות bit חלות לפי מדיניות bit.",
      "אין עדכון אוטומטי של העברות bit במערכת Invistimo.",
    ],
  },
  {
    id: "cash",
    title: "מזומן או צ'ק",
    subtitle: "ביום האירוע — מחוץ לשלוש האפשרויות הדיגיטליות",
    status: "informational",
    statusLabel: "הסבר — לא מסלול דיגיטלי במערכת",
    whoHandles: "בעלי האירוע ביום האירוע",
    paragraphs: [
      "מעבר לשלוש האפשרויות הדיגיטליות (אשראי, PayBox, bit) אפשר כמובן להעניק מתנה גם ביום האירוע במזומן או בצ'ק.",
      "אפשר לציין זאת בהערת האירוע הציבורית — בלי חלון קופץ שמחייב בחירה.",
    ],
    bullets: ["אין קישור תשלום במערכת.", "לא מחליף את הגדרת אשראי / PayBox / bit."],
    caveats: ["אין להציג בקשת מתנה באופן שמפריע לאישור ההגעה."],
  },
  {
    id: "blessing",
    title: "ברכה אישית",
    subtitle: "בעמוד האשראי של הספק / הודעת אורח באתר חתונה",
    status: "active",
    statusLabel: "זמין במסלולים מאומתים",
    whoHandles: "RSVP (ברכת מתנה) / אתר חתונה (הודעת אורח)",
    paragraphs: [
      "בעמוד המתנה באשראי של RSVP ניתן לצרף ברכה לפי מה שמוצע שם.",
      "באתר חתונה של Invistimo קיימת אפשרות נפרדת להודעת אורח — לא כאימות תשלום PayBox או bit.",
    ],
    bullets: [
      "ברכת מתנה באשראי — אצל RSVP.",
      "הודעת אורח באתר חתונה — כשאתר החתונה פעיל.",
    ],
    caveats: ["אין ברכה אוטומטית אחרי לחיצה על קישור PayBox או אחרי העתקת מספר bit."],
  },
];

export const COMPARE_ROWS = [
  {
    method: "אשראי",
    guest: "עמוד תשלום של RSVP",
    setup: "פתיחת משתמש אצל RSVP + הדבקת קישור באירוע",
    who: "ספק חיצוני RSVP",
    fees: "2.5% על האורח (לפי תנאי RSVP במסמכי Invistimo)",
  },
  {
    method: "PayBox",
    guest: "לחיצה על קישור חיצוני",
    setup: "קישור PayBox תקף בפרטי האירוע",
    who: "PayBox",
    fees: "לפי מדיניות PayBox — לא מנוהל ב־Invistimo",
  },
  {
    method: "bit",
    guest: "העתקת מספר טלפון",
    setup: "מספר לקבלת bit בפרטי האירוע",
    who: "bit",
    fees: "לפי מדיניות bit — לא מנוהל ב־Invistimo",
  },
  {
    method: "מזומן / צ'ק",
    guest: "ביום האירוע",
    setup: "אין צורך בקישור במערכת",
    who: "בעלי האירוע",
    fees: "אין עמלת סליקה דיגיטלית",
  },
] as const;

export const HOST_STEPS = [
  {
    title: "בוחרים אילו אפשרויות להציג",
    text: "בפרטי האירוע מפעילים אשראי, PayBox ו/או bit — רק מה שרלוונטי לכם.",
  },
  {
    title: "מזינים קישור או מספר",
    text: "קישור המתנות מאשראי אחרי פתיחת משתמש ב־RSVP, קישור PayBox תקף, או מספר bit להעתקה.",
  },
  {
    title: "שומרים ובודקים בתצוגת אורח",
    text: "האפשרויות מופיעות בקישור האישי ובמסכי האירוע הציבוריים שהופעלו.",
  },
  {
    title: "משאירים את אישור ההגעה נקי",
    text: "בקשת המתנה מוצגת בכבוד — בלי חלון שמחייב בחירה לפני אישור הגעה.",
  },
] as const;

export const GUEST_STEPS = [
  {
    title: "פותחים את הקישור האישי",
    text: "מההזמנה, מאישור ההגעה או מהודעה שקיבלתם.",
  },
  {
    title: "בוחרים דרך שנוחה לכם",
    text: "אשראי, PayBox או bit — לפי מה שבעלי האירוע הציגו.",
  },
  {
    title: "משלימים אצל הספק או מעתיקים פרטים",
    text: "באשראי — תשלום אצל RSVP. ב־PayBox — מעבר לקישור. ב־bit — העתקת מספר.",
  },
] as const;

export const GUEST_BENEFITS = [
  "בחירה באמצעי המוכר להם.",
  "אפשרות להעניק מתנה גם מרחוק או לפני האירוע.",
  "גישה נוחה מהטלפון, בלי אפליקציית Invistimo.",
  "פחות צורך לבקש פרטי תשלום בהודעה פרטית.",
] as const;

export const HOST_BENEFITS = [
  "הצגת כמה דרכי קבלה במקום אחד.",
  "הגדרה מרכזית בפרטי האירוע (אשראי, PayBox, bit).",
  "שילוב עם ההזמנה ואישורי ההגעה.",
  "חוויית אורח מסודרת ומכבדת.",
] as const;

export const WHY_POINTS = [
  {
    title: "חוויית אורח דיגיטלית",
    text: "פרטי האירוע, אישור הגעה ואפשרויות מתנה — באותה חוויה.",
  },
  {
    title: "קישור אישי",
    text: "כל אורח מקבל קישור משלו לאישור הגעה ולפרטים שהופעלו.",
  },
  {
    title: "סליקה חיצונית שקופה",
    text: "מתנות באשראי דרך RSVP — עם פירוט עמלות וזיכוי כפי שמופיע במסמכי השירות.",
  },
  {
    title: "PayBox ו־bit כהצגה בלבד",
    text: "אתם מזינים קישור או מספר; הכסף עובר בשירות החיצוני.",
  },
  {
    title: "מותאם למובייל",
    text: "ממשק האורח בנוי לטלפון — שם רוב האורחים מאשרים ומעניקים.",
  },
  {
    title: "ניהול באירוע",
    text: "הגדרות המתנות יושבות לצד שאר פרטי האירוע בדשבורד.",
  },
] as const;

export const SECURITY_POINTS = [
  "סליקת אשראי מתבצעת אצל ספק RSVP — לא בשרתי Invistimo.",
  "PayBox מוצג כקישור שבעלי האירוע הזינו; bit מוצג כמספר להעתקה בלבד.",
  "אין בעורך קישור bit או QR bit — רק מספר טלפון.",
  "Invistimo אינה מאמתת אוטומטית תשלום PayBox או bit.",
  "נתוני כרטיס אשראי אינם נשלחים לשרת Invistimo כשהסליקה אצל הספק החיצוני.",
  "מומלץ לוודא את זהות מקבל המתנה ואת תקינות קישורי אשראי ו־PayBox לפני שיתוף עם אורחים.",
] as const;

export const INTEGRATION_POINTS = [
  {
    title: "הזמנה דיגיטלית",
    text: "אפשר לשלב קישורי מתנה כחלק מחוויית ההזמנה והפרטים הציבוריים של האירוע.",
  },
  {
    title: "קישור אישי לאורח",
    text: "בקישור האישי מוצגות האפשרויות שהופעלו — אשראי, PayBox ו־bit.",
  },
  {
    title: "מסך אישור הגעה",
    text: "אפשר להציג אפשרויות מתנה ליד האישור, בלי לחייב בחירה לפני השליחה.",
  },
  {
    title: "אחרי אישור / תודה",
    text: "קיימת הגדרה להצגת קישור מתנה לאחר אישור, כשהיא מופעלת באירוע.",
  },
] as const;

export const RELATED_INTERNAL = [
  { href: LINKS.invitations, label: "הזמנות דיגיטליות" },
  { href: LINKS.rsvp, label: "אישורי הגעה" },
  { href: LINKS.rsvpWedding, label: "אישורי הגעה לחתונה" },
  { href: LINKS.pricing, label: "חבילות ומחירים" },
  { href: LINKS.seating, label: "סידורי הושבה" },
  { href: LINKS.eventManagement, label: "ניהול אירוע" },
  { href: LINKS.guides, label: "מרכז המדריכים" },
  { href: LINKS.sendInvite, label: "מדריך שליחת הזמנות" },
  { href: LINKS.guideBitPaybox, label: "מדריך bit ו־PayBox" },
  { href: LINKS.demo, label: "דמו" },
  { href: LINKS.weddingWebsite, label: "אתר חתונה" },
  { href: LINKS.barBat, label: "בר ובת מצווה" },
  { href: LINKS.hina, label: "חינה" },
] as const;
