export const CREDIT_GIFTS_PATH = "/credit-gifts";
export const UPDATED_AT = "2026-10-26";

export const CREDIT_GIFTS_META = {
  title: "מתנות לחתונה באשראי, bit ו־PayBox | Invistimo",
  description:
    "מתנות לחתונה באשראי, PayBox, bit והעברה בנקאית. הכירו את אפשרויות המתנה הדיגיטליות של Invistimo ואיך משלבים אותן בהזמנה ובאישורי ההגעה.",
};

/** Direct answer for AEO — visible on page, not hidden. */
export const PAGE_ANSWER =
  "ב־Invistimo אפשר להציג לאורחים כמה דרכים להעניק מתנה: קישור מתנה באשראי דרך ספק הסליקה החיצוני RSVP, קישור PayBox אישי שמזינים בעלי האירוע, ומספר טלפון להעברה ב־bit. האורח בוחר מבין האפשרויות שהופעלו באירוע; הסליקה באשראי מתבצעת אצל הספק החיצוני, ו־PayBox ו־bit הם קישורים או פרטים שהמערכת מציגה בלבד.";

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
  hero: "/marketing/credit-gifts/hero-envelope.jpg",
  giftPageIcon: "/icons/gift-page.png",
  paymentIcon: "/icons/payment.png",
  installmentsIcon: "/icons/installments.png",
  transferIcon: "/icons/transfer.png",
  summaryIcon: "/icons/summary.png",
  scheduleIcon: "/icons/schedule.png",
  dashboard: "/images/rsvp/chatuna/dashboard-guests.jpg",
  phoneInvite: "/images/rsvp/chatuna/phone-invite.jpg",
  phoneThanks: "/images/rsvp/chatuna/phone-thanks.jpg",
} as const;

/** Demo-only values — never real payment details. */
export const DEMO_GIFTS = {
  creditUrl: "https://example.com/demo-credit-gift",
  payboxUrl: "https://payboxapp.com/demo-invistimo-gift",
  bitPhone: "0500000000",
} as const;

export type GiftMethodId =
  | "credit"
  | "paybox"
  | "bit"
  | "bank"
  | "cash"
  | "blessing";

export type GiftMethod = {
  id: GiftMethodId;
  title: string;
  subtitle: string;
  status: "active" | "display_only" | "informational" | "requires_dev";
  statusLabel: string;
  whoHandles: string;
  paragraphs: string[];
  bullets: string[];
  caveats: string[];
};

