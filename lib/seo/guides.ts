import type {
  ContentBenefit,
  ContentFaq,
  ContentLink,
  ContentMedia,
  ContentSection,
  ContentStep,
} from "@/components/marketing/PublicContentPage";

export type Guide = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  titleAccent?: string;
  lede: string;
  sections: ContentSection[];
  faqs: ContentFaq[];
  benefits?: ContentBenefit[];
  steps?: ContentStep[];
  media?: ContentMedia;
  showEventTypes?: boolean;
  related?: ContentLink[];
  ctaTitle?: string;
  ctaLede?: string;
};

export const GUIDES: Guide[] = [
  {
    // Dedicated UI: app/(marketing)/info/guides/cost-rsvp-wedding/
    slug: "cost-rsvp-wedding",
    title: "כמה עולים אישורי הגעה לחתונה? מחיר לפי רשומות",
    description:
      "איך מחשבים מחיר אישורי הגעה לחתונה? מה זו רשומה, האם משפחה נחשבת לרשומה אחת, אילו אורחים לא נגרעים מהמכסה ואיך מחושבים Save the Date והזמנה דיגיטלית.",
    h1: "כמה עולים אישורי הגעה לחתונה ואיך מחשבים את המחיר?",
    lede: "מחיר אישורי ההגעה נקבע לפי הרשומות המחויבות בחבילה — לא בהכרח לפי מספר האנשים שמוזמנים לחתונה.",
    sections: [],
    faqs: [],
    related: [
      { href: "/pricing", label: "מחירון ומחשבון חבילות" },
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/rsvp/hina", label: "אישורי הגעה לחינה" },
      { href: "/rsvp/save-the-date", label: "Save the Date" },
      { href: "/invitations/chatuna", label: "הזמנות דיגיטליות לחתונה" },
      { href: "/seating-explained", label: "סידורי הושבה" },
      { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
      { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
      { href: "/info/guides/wedding-venue-guest-guarantee", label: "כמה אורחים להתחייב לאולם" },
      { href: "/info/guides/whatsapp-vs-sms-rsvp", label: "WhatsApp, SMS ואיך מתבצע הגיבוי?" },
      { href: "/info/guides/how-to-choose-rsvp-company", label: "איך בוחרים חברת אישורי הגעה" },
      { href: "/info/guides/wedding-planning", label: "תכנון חתונה מלא" },
    ],
  },
  {
    slug: "when-to-send-rsvp",
    title: "מתי שולחים אישורי הגעה לחתונה? המדריך",
    description: "מתי שולחים Save the Date, הזמנה ואישורי הגעה? מדריך לתכנון נכון לפי חגים, קיץ, חורף, אורחים מחו״ל ומועד סגירת המנות מול האולם.",
    h1: "מתי שולחים אישורי הגעה לחתונה ולאירועים? המדריך לתזמון נכון",
    titleAccent: "לפי האולם — לא לפי יום קסם",
    lede: "Invistimo לא נועלת אתכם ליום מסוים לפני החתונה. השליחה צריכה להשאיר זמן לסבב שני, ולמסירת מספר לאולם לפני המועד שהאולם קובע.",
    benefits: [
      {
        title: "סדר שלבים ברור",
        text: "Save the Date (אם פתוח) → סבבי אישור → תזכורת → תודה.",
      },
      {
        title: "זמן לסבב שני",
        text: "מתכננים מועד שמשאיר מרווח למי שלא ענה לפני דד־ליין האולם.",
      },
      {
        title: "פרטים נכונים לפני השליחה",
        text: "תאריך, שעה ומיקום חייבים להיות יציבים בהזמנה לפני שאוספים אישורים.",
      },
    ],
    steps: [
      { title: "סוגרים רשימה", text: "שמות ומספרים תקינים." },
      { title: "בודקים מול האולם", text: "מתי צריך מספר מנות." },
      { title: "שולחים סבב ראשון", text: "ואז סבב שני למי שנשאר פתוח." },
      { title: "מעבירים מספר", text: "לאולם לפי המועד שלו." },
    ],
    showEventTypes: true,
    sections: [
      {
        heading: "הסדר במערכת",
        paragraphs: [
          "אם Save the Date פתוח בחשבון, הוא יוצא קודם, פעם אחת, בלי לאסוף תשובות. אחר כך יוצאים סבבי אישור ההגעה בוואטסאפ. לקראת האירוע יוצאת תזכורת SMS, ואחרי האירוע הודעת תודה.",
          "הזמנה מוקדמת, אם היא פתוחה, היא הודעה נפרדת. היא לא מחליפה את שני סבבי האישור של חבילת ההודעות.",
        ],
      },
      {
        heading: "איך בוחרים מועד",
        paragraphs: [
          "קודם סוגרים רשימה עם שמות ומספרים תקינים. אחר כך בודקים מול האולם מתי הוא צריך מספר מנות. השליחה צריכה להסתיים עם מספיק זמן לסבב למי שלא ענה, לפני הדד־ליין של האולם.",
          "אין טעם לשלוח לפני שהתאריך, השעה והמיקום בהזמנה נכונים. אורח שמאשר לפי פרט שגוי יעדכן אחר כך, והמספר זז.",
          "בבר מצווה, ברית או אירוע חברה אותו עיקרון: דד־ליין של הספק או האולם קובע את לוח הזמנים — לא «מספר ימים קבוע מהמערכת».",
        ],
      },
    ],
    faqs: [
      {
        q: "האם המערכת שולחת לבד בתאריך קבוע?",
        a: "לא. אתם קובעים מתי יוצא כל סבב. המערכת שולחת לפי מה שהוגדר בחשבון.",
      },
      {
        q: "מה עושים אם האולם מקדים את סגירת המנות?",
        a: "מקדימים את סבב האישור, ומשתמשים בסבב השני או בחבילת שיחות למי שנשאר בלי תשובה. הדד־ליין הוא של האולם.",
      },
      {
        q: "מתי שולחים Save the Date?",
        a: "לפני סבבי האישור, ורק אם האפשרות פתוחה בחשבון. הוא לא אוסף תשובות.",
      },
    ],
  },
  {
    slug: "send-digital-invitation",
    title: "איך שולחים הזמנה דיגיטלית לחתונה?",
    description: "העלאת הזמנה או שימוש בהזמנה במערכת, קישור אישי, ושליחה בשני סבבי וואטסאפ בחבילת ההודעות.",
    h1: "איך שולחים הזמנה דיגיטלית לחתונה?",
    titleAccent: "קישור אישי — לא קובץ לקבוצה",
    lede: "ההזמנה הדיגיטלית נפתחת מקישור אישי. בחבילת ההודעות היא יוצאת עם שני סבבי וואטסאפ לאישור הגעה, לא כקובץ לקבוצה.",
    media: {
      type: "image",
      src: "/homep2.png",
      alt: "המחשת הזמנה דיגיטלית ב־Invistimo",
      variant: "phone",
      caption: "המחשה ממסכי המערכת",
    },
    benefits: [
      {
        title: "קישור אישי לכל אורח",
        text: "התשובה משויכת לרשומה הנכונה, בלי ערבוב בצ'אט קבוצתי.",
      },
      {
        title: "עריכה בזמן שהאירוע פעיל",
        text: "שינוי בפרטים מתעדכן בהזמנה שהאורח פותח.",
      },
      {
        title: "מחוברת לאישור",
        text: "מההזמנה ממשיכים לאישור הגעה בסבבי הוואטסאפ של החבילה.",
      },
    ],
    steps: [
      { title: "מעלים או בוחרים הזמנה", text: "בודקים שמות, תאריך, שעה ומיקום." },
      { title: "מחברים לרשימה", text: "מספר טלפון לכל רשומה שצריכה הודעה." },
      { title: "שולחים סבב ראשון", text: "ואז סבב שני למי שלא ענה." },
      { title: "מעדכנים אם צריך", text: "כל עוד האירוע פעיל." },
    ],
    showEventTypes: true,
    sections: [
      {
        heading: "לפני השליחה",
        paragraphs: [
          "מעלים הזמנה שכבר עוצבה, או משתמשים בהזמנה שבמערכת. בודקים שמות, תאריך, שעה ומיקום. את הרשימה מעלים עם מספר טלפון לכל רשומה שצריכה לקבל הודעה.",
          "עיצוב בהתאמה אישית הוא תוספת במחשבון. הזמנה דיגיטלית עצמה כלולה בחבילות שבעמוד המחירים.",
        ],
      },
      {
        heading: "בזמן השליחה",
        paragraphs: [
          "סבב הוואטסאפ הראשון יוצא לרשימה. מי שלא ענה נשאר מסומן, ואליו מיועד הסבב השני. האורח מאשר בקישור, בלי להתקין אפליקציה.",
          "אפשר לערוך את ההזמנה כל עוד האירוע פעיל. העדכון מופיע בהזמנה הדיגיטלית.",
        ],
      },
      {
        heading: "לא רק לחתונה",
        paragraphs: [
          "אותו תהליך מתאים להזמנה דיגיטלית לבת מצווה, ברית, יום הולדת או אירוע חברה. ההבדל הוא בעיצוב ובתוכן — לא במנגנון הקישור האישי.",
        ],
      },
    ],
    faqs: [
      {
        q: "האם אתר חתונה הוא ההזמנה?",
        a: "לא. תבניות אתר החתונה הן מסך נפרד. ההזמנה לאישור ההגעה היא הקישור האישי שנשלח לאורח.",
      },
      {
        q: "אפשר לשלוח רק חלק מהרשימה?",
        a: "סבבי האישור פונים לפי הסטטוס. מי שכבר ענה לא צריך את אותו סבב שוב. Save the Date, כשהוא פתוח, יוצא לרשימה פעם אחת.",
      },
      {
        q: "האם צריך אפליקציה?",
        a: "לא. האורח פותח קישור בדפדפן או בוואטסאפ.",
      },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/bit-paybox-wedding-invitation/
    slug: "bit-paybox-wedding-invitation",
    title: "איך מוסיפים bit ו־PayBox להזמנה דיגיטלית לחתונה?",
    description:
      "מדריך מעשי להוספת bit ו־PayBox להזמנה דיגיטלית לחתונה: הגדרת מספר טלפון וקישור, בדיקת ההזמנה, חוויית האורחים, אבטחה ופתרון תקלות.",
    h1: "איך מוסיפים bit ו־PayBox להזמנה דיגיטלית לחתונה?",
    lede:
      "רוצים לאפשר לאורחים לשלוח מתנה דרך bit או PayBox? ב־Invistimo מגדירים קישור PayBox ומספר טלפון ל־bit; ההעברה עצמה מתבצעת מחוץ למערכת.",
    sections: [],
    faqs: [],
    related: [
      { href: "/credit-gifts", label: "מתנות באשראי, bit ו־PayBox" },
      { href: "/invitations/chatuna", label: "הזמנות דיגיטליות" },
      { href: "/info/guides/send-digital-invitation", label: "איך שולחים הזמנה" },
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/rsvp/save-the-date", label: "Save the Date" },
      { href: "/info/guides", label: "מרכז המדריכים" },
      { href: "/pricing", label: "חבילות ומחירים" },
      { href: "/try", label: "דמו" },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/seating-plan/
    slug: "seating-plan",
    title: "איך מכינים סידורי הושבה לחתונה? מדריך צעד אחר צעד",
    description:
      "איך מכינים סידורי הושבה לחתונה? מדריך מעשי להכנת רשימת מוזמנים, חלוקה לשולחנות, עבודה עם סקיצת האולם, רזרבות, בדיקות ודוגמאות להושבה של 300 אורחים.",
    h1: "איך מכינים סידורי הושבה לחתונה? מדריך מעשי צעד אחר צעד",
    lede: "רשימה מעודכנת, סקיצת אולם, חלוקה לקבוצות, שיבוץ לפי קיבולת, רזרבות ובדיקה סופית — צעד אחר צעד.",
    sections: [],
    faqs: [],
    related: [
      { href: "/seating-explained", label: "שירות סידורי הושבה" },
      {
        href: "/info/guides/wedding-seating-arrangements",
        label: "המדריך המלא לסידורי הושבה",
      },
      { href: "/info/guides/table-number-message", label: "הודעת מספר שולחן" },
      { href: "/info/guides/event-day-checklist", label: "לפני יום האירוע" },
      { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/try/dashboard/seating", label: "דמו הושבה" },
      { href: "/pricing", label: "חבילות ומחירים" },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/save-the-date-vs-invitation/
    slug: "save-the-date-vs-invitation",
    title: "Save the Date או הזמנה לחתונה? ההבדלים ומתי שולחים",
    description:
      "מה ההבדל בין Save the Date להזמנה לחתונה? מתי שולחים כל אחת, מה כותבים, האם צריך את שתיהן ואיך משלבים אישורי הגעה. מדריך עם דוגמאות ולוח זמנים.",
    h1: "מה ההבדל בין Save the Date להזמנה לחתונה? ומתי שולחים כל אחת?",
    lede: "Save the Date הוא הודעה מוקדמת לשמירת התאריך. ההזמנה נשלחת בהמשך עם פרטי האירוע, ויכולה להוביל לאישורי הגעה.",
    sections: [],
    faqs: [],
    related: [
      { href: "/rsvp/save-the-date", label: "עמוד Save the Date" },
      { href: "/invitations/chatuna", label: "הזמנות דיגיטליות" },
      { href: "/info/guides/send-digital-invitation", label: "מדריך שליחת הזמנה דיגיטלית" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
      { href: "/info/guides/table-number-message", label: "הודעת מספר שולחן" },
      { href: "/seating-explained", label: "סידורי הושבה" },
      { href: "/pricing", label: "חבילות ומחירים" },
      { href: "/info/guides", label: "מרכז המדריכים" },
      { href: "/try", label: "דמו Invistimo" },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/guest-list/
    slug: "guest-list",
    title: "איך מנהלים רשימת מוזמנים לחתונה? מדריך מלא",
    description:
      "איך מכינים רשימת מוזמנים לחתונה בלי כפילויות? מדריך לניהול זוגות ומשפחות, בדיקת מספרי טלפון, העלאת Excel, אישורי הגעה וסידורי הושבה.",
    h1: "איך מנהלים רשימת מוזמנים לחתונה בצורה נכונה?",
    lede: "רשימה מסודרת היא הבסיס לאישורי הגעה מדויקים, לסידורי הושבה נוחים ולתכנון נכון של מספר האורחים.",
    sections: [],
    faqs: [],
    related: [
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/seating-explained", label: "סידורי הושבה" },
      { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
      { href: "/info/guides/wedding-venue-guest-guarantee", label: "כמה אורחים להתחייב לאולם" },
      { href: "/info/guides/cost-rsvp-wedding", label: "כמה עולים אישורי הגעה" },
      { href: "/info/guides/whatsapp-vs-sms-rsvp", label: "WhatsApp ו־SMS" },
      { href: "/info/guides/wedding-planning", label: "תכנון חתונה מלא" },
      { href: "/info/guides/event-day-checklist", label: "צ'קליסט לפני יום האירוע" },
      { href: "/rsvp/whatsapp", label: "אישורי הגעה ב־WhatsApp" },
      { href: "/rsvp/calls", label: "שיחות טלפון" },
      { href: "/rsvp/bar-bat-mitzvah", label: "בר ובת מצווה" },
      { href: "/pricing", label: "חבילות ומחירים" },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/guests-who-dont-reply/
    slug: "guests-who-dont-reply",
    title: "אורחים שלא עונים לאישורי הגעה — מה עושים?",
    description:
      "מה עושים כשאורחים לא עונים לאישורי הגעה? איך מתבצע המעקב, מתי כדאי לשלב שיחות וכמה סבבים מומלץ לתכנן בלי להלחיץ את האורחים.",
    h1: "אורחים שלא עונים לאישורי הגעה — מה עושים?",
    lede: "אורחים שלא השיבו נשארים במעקב במערכת, ובהתאם לחבילה שנבחרה יכולים להיכלל בסבב הפנייה הבא — בלי מספר סבבים קבוע לכל אורח.",
    sections: [],
    faqs: [],
    related: [
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/rsvp/hina", label: "אישורי הגעה לחינה" },
      { href: "/rsvp/whatsapp", label: "אישורי הגעה ב־WhatsApp" },
      { href: "/rsvp/calls", label: "אישורי הגעה בשיחות טלפון" },
      { href: "/info/guides/whatsapp-vs-sms-rsvp", label: "מה ההבדל בין הודעה שלא נמסרה לאורח שלא השיב?" },
      { href: "/info/guides/how-to-choose-rsvp-company", label: "איך בוחרים חברת אישורי הגעה" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
      { href: "/info/guides/wedding-venue-guest-guarantee", label: "כמה אורחים להתחייב לאולם" },
      { href: "/info/guides/cost-rsvp-wedding", label: "כמה עולים אישורי הגעה" },
      { href: "/info/guides/event-day-checklist", label: "צ'קליסט לפני יום האירוע" },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/wedding-planning/
    slug: "wedding-planning",
    title: "איך מתכננים חתונה? המדריך המלא לתכנון חתונה בישראל",
    description:
      "מתכננים חתונה? מדריך מקיף לבניית תקציב, בחירת אולם, רשימת מוזמנים, סגירת ספקים, אישורי הגעה, הושבה ולוח זמנים עד יום החתונה.",
    h1: "איך מתכננים חתונה? המדריך המלא מהאירוסין ועד החופה",
    lede: "תכנון חתונה בישראל מההחלטות הראשונות ועד יום האירוע — תקציב, מוזמנים, אולם, ספקים, אישורים והושבה.",
    sections: [],
    faqs: [],
    related: [
      { href: "/info/guides/wedding-vendors-contracts", label: "מדריך ספקים וחוזים" },
      { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
      { href: "/info/guides/wedding-venue-guest-guarantee", label: "התחייבות לאולם" },
      {
        href: "/info/guides/wedding-seating-arrangements",
        label: "סידורי הושבה לחתונה",
      },
      { href: "/info/guides/seating-plan", label: "איך מכינים הושבה במערכת" },
      { href: "/info/guides/event-day-checklist", label: "בדיקה לפני יום האירוע" },
      { href: "/event-management", label: "ניהול אירוע" },
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/seating-explained", label: "הושבה דיגיטלית" },
      { href: "/pricing", label: "חבילות ומחירים" },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/wedding-vendors-contracts/
    slug: "wedding-vendors-contracts",
    title: "איך בוחרים ספקים לחתונה? חוזים, מקדמות וביטולים",
    description:
      "מדריך לבחירת ספקים לחתונה: איך משווים הצעות מחיר, מה לבדוק בחוזה, מה ההבדל בין מקדמה לדמי שריון, תנאי ביטול והחזר כספי.",
    h1: "איך בוחרים ספקים לחתונה ומה חייבים לבדוק לפני שסוגרים?",
    lede: "השוואת הצעות, קריאת חוזים, הבנת מקדמות ודמי שריון ומדיניות ביטול — לפני שמתחייבים.",
    sections: [],
    faqs: [],
    related: [
      { href: "/info/guides/wedding-planning", label: "המדריך המלא לתכנון חתונה" },
      { href: "/info/guides/wedding-venue-guest-guarantee", label: "התחייבות לאולם" },
      { href: "/info/guides/event-day-checklist", label: "בדיקה לפני יום האירוע" },
      { href: "/event-management", label: "ניהול אירוע וספקים" },
      { href: "/info/guides/wedding-alcohol-calculator", label: "מחשבון אלכוהול" },
      { href: "/pricing", label: "חבילות Invistimo" },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/wedding-venue-guest-guarantee/
    slug: "wedding-venue-guest-guarantee",
    title: "כמה אורחים להתחייב לאולם? מדריך ומחשבון",
    description:
      "כמה מנות כדאי להתחייב לאולם חתונה? מדריך להערכת כמות האורחים, התחייבות מינימלית, רזרבות, שינוי התחייבות ואישורי הגעה, כולל מחשבון.",
    h1: "כמה אורחים כדאי להתחייב לאולם לחתונה?",
    lede: "התחייבות נכונה מתחילה במספר ריאלי — לא במספר השמות ברשימת המוזמנים.",
    sections: [],
    faqs: [],
    related: [
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
      { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
      { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
      { href: "/info/guides/wedding-seating-arrangements", label: "סידורי הושבה לחתונה" },
      { href: "/info/guides/wedding-alcohol-calculator", label: "מחשבון אלכוהול לחתונה" },
      { href: "/info/guides/wedding-planning", label: "תכנון חתונה מלא" },
      { href: "/info/guides/wedding-vendors-contracts", label: "ספקים וחוזים" },
      { href: "/seating-explained", label: "סידורי הושבה" },
      { href: "/pricing", label: "חבילות ומחירים" },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/wedding-seating-arrangements/
    slug: "wedding-seating-arrangements",
    title: "סידורי הושבה לחתונה: שולחנות, מאשרים ורזרבות",
    description:
      "איך מתכננים סידורי הושבה לחתונה? האם למלא שולחנות, איך משבצים את כל מאשרי ההגעה ומה עושים עם רזרבות וביטולים? מדריך מקצועי ומחשבון.",
    h1: "סידורי הושבה לחתונה: המדריך המלא לחלוקת שולחנות, מאשרי הגעה ורזרבות",
    lede: "איך מחלקים שולחנות, מה עושים עם מאשרי הגעה ורזרבות, ולמה אסור להסתמך על אי־הגעה משוערת כקיבולת.",
    sections: [],
    faqs: [],
    related: [
      { href: "/seating-explained", label: "שירות סידורי הושבה" },
      { href: "/info/guides/seating-plan", label: "איך מכינים הושבה במערכת" },
      { href: "/info/guides/wedding-venue-guest-guarantee", label: "התחייבות למנות ורזרבות" },
      { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
      { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/rsvp/calls", label: "שיחות אישורי הגעה" },
      { href: "/info/guides/wedding-planning", label: "תכנון חתונה מלא" },
      { href: "/pricing", label: "חבילות ומחירים" },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/wedding-alcohol-calculator/
    slug: "wedding-alcohol-calculator",
    title: "כמה אלכוהול צריך לקנות לחתונה?",
    description:
      "מחשבון אלכוהול לחתונה — בוחרים משקאות, מחשבים כמויות ומעריכים עלויות לפי מספר האורחים ואופי האירוע.",
    h1: "כמה אלכוהול צריך לקנות לחתונה?",
    lede: "מתכננים את הבר, בוחרים את המשקאות ומשווים עלויות — לפני שמוציאים כסף.",
    sections: [],
    faqs: [],
    related: [
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
      { href: "/info/guides/wedding-venue-guest-guarantee", label: "התחייבות לאולם" },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/whatsapp-vs-sms-rsvp/
    slug: "whatsapp-vs-sms-rsvp",
    title: "אישורי הגעה ב־WhatsApp או SMS — מה עדיף?",
    description:
      "WhatsApp או SMS לאישורי הגעה לחתונה? הכירו את היתרונות, המגבלות, מנגנון הגיבוי האוטומטי של Invistimo ודוחות המסירה לפי מספר טלפון.",
    h1: "אישורי הגעה ב־WhatsApp או SMS — מה באמת עדיף?",
    lede:
      "לרוב נוח להתחיל ב־WhatsApp. כאשר WhatsApp נכשל או לא נשלח, Invistimo יכולה לשלוח SMS חלופי אוטומטי עם אותו קישור אישי — ולעקוב אחרי הסטטוסים בדוח השליחה.",
    sections: [],
    faqs: [],
    related: [
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/rsvp/whatsapp", label: "אישורי הגעה ב־WhatsApp" },
      { href: "/rsvp/calls", label: "אישורי הגעה בשיחות טלפון" },
      { href: "/info/guides/how-to-choose-rsvp-company", label: "איך בוחרים חברת אישורי הגעה" },
      { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים" },
      { href: "/info/guides/cost-rsvp-wedding", label: "עלויות אישורי הגעה" },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/how-to-choose-rsvp-company/
    slug: "how-to-choose-rsvp-company",
    title: "איך בוחרים חברת אישורי הגעה לחתונה? מדריך והשוואה",
    description:
      "איך בוחרים חברת אישורי הגעה? השוואת WhatsApp, SMS, שיחות מוקלטות ומוקד אנושי, מחירים, סבבים וסידורי הושבה. מדריך מקצועי של Invistimo.",
    h1: "איך בוחרים חברת אישורי הגעה לחתונה? המדריך המלא להשוואת שירותים ומחירים",
    lede:
      "כדי לבחור חברת אישורי הגעה לחתונה, כדאי לבדוק שיטות פנייה, סבבים, טיפול בממתינים, ספירת רשומות, מערכת ניהול, הושבה, תמיכה ומחיר סופי — ולהשוות חבילות בעלות היקף שירות דומה.",
    sections: [],
    faqs: [],
    related: [
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/rsvp/whatsapp", label: "אישורי הגעה ב־WhatsApp" },
      { href: "/rsvp/calls", label: "שיחות מוקלטות ומוקד אנושי" },
      { href: "/pricing", label: "חבילות ומחירים" },
      { href: "/try", label: "דמו" },
      { href: "/seating-explained", label: "סידורי הושבה" },
      { href: "/info/guides/cost-rsvp-wedding", label: "מחיר לפי רשומות" },
      { href: "/info/guides/whatsapp-vs-sms-rsvp", label: "WhatsApp או SMS" },
      { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
      { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
      { href: "/info/guides/seating-plan", label: "סידורי הושבה — מדריך" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים" },
    ],
  },
  {
    slug: "table-number-message",
    title: "הודעת מספר שולחן לאורחים: מתי שולחים ומה אם משתנה?",
    description:
      "מתי שולחים מספר שולחן לאורחים? מדריך מלא לאישור סקיצת האולם, בדיקת ההושבה, שליחת הודעות, טיפול בשינויים וסבב עדכון נוסף.",
    h1: "הודעת מספר שולחן לאורחים: מתי שולחים, מה בודקים ומה עושים כשיש שינויים?",
    titleAccent: "אחרי אישור הסקיצה — לא לפני",
    lede: "מומלץ לשלוח מספרי שולחנות רק אחרי שהאולם אישר סקיצה ומספור, השיבוצים יציבים, ויש תוכנית לעדכון אורחים אם משהו משתנה אחרי השליחה.",
    benefits: [
      {
        title: "אישור סקיצה לפני שליחה",
        text: "מונע בלבול כשמספור האולם שונה מהמפה הדיגיטלית.",
      },
      {
        title: "הודעת שולחן + תזכורת",
        text: "הודעה ייעודית אחרי שיבוץ; בתזכורת — עם מספר למי שמשובץ, ובלי מספר למי שלא.",
      },
      {
        title: "טיפול בשינויים",
        text: "מתי לשלוח סבב עדכון נוסף ומה צוות הקבלה צריך לדעת.",
      },
    ],
    steps: [
      { title: "מאשרים סקיצה", text: "מול האולם — מספור וקיבולת." },
      { title: "משבצים ובודקים", text: "צ'קליסט לפני שליחה." },
      { title: "שולחים מספר שולחן", text: "SMS ו/או WhatsApp לאורחים עם שולחן." },
      { title: "מעדכנים אחרי שינוי", text: "הודעת תיקון + צוות קבלה." },
    ],
    sections: [
      {
        heading: "מתי שולחים",
        paragraphs: [
          "שולחים הודעת מספר שולחן אחרי שיש שיבוץ יציב מספיק והאולם אישר את הסקיצה.",
          "תזכורת SMS נשלחת בדרך כלל ביום שלפני האירוע או ביום האירוע: משובץ מקבל מספר שולחן, לא משובץ מקבל תזכורת בלי מספר.",
          "עדכון שיבוץ במפה אינו מעדכן אוטומטית הודעה שכבר התקבלה בטלפון של האורח.",
        ],
      },
      {
        heading: "תזכורת SMS ומגבלות",
        paragraphs: [
          "התזכורת היא שלב נפרד מהודעת השיבוץ עצמה. מספר השולחן נכלל בה לפי מצב השיבוץ של האורח בזמן השליחה.",
          "הושבה דיגיטלית היא תוספת במחשבון. בלי התוספת אין להניח שמפת ההושבה או שליחת מספר השולחן פתוחות.",
        ],
      },
    ],
    faqs: [
      {
        q: "האם מספר השולחן נשלח עם אישור ההגעה?",
        a: "לא. סבבי אישור ההגעה אוספים תשובה. מספר השולחן נשלח אחרי השיבוץ — בהודעה ייעודית, ובתזכורת למי שמשובץ.",
      },
      {
        q: "מה קורה אם משנים שולחן אחרי השליחה?",
        a: "מעדכנים את השיבוץ במערכת. אם כבר נשלח מספר ישן, צריך לשלוח שוב או לעדכן את האורח ידנית — המפה לבדה לא מעדכנת הודעה שכבר התקבלה.",
      },
    ],
    related: [
      { href: "/seating-explained", label: "סידורי הושבה" },
      { href: "/info/guides/seating-plan", label: "מדריך מפת הושבה" },
      { href: "/info/guides/event-day-checklist", label: "בדיקה לפני יום האירוע" },
      { href: "/pricing", label: "חבילות ומחירים" },
      { href: "/try/dashboard/seating", label: "דמו הושבה" },
    ],
  },
  {
    // Dedicated UI: app/(marketing)/info/guides/event-day-checklist/
    slug: "event-day-checklist",
    title: "מה בודקים לפני יום האירוע? הצ'קליסט המלא לחתונה",
    description:
      "מה צריך לסגור לפני החתונה? צ'קליסט מלא לחודש, לשבוע וליום שלפני האירוע: ספקים, תשלומים, אישורי הגעה, הושבה, לו\"ז, ציוד וטיפים מעשיים.",
    h1: "מה בודקים לפני יום האירוע? הצ'קליסט המלא לחתונה בלי הפתעות",
    titleAccent: "תוכנית עבודה לפני האירוע",
    lede: "לפני יום החתונה חשוב לוודא שכל הספקים אישרו את פרטי ההגעה וההסכמים, שהתשלומים והמקדמות מעודכנים, שלוח הזמנים סופי, שרשימת המוזמנים ואישורי ההגעה מעודכנים, שמפת ההושבה מוכנה ושהאולם קיבל את מספר האורחים לפי המועד שסוכם. בנוסף, יש להכין אנשי קשר, ציוד אישי, פתרונות למקרים בלתי צפויים וחלוקת אחריות ברורה ליום האירוע.",
    sections: [],
    faqs: [],
    related: [
      { href: "/info/guides/wedding-planning", label: "תכנון חתונה מלא" },
      { href: "/info/guides/wedding-vendors-contracts", label: "ספקים וחוזים" },
      { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
      { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
      { href: "/info/guides/wedding-seating-arrangements", label: "סידורי הושבה" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
      { href: "/event-management", label: "ניהול אירוע" },
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/seating-explained", label: "הושבה דיגיטלית" },
      { href: "/pricing", label: "חבילות ומחירים" },
      { href: "/try", label: "דמו" },
      { href: "/info/guides", label: "מרכז המדריכים" },
    ],
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug);
}

export function guidePath(slug: string) {
  return `/info/guides/${slug}`;
}
