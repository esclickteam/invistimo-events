import type { ContentBenefit, ContentFaq, ContentSection, ContentStep } from "@/components/marketing/PublicContentPage";
import type { GuideGalleryItem, TimelineItem } from "@/components/marketing/RichGuideBlocks";
import { INVITE_DESIGNS, PRODUCT_SHOTS } from "@/lib/seo/productVisuals";

export type EventLanding = {
  slug: string;
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  titleAccent: string;
  lede: string;
  /** Human problem — unique per event type. */
  problem?: string;
  serviceType: string;
  journeyActiveId?: string;
  servicesThatFit: { href: string; label: string; note: string }[];
  benefits: ContentBenefit[];
  steps: ContentStep[];
  sections: ContentSection[];
  faqs: ContentFaq[];
  related: { href: string; label: string }[];
  showcaseSrc: string;
  showcaseAlt: string;
  timeline?: TimelineItem[];
  gallery?: GuideGalleryItem[];
  video?: { src: string; poster?: string; caption?: string };
};

const home = { href: "/", label: "ראשי" };

/**
 * Unique event-type landings — each has original scenarios, not wedding copy with a word swap.
 * Path prefix `/for/` avoids clashing with app `/events/*` (private).
 */
export const EVENT_LANDINGS: EventLanding[] = [
  {
    slug: "bar-mitzvah",
    path: "/for/bar-mitzvah",
    title: "אישורי הגעה לבר מצווה | Invistimo",
    description:
      "איך מנהלים אישורי הגעה לבר מצווה: רשימת משפחה וחברים, קישור אישי, סבבי וואטסאפ, ומספר מגיעים לפני סגירה מול האולם.",
    eyebrow: "בר מצווה",
    h1: "אישורי הגעה לבר מצווה",
    titleAccent: "בלי לרדוף אחרי כל דוד וחבר מהכיתה",
    lede:
      "בבר מצווה הרשימה מתפצלת בין משפחה, חברים מהכיתה והורים. צריך לדעת מי מגיע לפני שסוגרים מנות — בלי עשרות הודעות פרטיות בלי מעקב.",
    problem:
      "החברים מהכיתה לא עונים בקבוצה, הסבים צריכים קישור ברור, והאולם שואל כמה מנות — בלי שיהיה לכם מספר אחד אמין.",
    serviceType: "אישורי הגעה לבר מצווה",
    journeyActiveId: "rsvp",
    showcaseSrc: INVITE_DESIGNS.barMitzvah,
    showcaseAlt: "דשבורד למעקב אישורי הגעה",
    video: {
      src: "/marketing/videos/process-rsvp-statuses.webm",
      poster: PRODUCT_SHOTS.dashboard,
      caption: "סטטוסי אישור משתנים — מעקב לפני סגירה מול האולם",
    },
    gallery: [
      {
        type: "image",
        src: PRODUCT_SHOTS.dashboard,
        device: "laptop",
        alt: "דשבורד",
        caption: "סטטוסים ומספר מגיעים",
      },
      {
        type: "image",
        src: PRODUCT_SHOTS.dashboardMobile,
        device: "phone",
        alt: "מובייל",
        caption: "אותו מעקב בנייד",
      },
    ],
    timeline: [
      {
        when: "אחרי הזמנה מדויקת",
        title: "סבב אישור ראשון",
        text: "משפחה וחברים באותה רשימה — קישור אישי לכל רשומה.",
      },
      {
        when: "אחרי יומיים",
        title: "בדיקה + סבב שני",
        text: "מתקנים מספרים ופונים למי שעדיין פתוח.",
      },
      {
        when: "לפני האולם",
        title: "סגירת מספר",
        text: "מעבירים מגיעים לאולם; הושבה רק אם נרכשה.",
      },
    ],
    servicesThatFit: [
      { href: "/rsvp", label: "אישורי הגעה", note: "קישור אישי + סטטוסים" },
      { href: "/rsvp/whatsapp", label: "וואטסאפ / SMS", note: "שני סבבים בחבילת ההודעות" },
      { href: "/invitations/chatuna", label: "הזמנה דיגיטלית", note: "לפני סבבי האישור" },
      { href: "/seating-explained", label: "הושבה", note: "אם יש שולחנות — כתוספת" },
      { href: "/pricing", label: "חבילות", note: "לפי מספר רשומות" },
    ],
    benefits: [
      {
        title: "רשימה אחת לשני עולמות",
        text: "משפחה וחברים באותה מערכת. כל תשובה משויכת לרשומה — לא לשיחה קבוצתית שבה אי אפשר לדעת מי ענה.",
      },
      {
        title: "מספר מגיעים להורים ולאולם",
        text: "האורח מסמן כמה מגיעים. אתם רואים סכום מתעדכן לפני שסוגרים מול האולם או הקייטרינג.",
      },
      {
        title: "סבב שני למי שלא ענה",
        text: "בחבילת ההודעות — בלי להעתיק שמות ידנית. שיחות הן חבילה נפרדת אם צריך.",
      },
    ],
    steps: [
      { title: "מעלים רשימה", text: "מחלקים לקבוצות אם נוח (משפחה / כיתה / חברים)." },
      { title: "שולחים הזמנה", text: "קישור אישי עם פרטי האירוע." },
      { title: "מתחילים אישורים בזמן", text: "כשהאורחים כבר יודעים על התאריך — לא חודשים מוקדם מדי." },
      { title: "סוגרים מספר", text: "מייצאים לאולם. הושבה רק אם נרכשה התוספת." },
    ],
    sections: [
      {
        heading: "מה שונה בבר מצווה מחתונה",
        paragraphs: [
          "בחתונה הרשימה גדולה ויש שני צדדים פורמליים. בבר מצווה הלחץ הוא אחר: חברים שלא עונים מהר, סבים שצריך להסביר להם את הקישור, והורים שרוצים מספר יציב לפני הדפסת תפריט או הזמנת אולם.",
          "לכן מתחילים מאישורי הגעה ורשימה ברורה. אתר חתונה אישי ו־Save the Date פחות מרכזיים כאן — אלא אם בחרתם אותם במפורש בחשבון.",
        ],
      },
      {
        heading: "תרחיש מעשי",
        paragraphs: [
          "שבועיים לפני: סבב וואטסאפ ראשון לכל הרשימה. אחרי יומיים: בודקים בדשבורד מי פתוח, מתקנים מספרים. סבב שני למי שלא ענה. שבוע לפני: מעבירים מספר מגיעים לאולם. אם יש הושבה — משבצים רק אחרי שיש מספיק תשובות.",
        ],
      },
    ],
    faqs: [
      {
        q: "האם צריך אתר חתונה לבר מצווה?",
        a: "לא חובה. רוב בר המצווה מסתפקים בהזמנה דיגיטלית ואישורי הגעה. אתר אישי זמין כשההרשאה פתוחה בחשבון.",
      },
      {
        q: "מתי שולחים אישורים לבר מצווה?",
        a: "אחרי שההזמנה מדויקת, ועם מספיק זמן לסבב שני לפני סגירת מספר מול האולם. אין יום קבוע במערכת.",
      },
      {
        q: "האם ההושבה כלולה?",
        a: "לא. הושבה היא תוספת במחשבון — רק אם יש שולחנות ורכשתם אותה.",
      },
    ],
    related: [
      { href: "/rsvp", label: "אישורי הגעה לכל אירוע" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורים" },
      { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
      { href: "/for/bat-mitzvah", label: "בת מצווה" },
      { href: "/pricing", label: "חבילות" },
      home,
    ],
  },
  {
    slug: "bat-mitzvah",
    path: "/for/bat-mitzvah",
    title: "אישורי הגעה לבת מצווה | Invistimo",
    description:
      "ניהול אישורי הגעה לבת מצווה עם קישור אישי, מעקב תשובות וסבבי וואטסאפ — למשפחה, חברות והורים.",
    eyebrow: "בת מצווה",
    h1: "אישורי הגעה לבת מצווה",
    titleAccent: "תשובות מסודרות לפני שסוגרים את האולם",
    lede:
      "בבת מצווה הרשימה משלבת משפחה קרובה, חברות מהכיתה והורים. צריך תמונה ברורה של מי מגיע — בלי לאבד תשובות בין וואטסאפ של אמא לוואטסאפ של אבא.",
    problem:
      "שני הורים אוספים תשובות בשני צ׳אטים שונים — ואף אחד לא יודע אם המספר לאולם הוא 120 או 145.",
    serviceType: "אישורי הגעה לבת מצווה",
    showcaseSrc: INVITE_DESIGNS.batMitzvah,
    showcaseAlt: "מעקב סטטוסי הגעה",
    gallery: [
      {
        type: "image",
        src: PRODUCT_SHOTS.dashboard,
        device: "laptop",
        alt: "דשבורד",
        caption: "סטטוסים במקום אחד",
      },
      {
        type: "image",
        src: PRODUCT_SHOTS.weddingGardenMobile,
        device: "phone",
        alt: "הזמנה",
        caption: "הזמנה דיגיטלית לפני האישורים",
      },
    ],
    video: {
      src: "/marketing/videos/process-dashboard-live.webm",
      poster: PRODUCT_SHOTS.dashboard,
      caption: "עדכון הדשבורד אחרי תשובות אורחים",
    },
    servicesThatFit: [
      { href: "/rsvp", label: "אישורי הגעה", note: "סטטוס לכל רשומה" },
      { href: "/invitations/chatuna", label: "הזמנה דיגיטלית", note: "עיצוב + קישור אישי" },
      { href: "/rsvp/whatsapp", label: "סבבי וואטסאפ", note: "כולל סבב שני" },
      { href: "/seating-explained", label: "הושבה", note: "תוספת אופציונלית" },
      { href: "/pricing", label: "מחשבון", note: "לפי רשומות" },
    ],
    benefits: [
      {
        title: "שני הורים — רשימה אחת",
        text: "כל התשובות מתנקזות לאותו דשבורד. אין «אצלי ענו 40 ואצלו 35».",
      },
      {
        title: "הערות מהאורחות",
        text: "אלרגיות, הסעה, או «מגיעה עם אמא» — נשמרות על הרשומה.",
      },
      {
        title: "בלי לחץ מוקדם מדי",
        text: "אפשר לשלוח הזמנה קודם, ולאסוף אישורים כשהתאריך קרוב יותר.",
      },
    ],
    steps: [
      { title: "מאחדים רשימה", text: "משפחה + חברות + הורים — בקובץ אחד במערכת." },
      { title: "שולחים הזמנה", text: "קישור אישי לכל רשומה." },
      { title: "אוספים תשובות", text: "סבב ראשון, בדיקה, סבב שני." },
      { title: "מעבירים מספר", text: "לאולם / קייטרינג לפי המועד שלהם." },
    ],
    sections: [
      {
        heading: "למה לא להסתפק בקבוצת וואטסאפ של הכיתה",
        paragraphs: [
          "בקבוצה קשה לדעת מי באמת אישר, מי הביא אורחת נוספת, ומי רק «לייק». קישור אישי נותן תשובה משויכת ומספר מגיעים.",
          "אם חלק מהאורחות מעדיפות SMS — זה חלק מחבילת ההודעות/תזכורות לפי מה שמוגדר בחבילה, לא ערוץ נפרד שצריך להמציא.",
        ],
      },
    ],
    faqs: [
      {
        q: "יש הבדל בין בר לבת מצווה במערכת?",
        a: "אותם כלים. התוכן והתזמון משתנים לפי האירוע שלכם — לא לפי מגבלת מוצר.",
      },
      {
        q: "אפשר לשלוח רק לחברות בלי המשפחה?",
        a: "כן. שולחים לפי קבוצות או סינון ברשימה — בהתאם לאיך שאתם מארגנים את הרשומות.",
      },
    ],
    related: [
      { href: "/for/bar-mitzvah", label: "בר מצווה" },
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/invitations/chatuna", label: "הזמנות" },
      { href: "/pricing", label: "חבילות" },
    ],
  },
  {
    slug: "brit",
    path: "/for/brit",
    title: "אישורי הגעה לברית ולבריתה | Invistimo",
    description:
      "אישורי הגעה לברית מילה ולבריתה: רשימה קצרה יותר, שליחה מהירה, ומספר מגיעים בלי תהליך חתונה מלא.",
    eyebrow: "ברית / בריתה",
    h1: "אישורי הגעה לברית ולבריתה",
    titleAccent: "רשימה קצרה, תשובות מהירות",
    lede:
      "בברית ובבריתה הזמן קצר והרשימה קטנה יותר מחתונה. צריך לאשר הגעה מהר — בלי לבנות מסע של שבעה שלבים אם אתם לא צריכים אותו.",
    problem:
      "האירוע בעוד ימים ספורים. אין זמן למסע חתונה מלא — רק לדעת מי מגיע וכמה.",
    serviceType: "אישורי הגעה לברית",
    showcaseSrc: INVITE_DESIGNS.brit,
    showcaseAlt: "מעקב אישורים בנייד",
    gallery: [
      {
        type: "image",
        src: PRODUCT_SHOTS.dashboardMobile,
        device: "phone",
        alt: "מובייל",
        caption: "ניהול רשימה קצרה וסטטוסים לברית",
      },
      {
        type: "image",
        src: PRODUCT_SHOTS.dashboard,
        device: "laptop",
        alt: "דשבורד",
        caption: "רשימה קצרה — סטטוסים ברורים",
      },
    ],
    video: {
      src: "/marketing/videos/process-guest-list.webm",
      poster: PRODUCT_SHOTS.dashboard,
      caption: "ניהול רשימה קצרה וסטטוסים לברית",
    },
    servicesThatFit: [
      { href: "/rsvp", label: "אישורי הגעה", note: "ליבת התהליך" },
      { href: "/rsvp/whatsapp", label: "וואטסאפ", note: "שני סבבים" },
      { href: "/invitations/chatuna", label: "הזמנה", note: "אופציונלי אם יש עיצוב" },
      { href: "/pricing", label: "חבילות", note: "לפי רשומות" },
    ],
    benefits: [
      {
        title: "מתאים לרשימה קצרה",
        text: "אין חובה ב־Save the Date או באתר אישי. מתחילים מהזמנה ואישורים.",
      },
      {
        title: "תשובה עם מספר מגיעים",
        text: "חשוב כשמזמינים משפחות שלמות למספר מוגבל של מקומות.",
      },
      {
        title: "סבב שני אם צריך",
        text: "מי שלא ענה נשאר מסומן — שולחים שוב בלי לבנות גיליון חדש.",
      },
    ],
    steps: [
      { title: "מעלים שמות ומספרים", text: "גם אם זו רשימה של עשרות בודדות." },
      { title: "שולחים קישור", text: "הזמנה או ישירות לאישור — לפי מה שהגדרתם." },
      { title: "סוגרים תוך ימים", text: "סבב שני למי שפתוח, ומעבירים מספר למארגנים." },
    ],
    sections: [
      {
        heading: "ברית ובריתה באותו מודל",
        paragraphs: [
          "אותה מערכת משרתת ברית ובריתה. ההבדל הוא בתוכן ההזמנה ובתזמון שלכם — לא בעמוד מוצר נפרד כמעט זהה.",
          "אם האירוע באולם עם שולחנות — אפשר להוסיף הושבה כתוספת. באירוע ביתי קטן לרוב אין צורך.",
        ],
      },
    ],
    faqs: [
      {
        q: "צריך חבילת שיחות לברית?",
        a: "לרוב לא. שני סבבי וואטסאפ מספיקים לרשימה קצרה. שיחות הן אופציה אם נשארו פתוחים חשובים.",
      },
      {
        q: "יש עמוד נפרד לבריתה?",
        a: "לא בכוונה. אותו עמוד מכסה את שני התרחישים כדי למנוע תוכן כפול דק.",
      },
    ],
    related: [
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/for/henna", label: "חינה" },
      { href: "/pricing", label: "חבילות" },
    ],
  },
  {
    slug: "henna",
    path: "/for/henna",
    title: "אישורי הגעה לחינה | Invistimo",
    description:
      "אישורי הגעה לחינה: מוזמנים מקרובים ורחוקים, הזמנה דיגיטלית, סטטוסים, והושבה כשיש שולחנות.",
    eyebrow: "חינה",
    h1: "אישורי הגעה לחינה",
    titleAccent: "גם כשהרשימה מתערבבת בין משפחות",
    lede:
      "בחינה מגיעים אורחים משני צדדים, לפעמים עם ילדים, ולעיתים יש גם הושבה. צריך רשימה אחת ותשובות ברורות לפני הערב.",
    problem:
      "יש חינה וחתונה קרובות — ואם מערבבים אישורים, לא יודעים מי בא לאיזה ערב.",
    serviceType: "אישורי הגעה לחינה",
    showcaseSrc: INVITE_DESIGNS.henna,
    showcaseAlt: "מפת הושבה — רלוונטי לחינה עם שולחנות",
    gallery: [
      {
        type: "image",
        src: PRODUCT_SHOTS.dashboard,
        device: "laptop",
        alt: "אישורים",
        caption: "הודעת WhatsApp ופתיחת הזמנה אישית",
      },
      {
        type: "image",
        src: PRODUCT_SHOTS.seating,
        device: "laptop",
        alt: "הושבה",
        caption: "הושבה כשיש שולחנות — תוספת",
      },
    ],
    video: {
      src: "/marketing/videos/process-whatsapp-channel.webm",
      poster: PRODUCT_SHOTS.seating,
      caption: "הודעת WhatsApp ופתיחת הזמנה אישית",
    },
    timeline: [
      {
        when: "לפני החינה",
        title: "הזמנה + אישורים לערב החינה",
        text: "קישור נפרד — לא אותו סטטוס של החתונה.",
      },
      {
        when: "אם יש שולחנות",
        title: "הושבה",
        text: "רק אחרי מספיק תשובות, ורק אם נרכשה התוספת.",
      },
    ],
    servicesThatFit: [
      { href: "/rsvp", label: "אישורי הגעה", note: "סטטוסים ומספר מגיעים" },
      { href: "/invitations/chatuna", label: "הזמנה", note: "עיצוב לערב" },
      { href: "/seating-explained", label: "הושבה", note: "כשיש שולחנות — תוספת" },
      { href: "/rsvp/save-the-date", label: "Save the Date", note: "אם התאריך ננעל מוקדם" },
      { href: "/pricing", label: "חבילות", note: "לפי רשומות" },
    ],
    benefits: [
      {
        title: "שני צדדים בלי בלאגן",
        text: "אפשר לחלק לקבוצות ברשימה ולראות מי ענה מכל צד.",
      },
      {
        title: "מספר מגיעים כולל ילדים",
        text: "האורח מציין כמה מגיעים — חשוב לתכנון מקום וכיבוד.",
      },
      {
        title: "הושבה כשצריך",
        text: "אם האירוע באולם עם שולחנות — אותה תוספת הושבה כמו באירועים אחרים.",
      },
    ],
    steps: [
      { title: "מרכיבים רשימה משני הצדדים", text: "עם מספרי טלפון תקינים." },
      { title: "שולחים הזמנה", text: "ואחר כך אישורים בזמן הנכון." },
      { title: "משבצים אם יש שולחנות", text: "רק אחרי שיש מספיק תשובות." },
    ],
    sections: [
      {
        heading: "חינה לפני חתונה — איך לא לבלבל את האורחים",
        paragraphs: [
          "אם כבר שלחתם Save the Date לחתונה, ההזמנה לחינה צריכה להיות ברורה: תאריך, מיקום, ומה מאשרים. קישור אישי נפרד לאירוע החינה מונע ערבוב תשובות עם החתונה.",
          "חבילה אחת מיועדת לאירוע אחד במערכת, אלא אם סוכם אחרת — בדקו מול הצוות אם יש שני אירועים קרובים.",
        ],
      },
    ],
    faqs: [
      {
        q: "אפשר להשתמש באותה רשימה של החתונה?",
        a: "אפשר לייצא/להעתיק שמות, אבל האישור צריך להיות לאירוע החינה עצמו — אחרת הסטטוסים מתערבבים.",
      },
      {
        q: "צריך אתר חתונה לחינה?",
        a: "לא חובה. הזמנה + אישורים מספיקים לרוב. אתר אישי רלוונטי יותר לחתונה עצמה.",
      },
    ],
    related: [
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/seating-explained", label: "הושבה" },
      { href: "/for/brit", label: "ברית / בריתה" },
      { href: "/pricing", label: "חבילות" },
    ],
  },
  {
    slug: "birthday",
    path: "/for/birthday",
    title: "הזמנה דיגיטלית ואישורי הגעה ליום הולדת | Invistimo",
    description:
      "יום הולדת ואירוע פרטי: הזמנה דיגיטלית, קישור אישי לאישור הגעה, ומעקב תשובות בלי קבוצות וואטסאפ מבולגנות.",
    eyebrow: "יום הולדת / אירוע פרטי",
    h1: "יום הולדת ואירוע פרטי",
    titleAccent: "יודעים מי מגיע — בלי לנחש מהקבוצה",
    lede:
      "בין אם זה יום הולדת 30, 50 או מסיבה פרטית — רוצים לדעת כמה אנשים באים בלי לאסוף תשובות משלושה צ'אטים.",
    problem:
      "בקבוצת הוואטסאפ יש 40 «אני באה» ואין דרך לדעת מי באמת סימן ומי רק לייק.",
    serviceType: "אישורי הגעה ליום הולדת",
    showcaseSrc: INVITE_DESIGNS.birthday,
    showcaseAlt: "דוגמה ויזואלית להזמנה ואתר",
    gallery: [
      {
        type: "image",
        src: PRODUCT_SHOTS.weddingGardenMobile,
        device: "phone",
        alt: "הזמנה",
        caption: "פתיחת הזמנה דיגיטלית בקישור האישי",
      },
      {
        type: "image",
        src: PRODUCT_SHOTS.dashboardMobile,
        device: "phone",
        alt: "אישור",
        caption: "תשובה משויכת לרשומה",
      },
    ],
    video: {
      src: "/marketing/videos/process-invitation-open.webm",
      poster: PRODUCT_SHOTS.dashboard,
      caption: "פתיחת הזמנה דיגיטלית בקישור האישי",
    },
    servicesThatFit: [
      { href: "/invitations/chatuna", label: "הזמנה דיגיטלית", note: "עיצוב + קישור" },
      { href: "/rsvp", label: "אישורי הגעה", note: "כן/לא + מספר מגיעים" },
      { href: "/rsvp/whatsapp", label: "שליחה בוואטסאפ", note: "סבבים אוטומטיים" },
      { href: "/pricing", label: "חבילות", note: "מתאים גם לרשימות קטנות" },
    ],
    benefits: [
      {
        title: "במקום «מי בא?» בקבוצה",
        text: "כל אורח עונה בקישור שלו. אתם רואים רשימה מסודרת.",
      },
      {
        title: "מתאים גם לימי הולדת עגולים",
        text: "אותו תהליך — ההבדל הוא בעיצוב ההזמנה ובטון, לא במערכת נפרדת.",
      },
      {
        title: "בלי חבילות מיותרות",
        text: "אפשר להתחיל מהודעות בלבד. הושבה וניהול אירוע — רק אם באמת צריך.",
      },
    ],
    steps: [
      { title: "מעלים הזמנה", text: "או משתמשים בעיצוב במערכת." },
      { title: "שולחים קישור אישי", text: "לחברים ולמשפחה." },
      { title: "עוקבים אחרי תשובות", text: "ושולחים סבב שני למי שפתוח." },
    ],
    sections: [
      {
        heading: "יום הולדת עגול מול מסיבה קטנה",
        paragraphs: [
          "ביום הולדת עגול לפעמים יש אולם והושבה — אז מוסיפים תוספת הושבה כמו בכל אירוע עם שולחנות. במסיבה בבית לרוב מספיקים הזמנה ואישורים.",
          "לא יצרנו עמוד נפרד «רק לעגולים» כי התהליך זהה; התוכן כאן מכסה את שני התרחישים.",
        ],
      },
    ],
    faqs: [
      {
        q: "יש חבילה ליום הולדת?",
        a: "החבילות במחשבון לפי רשומות וסוג שירות — לא לפי סוג אירוע. בוחרים כמות וראו את הסכום.",
      },
      {
        q: "צריך שיחות טלפון?",
        a: "למסיבות קטנות לרוב לא. אם נשארו פתוחים חשובים — אפשר חבילת שיחות.",
      },
    ],
    related: [
      { href: "/invitations/chatuna", label: "הזמנות דיגיטליות" },
      { href: "/for/private-party", label: "מסיבה / אירוע פרטי" },
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/pricing", label: "חבילות" },
    ],
  },
  {
    slug: "private-party",
    path: "/for/private-party",
    title: "אישורי הגעה למסיבות ואירועים פרטיים | Invistimo",
    description:
      "מסיבה ואירוע פרטי: ניהול מוזמנים, הזמנה דיגיטלית ואישורי הגעה עם קישור אישי לכל אורח.",
    eyebrow: "מסיבה / אירוע פרטי",
    h1: "מסיבות ואירועים פרטיים",
    titleAccent: "רשימה קצרה, תשובות ברורות",
    lede:
      "אירוע פרטי לא צריך מערכת «חתונה מלאה». צריך לדעת מי מגיע, כמה מגיעים, ולפעמים לשלוח תזכורת לפני הערב.",
    problem:
      "המסיבה לא חתונה — אבל עדיין צריך מספר ברור לפני שמזמינים אוכל ומקום.",
    serviceType: "אישורי הגעה לאירוע פרטי",
    showcaseSrc: INVITE_DESIGNS.birthday,
    showcaseAlt: "דשבורד אישורי הגעה",
    gallery: [
      {
        type: "image",
        src: PRODUCT_SHOTS.dashboard,
        device: "laptop",
        alt: "דשבורד",
        caption: "סטטוסים ומספר מגיעים",
      },
    ],
    video: {
      src: "/marketing/videos/process-sms.webm",
      poster: PRODUCT_SHOTS.dashboard,
      caption: "שליחת הודעות והשלמות לפני האירוע",
    },
    servicesThatFit: [
      { href: "/rsvp", label: "אישורי הגעה", note: "הבסיס" },
      { href: "/invitations/chatuna", label: "הזמנה", note: "אופציונלי" },
      { href: "/rsvp/whatsapp", label: "וואטסאפ + תזכורת", note: "לפי חבילה" },
      { href: "/pricing", label: "חבילות", note: "לפי רשומות" },
    ],
    benefits: [
      {
        title: "קל לרשימות קטנות־בינוניות",
        text: "מעלים שמות, שולחים, רואים מי ענה.",
      },
      {
        title: "תזכורת לפני המועד",
        text: "בחבילת ההודעות — SMS לקראת האירוע (כולל מספר שולחן אם יש הושבה).",
      },
      {
        title: "בלי לחייב את כל התוספות",
        text: "הושבה, אתר וניהול אירוע — רק אם רלוונטי ורכישתם.",
      },
    ],
    steps: [
      { title: "בונים רשימה", text: "טלפונים תקינים." },
      { title: "שולחים", text: "הזמנה ו/או אישור." },
      { title: "סוגרים", text: "סבב שני ומספר סופי." },
    ],
    sections: [
      {
        heading: "מתי עוברים מחובבני למסודר",
        paragraphs: [
          "אם כבר יש יותר מ־30–40 רשומות, או אם האולם מבקש מספר — עדיף קישור אישי על פני סקר בקבוצה. זה בדיוק המצב שבו Invistimo חוסכת בלבול, בלי להכריח אתכם לקנות חבילת שיחות.",
        ],
      },
    ],
    faqs: [
      {
        q: "זה מתאים גם לאירוע משפחתי קטן?",
        a: "כן. המחשבון לפי רשומות — גם לרשימות קצרות.",
      },
      {
        q: "צריך Save the Date למסיבה?",
        a: "לרוב לא. אם התאריך ננעל חודשים מראש — אפשר כשהאפשרות פתוחה בחשבון. אחרת מספיקים הזמנה ואישורים.",
      },
      {
        q: "מתי שולחים תזכורת?",
        a: "לקראת המועד, אחרי שסגרתם כמה שאפשר מהפתוחים. תזכורת SMS לא מחליפה סבב אישור.",
      },
    ],
    related: [
      { href: "/for/birthday", label: "יום הולדת" },
      { href: "/for/corporate", label: "אירוע חברה" },
      { href: "/rsvp", label: "אישורי הגעה" },
    ],
  },
  {
    slug: "corporate",
    path: "/for/corporate",
    title: "אישורי הגעה לאירועי חברה וכנסים | Invistimo",
    description:
      "אירועי חברה וכנסים: רשימת מוזמנים, סטטוסי הגעה בזמן אמת, תזכורות, ואפשרות לניהול אירוע לצד האישורים.",
    eyebrow: "אירוע חברה / כנס",
    h1: "אישורי הגעה לאירועי חברה וכנסים",
    titleAccent: "תמונת מצב להנהלה — לא גיליון שמתעדכן באיחור",
    lede:
      "באירוע עסקי צריך לדעת כמה נרשמו, מי אישר, ומי עדיין פתוח — כדי לסגור קייטרינג, תגי שם והושבה באולם הכנסים.",
    problem:
      "ה־HR שולח הזמנה במייל, המפיק סופר באקסל, ואתם צריכים מספר לקייטרינג עד מחר בבוקר.",
    serviceType: "אישורי הגעה לאירוע חברה",
    journeyActiveId: "event-day",
    gallery: [
      {
        type: "image",
        src: PRODUCT_SHOTS.dashboard,
        device: "laptop",
        alt: "סטטוסים",
        caption: "ניהול רשימת מוזמנים לאירוע חברה",
      },
      {
        type: "image",
        src: PRODUCT_SHOTS.eventMgmt,
        device: "laptop",
        alt: "ניהול",
        caption: "ניהול אירוע כתוספת — משימות ותקציב",
      },
    ],
    video: {
      src: "/marketing/videos/process-guest-list.webm",
      poster: PRODUCT_SHOTS.dashboard,
      caption: "ניהול רשימת מוזמנים לאירוע חברה",
    },
    timeline: [
      {
        when: "לפני האירוע",
        title: "רשימה + הזמנה/קישור",
        text: "מוזמנים ארגוניים עם סטטוס לכל רשומה.",
      },
      {
        when: "סגירה מול ספקים",
        title: "מספר מגיעים",
        text: "מייצאים מהדשבורד — לא מהזיכרון.",
      },
      {
        when: "אם רלוונטי",
        title: "הושבה / ניהול אירוע",
        text: "תוספות במחשבון — לא חובה לכל כנס.",
      },
    ],
    showcaseSrc: INVITE_DESIGNS.corporate,
    showcaseAlt: "מסך ניהול אירוע",
    servicesThatFit: [
      { href: "/rsvp", label: "אישורי הגעה", note: "סטטוסים בזמן אמת" },
      { href: "/event-management", label: "ניהול אירוע", note: "משימות ותקציב — תוספת/מוצר נפרד" },
      { href: "/seating-explained", label: "הושבה", note: "לאולמות כנסים עם שולחנות" },
      { href: "/rsvp/whatsapp", label: "הודעות ותזכורות", note: "לפי חבילה" },
      { href: "/pricing", label: "חבילות", note: "שקיפות לפי רשומות" },
    ],
    benefits: [
      {
        title: "סטטוס לכל מוזמן",
        text: "מגיע / לא מגיע / פתוח — לייצוא או להצגה למנהלים.",
      },
      {
        title: "תזכורות לפני המועד",
        text: "מפחיתות no-show לעומת הזמנה חד־פעמית במייל בלבד.",
      },
      {
        title: "ניהול אירוע כשצריך",
        text: "משימות, ספקים ותקציב — במערכת ניהול האירוע, לא חובה לכל כנס.",
      },
    ],
    steps: [
      { title: "מייבאים רשימה", text: "מאקסל או הקלדה — שמות ומספרים/מייל לפי מה שאתם עובדים." },
      { title: "שולחים אישור", text: "קישור אישי לכל רשומה." },
      { title: "מנטרים פתוחים", text: "סבב שני או שיחות לפי החבילה." },
      { title: "סוגרים לוגיסטיקה", text: "מספרים לקייטרינג, תגים, הושבה." },
    ],
    sections: [
      {
        heading: "כנס מול ערב חברה",
        paragraphs: [
          "בכנס חשובים תגי שם ומעקב הרשמה. בערב חברה חשובים יותר מספר מגיעים והושבה. אותם כלי RSVP משרתים את שניהם; ניהול אירוע מלא מוסיפים כשיש ספקים ומשימות רבות.",
          "Invistimo לא מחליפה מערכת כנסים עם סשנים מקבילים — היא מנהלת מוזמנים ואישורי הגעה (ואופציות נלוות) לאירוע העסקי שלכם.",
        ],
      },
    ],
    faqs: [
      {
        q: "אפשר בלי וואטסאפ?",
        a: "האורח מאשר בקישור בדפדפן. ערוץ השליחה (וואטסאפ/SMS/שיחה) תלוי בחבילה. בדקו במחשבון ובצוות מה פתוח אצלכם.",
      },
      {
        q: "יש חבילה עסקית נפרדת?",
        a: "התמחור במחשבון לפי רשומות וסוג חבילה. לצרכים מיוחדים — יצירת קשר.",
      },
    ],
    related: [
      { href: "/event-management", label: "ניהול אירוע" },
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/seating-explained", label: "הושבה" },
      { href: "/contact", label: "צור קשר" },
      { href: "/pricing", label: "חבילות" },
    ],
  },
];

export function getEventLanding(slug: string) {
  return EVENT_LANDINGS.find((e) => e.slug === slug);
}

export function allEventLandingSlugs() {
  return EVENT_LANDINGS.map((e) => e.slug);
}