export const GIFT_METHODS: GiftMethod[] = [
  {
    id: "credit",
    title: "מתנה בכרטיס אשראי",
    subtitle: "סליקה חיצונית דרך ספק RSVP",
    status: "active",
    statusLabel: "שירות פעיל באמצעות ספק חיצוני",
    whoHandles: "ספק הסליקה החיצוני RSVP",
    paragraphs: [
      "האורח עובר לעמוד התשלום של ספק הסליקה החיצוני RSVP, בוחר סכום ומשלים את התשלום אצל הספק. Invistimo מציגה את הקישור במסכי האורח לפי הגדרות האירוע, ואינה סולקת את כרטיס האשראי בעצמה.",
      "הפעלת השירות מותנית בהרשמה ל־RSVP, מילוי הפרטים הנדרשים ואישור פתיחת משתמש על ידי הספק — עד כיומיים עסקים ממועד השלמת הפרטים, לפי תנאי הספק. לאחר קבלת הקישור יש להוסיף אותו בפרטי האירוע ב־Invistimo.",
    ],
    bullets: [
      "בחירת סכום בעמוד הספק (סכומים מוכנים או סכום חופשי, לפי מה שמוגדר אצל RSVP).",
      "אפשרות לברכה בעמוד המתנה של הספק, כפי שמוצע שם.",
      "עמלת סליקה של 2.5% מסכום המתנה — משולמת על ידי האורח במעמד התשלום, לפי תנאי RSVP כפי שמופיעים במסמכי המכירה של Invistimo.",
      "העברת כספים לחשבון שהוגדר אצל RSVP — עד 5 ימי עסקים לפי מדיניות הספק; העברה מהירה יותר («העברת זהב») בעלות 100 ₪ עד יום עסקים אחד, בכפוף לזמינות ולאישור הספק.",
      "אמצעי תשלום נתמכים בעמוד הספק כוללים כרטיס אשראי; Apple Pay ופריסה לתשלומים מוצגים כשאפשריים אצל הספק — יש לאמת מול עמוד התשלום הפעיל.",
    ],
    caveats: [
      "Invistimo אינה מאמתת אוטומטית הצלחת תשלום ללא אינטגרציה מתאימה מצד הספק.",
      "אין להבטיח זיכוי מיידי או העברה ישירה ללא בדיקה מול תנאי RSVP.",
    ],
  },
  {
    id: "paybox",
    title: "מתנה ב־PayBox",
    subtitle: "קישור אישי שבעלי האירוע יוצרים",
    status: "active",
    statusLabel: "פעיל — הצגת קישור בלבד",
    whoHandles: "PayBox (שירות חיצוני)",
    paragraphs: [
      "בעלי האירוע יוצרים קישור PayBox תקף באפליקציה שלהם, ומזינים אותו בהגדרות המתנות של האירוע. האורח לוחץ על הכפתור ונפתח הקישור החיצוני.",
      "Invistimo אינה מקבלת ואינה מעבירה את הכסף — היא מציגה את הקישור שבחרתם להציג.",
    ],
    bullets: [
      "הפעלה או כיבוי בדשבורד פרטי האירוע.",
      "שדה קישור עם בדיקת פורמט כתובת (https).",
      "כפתור PayBox במסך האורח כשהאפשרות פעילה.",
      "אפשר להציג QR של אותו קישור בעמוד השיווק או בתצוגה מקדימה — ה־QR מקודד את הקישור בלבד.",
    ],
    caveats: [
      "מגבלות העברה וקופה ב־PayBox נקבעות על ידי PayBox, לא על ידי Invistimo.",
      "אין עדכון אוטומטי של מתנות PayBox בדוח הכספי של Invistimo ללא אינטגרציה מאומתת.",
    ],
  },
  {
    id: "bit",
    title: "מתנה ב־bit",
    subtitle: "מספר טלפון להעתקה",
    status: "active",
    statusLabel: "פעיל — הצגת מספר בלבד",
    whoHandles: "bit (שירות חיצוני)",
    paragraphs: [
      "בעלי האירוע מזינים מספר טלפון ישראלי המיועד לקבלת העברות ב־bit. האורח רואה את האפשרות ויכול להעתיק את המספר.",
      "אין יצירה אוטומטית של קישור bit ממספר טלפון. קישור או QR רשמיים יישארו נתמכים רק אם סופקו ממקור מאומת באפליקציית bit.",
    ],
    bullets: [
      "הפעלה או כיבוי ומספר בפורמט ישראלי תקין (05XXXXXXXX).",
      "העתקת מספר במסך האורח עם משוב הצלחה.",
      "לא נפתח מסך העברה אוטומטי ב־bit מהמערכת.",
    ],
    caveats: [
      "מגבלות יומיות/חודשיות של bit חלות על השולח והמקבל לפי מדיניות bit.",
      "אין עדכון אוטומטי של העברות bit במערכת Invistimo.",
    ],
  },
  {
    id: "bank",
    title: "העברה בנקאית",
    subtitle: "פרטי חשבון — דורש פיתוח תצוגה לאורח",
    status: "requires_dev",
    statusLabel: "לא מוצג כיום במסך המתנות לאורח",
    whoHandles: "הבנקים / בעלי האירוע",
    paragraphs: [
      "אפשר כמובן לקבל מתנה בהעברה בנקאית מחוץ למערכת. כיום אין בעמוד המתנות לאורח שדות מובנים להצגת שם בעל חשבון, בנק, סניף ומספר חשבון.",
      "רישום ידני של מתנה שהתקבלה בהעברה קיים במעקב המתנות הפנימי (EventGift), אך זו תיעוד אחרי קבלה — לא תצוגת פרטים לאורח.",
    ],
    bullets: [
      "שדות מוצעים לפיתוח עתידי: שם בעל החשבון, בנק, סניף, מספר חשבון, הערת העברה.",
      "כפתורי העתקה לכל פרט — רק אחרי אישור היקף הפיתוח.",
      "פרטי בנק לא יופיעו ב־HTML ציבורי של עמוד השיווק ולא ב־Schema.",
    ],
    caveats: [
      "אין להציג פרטי חשבון כברירת מחדל ולא לכלול אותם בתוכן סריק לאינדוקס.",
      "עד להשלמת הפיתוח — לא מציגים העברה בנקאית כשירות תצוגה פעיל באורח.",
    ],
  },
  {
    id: "cash",
    title: "מזומן או צ'ק",
    subtitle: "ביום האירוע",
    status: "informational",
    statusLabel: "הסבר — לא מסלול תשלום דיגיטלי",
    whoHandles: "בעלי האירוע ביום האירוע",
    paragraphs: [
      "לא חייבים ליצור מסלול תשלום דיגיטלי. אפשר להעניק מתנה גם ביום האירוע במזומן או בצ'ק.",
      "אפשר להציג לאורחים הודעה קצרה דרך הערת האירוע הציבורית, למשל: «ניתן להעניק מתנה גם באירוע עצמו» — בלי חלון קופץ שמחייב בחירה.",
    ],
    bullets: [
      "אין קישור תשלום.",
      "רישום ידני אפשרי במעקב מתנות פנימי אחרי האירוע.",
    ],
    caveats: [
      "אין להציג בקשת מתנה באופן שמפריע לאישור ההגעה.",
    ],
  },
  {
    id: "blessing",
    title: "ברכה אישית",
    subtitle: "בעמוד האשראי של הספק / הודעת אורח באתר חתונה",
    status: "active",
    statusLabel: "זמין במסלולים מאומתים",
    whoHandles: "RSVP (ברכת מתנה) / אתר חתונה (הודעת אורח)",
    paragraphs: [
      "בעמוד המתנה באשראי של ספק RSVP ניתן לצרף ברכה כחלק מתהליך התשלום אצל הספק — לפי מה שמוצע שם.",
      "באתר חתונה של Invistimo קיימת אפשרות נפרדת לשליחת ברכה או הודעה לא כתובה כאימות תשלום. אין לקשור ברכה אוטומטית להצלחת תשלום חיצוני שלא ניתן לאמת.",
    ],
    bullets: [
      "ברכת מתנה באשראי — אצל RSVP.",
      "הודעת אורח באתר חתונה — כשאתר החתונה פעיל.",
      "שמירה מאובטחת רק במסלול שמירה תקין הקיים במוצר.",
    ],
    caveats: [
      "אין ברכה אוטומטית אחרי לחיצה על קישור PayBox או bit.",
    ],
  },
];

