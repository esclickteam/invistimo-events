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
    slug: "seating-plan",
    title: "איך מכינים סידורי הושבה לחתונה?",
    description: "סקיצת אולם, שולחנות, שיבוץ ידני או לפי קבוצות, והודעה עם מספר שולחן. תוספת שמופיעה במחשבון.",
    h1: "איך מכינים סידורי הושבה לחתונה?",
    titleAccent: "סקיצה, שיבוץ והודעת שולחן",
    lede: "סידור ההושבה ב־Invistimo מתחיל מסקיצה של האולם. אחר כך ממקמים שולחנות, משבצים אורחים, ובסוף אפשר לשלוח לכל אורח את מספר השולחן.",
    media: {
      type: "video",
      src: "/videos/smartsit.mp4",
      variant: "wide",
      caption: "המחשת סידור הושבה במערכת",
    },
    benefits: [
      {
        title: "עבודה על סקיצת האולם",
        text: "השולחנות על המפה — לא רק ברשימה נפרדת.",
      },
      {
        title: "שיבוץ גמיש",
        text: "ידני או לפי קבוצות, עם תיקון אחרי חלוקה ראשונית.",
      },
      {
        title: "הודעת מספר שולחן",
        text: "אחרי השיבוץ אפשר לשלוח לכל אורח הודעה אישית.",
      },
    ],
    steps: [
      { title: "מעלים סקיצה", text: "לפי מבנה האולם." },
      { title: "ממקמים שולחנות", text: "על הסקיצה." },
      { title: "משבצים אורחים", text: "ידנית או לפי קבוצות, ואז מתקנים." },
      { title: "שולחים מספר שולחן", text: "בהודעה אישית ובתזכורת כשיש הושבה." },
    ],
    showEventTypes: true,
    sections: [
      {
        heading: "השלבים במערכת",
        paragraphs: [
          "מעלים סקיצה ועובדים לפי המבנה של האולם. שולחנות ממוקמים על הסקיצה, לא רק ברשימה.",
          "שיבוץ אפשר לעשות מהשולחן או מרשימת האורחים, גם כקבוצה. יש גם חלוקה ראשונית לפי קבוצות, ואחריה עורכים ידנית.",
        ],
        bullets: [
          "סקיצה ומפת שולחנות",
          "שיבוץ ידני או לפי קבוצות",
          "הודעה אישית עם מספר השולחן",
        ],
      },
      {
        heading: "מתי זה אפשרי",
        paragraphs: [
          "הושבה דיגיטלית היא תוספת במחשבון החבילות, לא חלק אוטומטי מכל חבילת הודעות. בלי התוספת אין להניח שמפת ההושבה פתוחה.",
          "עדיף לשבץ אחרי שיש תשובות, כי מי שלא מגיע לא תופס כיסא. מי שעדיין לא ענה נשאר פתוח עד שמחליטים אם לשמור לו מקום.",
          "אותו תהליך רלוונטי גם לחינה, בר מצווה או אירוע חברה עם שולחנות — כשהתוספת נרכשה.",
        ],
      },
    ],
    faqs: [
      {
        q: "האם השיבוץ האוטומטי סוגר את ההושבה?",
        a: "לא. הוא נותן חלוקה ראשונית לפי קבוצות. אחר כך עוברים ומתקנים.",
      },
      {
        q: "איך האורח יודע איפה לשבת?",
        a: "אחרי השיבוץ אפשר לשלוח הודעה אישית עם מספר השולחן. בתזכורת ה־SMS של החבילה יש גם מספר שולחן.",
      },
      {
        q: "האם ההושבה כלולה בכל חבילה?",
        a: "לא. זו תוספת במחשבון.",
      },
    ],
    related: [
      { href: "/seating-explained", label: "סידורי הושבה" },
      { href: "/rsvp/hina", label: "אישורי הגעה והושבה לחינה" },
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/info/guides/table-number-message", label: "הודעת מספר שולחן" },
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
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
      { href: "/info/guides/wedding-venue-guest-guarantee", label: "כמה אורחים להתחייב לאולם" },
      { href: "/info/guides/cost-rsvp-wedding", label: "כמה עולים אישורי הגעה" },
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
      { href: "/info/guides/seating-plan", label: "סידורי הושבה" },
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
      { href: "/info/guides/wedding-alcohol-calculator", label: "מחשבון אלכוהול לחתונה" },
      { href: "/info/guides/wedding-planning", label: "תכנון חתונה מלא" },
      { href: "/info/guides/wedding-vendors-contracts", label: "ספקים וחוזים" },
      { href: "/seating-explained", label: "סידורי הושבה" },
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
      { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים" },
      { href: "/info/guides/cost-rsvp-wedding", label: "עלויות אישורי הגעה" },
    ],
  },
  {
    slug: "table-number-message",
    title: "איך שולחים לאורחים את מספר השולחן?",
    description: "הודעת מספר שולחן אחרי שיבוץ, ותזכורת SMS עם מספר שולחן בחבילת ההודעות. דורש תוספת הושבה.",
    h1: "איך שולחים לאורחים את מספר השולחן?",
    titleAccent: "אחרי השיבוץ — לא עם האישור",
    lede: "אחרי שסידורתם הושבה אפשר לשלוח לכל אורח הודעה אישית עם מספר השולחן. זו פעולה נפרדת משיבוץ השולחנות, והיא לא מחליפה את סבבי אישור ההגעה.",
    benefits: [
      {
        title: "הודעה אישית",
        text: "מספר השולחן יוצא מהמערכת לכל אורח ששובץ.",
      },
      {
        title: "גם בתזכורת SMS",
        text: "בחבילת ההודעות, כשיש הושבה.",
      },
      {
        title: "דורש תוספת הושבה",
        text: "בלי התוספת במחשבון אין להניח שהמפה פתוחה.",
      },
    ],
    steps: [
      { title: "סוגרים אישורים", text: "כמה שאפשר לפני השיבוץ." },
      { title: "משבצים שולחנות", text: "על הסקיצה." },
      { title: "שולחים מספר שולחן", text: "בהודעה אישית." },
      { title: "תזכורת לפני האירוע", text: "SMS עם מספר שולחן כשיש הושבה." },
    ],
    sections: [
      {
        heading: "מתי שולחים",
        paragraphs: [
          "שולחים אחרי שיש שיבוץ יציב מספיק, ומי שלא מגיע כבר לא תופס כיסא. אם עדיין יש הרבה רשומות פתוחות, עדיף קודם לסיים סבבי אישור.",
          "ההודעה האישית עם מספר השולחן יוצאת מתוך המערכת. היא לא דורשת מהאורח להתקין אפליקציה.",
        ],
      },
      {
        heading: "תזכורת SMS ומגבלות",
        paragraphs: [
          "בתזכורת ה־SMS של חבילת ההודעות מופיע גם מספר שולחן כשיש הושבה. התזכורת היא שלב נפרד מהודעת השיבוץ עצמה.",
          "הושבה דיגיטלית היא תוספת במחשבון. בלי התוספת אין להניח שמפת ההושבה או שליחת מספר השולחן פתוחות.",
        ],
      },
    ],
    faqs: [
      {
        q: "האם מספר השולחן נשלח עם אישור ההגעה?",
        a: "לא. סבבי אישור ההגעה אוספים תשובה. מספר השולחן נשלח אחרי השיבוץ, וגם בתזכורת כשיש הושבה.",
      },
      {
        q: "מה קורה אם משנים שולחן אחרי השליחה?",
        a: "מעדכנים את השיבוץ במערכת. אם כבר נשלח מספר ישן, צריך לשלוח שוב או לעדכן את האורח ידנית.",
      },
    ],
  },
  {
    slug: "event-day-checklist",
    title: "מה בודקים לפני יום האירוע במערכת?",
    description: "רשימת בדיקה מעשית: סטטוסי הגעה, הושבה, תזכורת, הודעת תודה וגבולות המערכת מול ליווי באולם.",
    h1: "מה בודקים לפני יום האירוע?",
    titleAccent: "רשימת בדיקה מעשית",
    lede: "לפני יום האירוע בודקים שהרשימה מעודכנת, שסבבי האישור הסתיימו ככל האפשר, שההושבה מוכנה אם נרכשה, ושהתזכורת והודעת התודה מוגדרות. המערכת לא מחליפה מפיק באולם אלא אם סוכם ליווי.",
    benefits: [
      {
        title: "רשימה מעודכנת",
        text: "כולל תשובות שהגיעו בטלפון ועודכנו ידנית.",
      },
      {
        title: "הושבה ותזכורת",
        text: "אם נרכשו — מוודאים שיבוץ והודעות מוכנים.",
      },
      {
        title: "בלי להחליף מפיק",
        text: "ליווי באולם רק אם סוכם בנפרד.",
      },
    ],
    steps: [
      { title: "סוגרים פתוחים", text: "סבב שני או שיחות." },
      { title: "מעבירים מספר לאולם", text: "לפי המועד שלו." },
      { title: "סוגרים הושבה", text: "אם יש תוספת." },
      { title: "בודקים תזכורת ותודה", text: "מועדים ותוכן." },
    ],
    showEventTypes: true,
    sections: [
      {
        heading: "רשימה ואישורים",
        paragraphs: [
          "עוברים על מי עדיין בלי תשובה. משתמשים בסבב וואטסאפ שני או בחבילת שיחות אם היא נרכשה. מעדכנים ידנית תשובות שהגיעו בטלפון כדי שהמספר לאולם יהיה אחד.",
          "מייצאים או מעבירים לאולם את מספר המגיעים לפי המועד שהאולם קבע. המערכת לא שולחת את המספר לאולם אוטומטית.",
        ],
      },
      {
        heading: "הושבה, תזכורת ותודה",
        paragraphs: [
          "אם יש תוספת הושבה, סוגרים שיבוץ ושולחים מספר שולחן למי שצריך. בודקים שהתזכורת ב־SMS מוגדרת למועד הנכון, ושהודעת התודה מוכנה אחרי האירוע.",
          "ניהול משימות, ספקים ותקציב נמצא במסך ניהול האירוע. ליווי וניהול באולם הם שירות נפרד, רק אם סוכם.",
        ],
      },
    ],
    faqs: [
      {
        q: "האם יש צ׳ק־אין אוטומטי באולם?",
        a: "יש מסכי צ׳ק־אין במערכת לשימוש ביום האירוע כשהם מופעלים לאירוע. זה לא מחליף את סבבי אישור ההגעה מראש.",
      },
      {
        q: "מה ההבדל בין המדריך הזה לעמוד ניהול האירוע?",
        a: "המדריך הוא רשימת בדיקה לפני היום. עמוד ניהול האירוע מתאר את מסך המוצר עצמו.",
      },
    ],
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug);
}

export function guidePath(slug: string) {
  return `/info/guides/${slug}`;
}