export const COMPARE_ROWS = [
  {
    method: "אשראי",
    guest: "עמוד תשלום של הספק",
    setup: "הרשמה ל־RSVP + קישור באירוע",
    who: "ספק חיצוני RSVP",
    fees: "2.5% על האורח (לפי תנאי RSVP במסמכי Invistimo)",
  },
  {
    method: "PayBox",
    guest: "לחיצה על קישור חיצוני",
    setup: "קישור PayBox תקף",
    who: "PayBox",
    fees: "לפי מדיניות PayBox — לא מנוהל ב־Invistimo",
  },
  {
    method: "bit",
    guest: "העתקת מספר טלפון",
    setup: "מספר לקבלת bit",
    who: "bit",
    fees: "לפי מדיניות bit — לא מנוהל ב־Invistimo",
  },
  {
    method: "העברה בנקאית",
    guest: "העברה לפרטי חשבון (מחוץ למסך המתנות כיום)",
    setup: "שיתוף פרטים באופן פרטי / פיתוח עתידי",
    who: "הבנקים",
    fees: "לפי הבנק",
  },
  {
    method: "מזומן / צ'ק",
    guest: "ביום האירוע",
    setup: "אין צורך בקישור",
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
    text: "קישור RSVP לאשראי, קישור PayBox תקף, או מספר bit בפורמט ישראלי.",
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
  "PayBox ו־bit הם שירותים חיצוניים; Invistimo מציגה קישור או מספר שבעלי האירוע בחרו לפרסם.",
  "פרטי העברה בנקאית לא מוצגים כיום במסך המתנות לאורח.",
  "Invistimo אינה מאמתת אוטומטית תשלום חיצוני ללא אינטגרציה מתאימה.",
  "נתוני כרטיס אשראי אינם נשלחים לשרת Invistimo כשהסליקה אצל הספק החיצוני.",
  "מומלץ לוודא את זהות מקבל המתנה ואת תקינות הקישורים לפני שיתוף עם אורחים.",
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
