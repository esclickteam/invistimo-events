import type {
  ContentBenefit,
  ContentFaq,
  ContentLink,
  ContentMedia,
  ContentSection,
  ContentStep,
} from "@/components/marketing/PublicContentPage";
import type {
  GuideGalleryItem,
  MessageExample,
  Mistake,
  TipBox,
  TimelineItem,
} from "@/components/marketing/RichGuideBlocks";
import { PRODUCT_SHOTS } from "@/lib/seo/productVisuals";

export type Guide = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  titleAccent?: string;
  lede: string;
  /** Human problem framing — shown before the deep dive. */
  problem?: string;
  sections: ContentSection[];
  faqs: ContentFaq[];
  benefits?: ContentBenefit[];
  steps?: ContentStep[];
  media?: ContentMedia;
  showEventTypes?: boolean;
  related?: ContentLink[];
  ctaTitle?: string;
  ctaLede?: string;
  primaryCta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  timeline?: TimelineItem[];
  tips?: TipBox[];
  messageExamples?: MessageExample[];
  mistakes?: Mistake[];
  gallery?: GuideGalleryItem[];
  video?: { src: string; poster?: string; caption?: string };
};

const SHOT = PRODUCT_SHOTS;

export const GUIDES: Guide[] = [
  {
    slug: "when-to-send-rsvp",
    title: "מתי כדאי להתחיל לשלוח אישורי הגעה?",
    description:
      "לוח זמנים מעשי לחתונה ולאירועים: מתי Save the Date, מתי הזמנה, מתי מתחילים אישורי הגעה, ומתי סוגרים מול האולם.",
    h1: "מתי מתחילים אישורי הגעה?",
    titleAccent: "לא חודשים מראש — ובלי יום קסם",
    lede:
      "רוב הזוגות שולחים מוקדם מדי או מאוחר מדי. המועד הנכון הוא זה שמשאיר זמן לסבב שני לפני שהאולם דורש מספר מנות — לא «שישים יום לפני» ככלל קבוע.",
    problem:
      "שלחתם הזמנות לפני חודשיים, אבל רוב האורחים עדיין לא יודעים אם יוכלו להגיע? זה בדיוק ההבדל בין הודעה מוקדמת לבין אישורי הגעה. אפשר להודיע על האירוע מראש, ולבקש תשובה רק כשהתאריך מתקרב.",
    media: {
      type: "image",
      src: SHOT.dashboard,
      alt: "דשבורד דמו עם מעקב סטטוסי הגעה",
      variant: "wide",
      caption: "בדשבורד רואים מי ענה ומי עדיין פתוח — בסיס לסבב השני",
    },
    video: {
      src: "/marketing/videos/demo-try-dashboard.webm",
      poster: SHOT.dashboard,
      caption: "הדגמה קצרה: מעקב תשובות בדמו (נתונים פיקטיביים)",
    },
    gallery: [
      {
        type: "image",
        src: SHOT.dashboard,
        alt: "דשבורד אישורי הגעה בדמו",
        device: "laptop",
        caption: "סטטוסים ומספר מגיעים — דמו",
      },
      {
        type: "image",
        src: SHOT.dashboardMobile,
        alt: "מעקב בנייד",
        device: "phone",
        caption: "אותו מעקב בנייד",
      },
    ],
    timeline: [
      {
        when: "3–6 חודשים לפני (כשהתאריך יציב)",
        title: "Save the Date",
        text: "הודעת וואטסאפ אחת שמודיעה שהתאריך נשמר — בלי לבקש מגיע/לא מגיע. רק אם האפשרות פתוחה בחשבון.",
      },
      {
        when: "אחרי שיש פרטים מדויקים",
        title: "הזמנה דיגיטלית / אתר חתונה",
        text: "שולחים קישור עם תאריך, שעה ומיקום נכונים. אפשר גם אתר חתונה אישי אם ההרשאה פתוחה — הוא לא מחליף את סבבי האישור.",
      },
      {
        when: "בדרך כלל סביב שבועיים לפני (לפי האולם)",
        title: "סבב אישור ראשון",
        text: "מתחילים לאסוף תשובות בקישור אישי. בחבילת ההודעות: סבב וואטסאפ ראשון לכל הרשימה הרלוונטית.",
      },
      {
        when: "כמה ימים אחרי הסבב הראשון",
        title: "סבב שני + טיפול בפתוחים",
        text: "מי שלא ענה נשאר מסומן בדשבורד. סבב שני כלול בחבילת ההודעות. שיחות — רק אם נרכשה חבילת שיחות.",
      },
      {
        when: "לפני דד־ליין האולם",
        title: "סגירת מספר + הושבה",
        text: "מעבירים מספר מגיעים לאולם. אם נרכשה תוספת הושבה — משבצים אחרי שיש מספיק תשובות יציבות.",
      },
      {
        when: "לקראת ולמחרת האירוע",
        title: "תזכורת SMS והודעת תודה",
        text: "תזכורת לפני המועד (כולל מספר שולחן כשיש הושבה), ותודה ב־SMS אחרי — בחבילת ההודעות.",
      },
    ],
    steps: [
      { title: "סוגרים פרטים בהזמנה", text: "תאריך, שעה, מיקום — בלי לשלוח אישורים על טיוטה." },
      { title: "בודקים מול האולם", text: "מתי הם צריכים מספר מנות סופי." },
      { title: "שולחים סבב ראשון", text: "עם מרווח לסבב שני לפני הדד־ליין." },
      { title: "סוגרים פתוחים", text: "סבב שני, שיחות אם נרכשו, או עדכון ידני מתשובות בטלפון." },
    ],
    messageExamples: [
      {
        label: "Save the Date (רעיון ניסוח)",
        body: "שמרו את התאריך 💙\nאנחנו מתחתנים ב־12.6 — פרטים מלאים ואישור הגעה יישלחו בהמשך.",
      },
      {
        label: "פתיחת סבב אישור",
        body: "היי, מצורף קישור אישי לאישור הגעה לחתונה שלנו.\nנשמח לתשובה עד סוף השבוע — זה עוזר לנו מול האולם.",
      },
    ],
    mistakes: [
      {
        wrong: "לבקש «מגיע / לא מגיע» כבר ב־Save the Date, חודשים לפני.",
        right: "Save the Date רק שומר תאריך. אישורי הגעה כשהזמן נכון ויש מרווח לסבב שני.",
      },
      {
        wrong: "לשלוח אישורים לפני שהמיקום בהזמנה סופי.",
        right: "קודם מתייצבים הפרטים בהזמנה — אחר כך אוספים תשובות.",
      },
    ],
    tips: [
      {
        tone: "tip",
        title: "שבועיים זה נקודת התחלה — לא חוק",
        text: "אם האולם סוגר מנות מוקדם יותר, מקדימים. אם הרשימה קטנה (ברית), אפשר חלון קצר יותר.",
      },
      {
        tone: "warning",
        title: "תזכורת SMS ≠ סבב אישור",
        text: "התזכורת מזכירה מועד. היא לא מחליפה את מי שעדיין מסומן «פתוח» בדשבורד.",
      },
    ],
    sections: [
      {
        heading: "איך בוחרים מועד בפועל",
        paragraphs: [
          "פותחים לוח: דד־ליין האולם → סופרים אחורה שבוע לסבב שני ובדיקות → שם נוחת סבב ראשון. אם נשארו פתוחים חשובים, חבילת שיחות או טלפונים ידניים נכנסים לפני הסגירה.",
          "בבר מצווה ובאירוע חברה אותו עיקרון: הדד־ליין של הספק קובע, לא מספר ימים קבוע מהמערכת.",
        ],
        imageSrc: SHOT.dashboard,
        imageAlt: "דשבורד דמו למעקב פתוחים",
        imageDevice: "laptop",
      },
      {
        heading: "מה רואים אחרי ששולחים",
        paragraphs: [
          "כל תשובה משויכת לרשומה. רואים כמה מגיעים סומנו, מי עדיין פתוח, והערות כמו אלרגיה או הסעה. מכאן מחליטים מי נכנס לסבב השני.",
        ],
      },
    ],
    faqs: [
      {
        q: "האם המערכת שולחת לבד בתאריך קבוע?",
        a: "לא. אתם קובעים מתי יוצא כל סבב לפי מה שמוגדר בחשבון.",
      },
      {
        q: "מתי שולחים Save the Date?",
        a: "כשהתאריך יציב ולפני איסוף האישורים — ורק אם האפשרות פתוחה בחשבון.",
      },
      {
        q: "מה אם האולם מקדים את סגירת המנות?",
        a: "מקדימים את סבב האישור ומשאירים מרווח לסבב שני או לשיחות.",
      },
    ],
    related: [
      { href: "/info/guides/when-to-send-save-the-date", label: "מתי Save the Date" },
      { href: "/info/guides/how-many-rsvp-rounds", label: "כמה סבבים" },
      { href: "/info/guides/guests-who-dont-reply", label: "מי שלא עונה" },
      { href: "/rsvp", label: "עמוד אישורי הגעה" },
      { href: "/try", label: "דמו" },
    ],
    primaryCta: { href: "/try", label: "לצפייה בדמו" },
    secondaryCta: { href: "/rsvp", label: "לעמוד אישורי הגעה" },
    ctaTitle: "רוצים לראות איך נראים הפתוחים בדשבורד?",
    ctaLede: "בדמו תעברו על אירוע פיקטיבי בלי לשלוח הודעות אמיתיות.",
  },
  {
    slug: "seating-plan",
    title: "איך מכינים סידורי הושבה לחתונה?",
    description:
      "תהליך הושבה מעשי: סקיצת אולם, שולחנות, שיבוץ, תפוסה, אורחים לא משובצים ושינויי רגע אחרון — עם צילומים מהדמו.",
    h1: "איך עושים סידורי הושבה?",
    titleAccent: "ממפה ועד מספר שולחן",
    lede:
      "במקום לנהל רשימות באקסל ולגלות ברגע האחרון ששולחן התמלא — רואים מפה, תפוסה ואורחים שלא שובצו במקום אחד. ההושבה היא תוספת במחשבון.",
    problem:
      "יש לכם כבר אישורי הגעה, אבל השיבוץ תקוע בגיליון: מי ליד מי, איזה שולחן מלא, ומה עושים עם דוד שהודיע אתמול שהוא כן מגיע. המפה הדיגיטלית נועדה בדיוק לרגע הזה.",
    media: {
      type: "image",
      src: SHOT.seating,
      alt: "מפת הושבה בדמו",
      variant: "wide",
      caption: "מפת שולחנות בדמו — נתונים פיקטיביים",
    },
    video: {
      src: "/marketing/videos/demo-try-seating.webm",
      poster: SHOT.seating,
      caption: "הדגמת מסך ההושבה בדמו",
    },
    gallery: [
      {
        type: "image",
        src: SHOT.seating,
        alt: "מפת שולחנות",
        device: "laptop",
        caption: "סקיצה, שולחנות ותפוסה",
      },
      {
        type: "image",
        src: SHOT.seatingMobile,
        alt: "הושבה בנייד",
        device: "phone",
        caption: "תצוגת מובייל",
      },
      {
        type: "video",
        src: "/videos/tablesit.mp4",
        poster: SHOT.seating,
        caption: "שיבוץ לשולחנות — קליפ מוצר",
      },
      {
        type: "video",
        src: "/videos/smartsit.mp4",
        poster: SHOT.seating,
        caption: "חלוקה לפי קבוצות ואז תיקון ידני",
      },
    ],
    timeline: [
      {
        when: "אחרי שיש מספיק תשובות",
        title: "לא משבצים מוקדם מדי",
        text: "מי שלא מגיע לא תופס כיסא. מחכים ליציבות סבירה ברשימה לפני שממלאים מפה.",
      },
      {
        when: "שלב ראשון במפה",
        title: "סקיצה ושולחנות",
        text: "מעלים סקיצת אולם, ממקמים שולחנות ומגדירים קיבולת לכל שולחן.",
      },
      {
        when: "שלב שני",
        title: "שיבוץ",
        text: "ידנית מהמפה או מהרשימה, או חלוקה ראשונית לפי קבוצות ואז תיקונים.",
      },
      {
        when: "לפני התזכורת",
        title: "הודעת מספר שולחן",
        text: "אחרי שיבוץ אפשר לשלוח מספר שולחן; בתזכורת ה־SMS הוא יכול להופיע כשיש הושבה.",
      },
    ],
    steps: [
      { title: "מעלים סקיצה", text: "מפת האולם כרקע לעבודה." },
      { title: "ממקמים שולחנות", text: "עם מספר מקומות לכל שולחן." },
      { title: "משבצים", text: "מהמפה או מהרשימה; בודקים מי נשאר בלי שולחן." },
      { title: "מתקנים ברגע האחרון", text: "מעבירים אורח, פותחים מקום, מעדכנים הודעה אם כבר נשלח מספר ישן." },
    ],
    mistakes: [
      {
        wrong: "לשבץ את כולם לפני שרוב הרשימה ענתה.",
        right: "משבצים אחרי שיש מספיק אישורים — אחרת המפה זזה כל יום.",
      },
      {
        wrong: "להניח שהושבה כלולה בכל חבילה.",
        right: "הושבה היא תוספת במחשבון. בלי התוספת אין להניח שהמפה פתוחה.",
      },
    ],
    tips: [
      {
        tone: "example",
        title: "דוגמה פיקטיבית",
        text: "אירוע דמו עם כ־10 שולחנות: רואים תפוסה כמו 8/10, רשימת לא־משובצים בצד, והעברה משולחן לשולחן בלי לבנות גיליון חדש.",
      },
      {
        tone: "tip",
        title: "אורחים בלי אישור מראש",
        text: "מוסיפים/מעדכנים ברשימה ומשבצים לשולחן עם מקום. המערכת לא מנחשת הגעה בשבילכם.",
      },
    ],
    sections: [
      {
        heading: "מתשובות להושבה",
        paragraphs: [
          "הדשבורד מראה מי מגיע וכמה. מהרשימה הזו נכנסים למפת השולחנות. קבוצות (משפחה / חברים / עבודה) עוזרות לחלוקה ראשונית — לא סוגרות את הסידור.",
        ],
        imageSrc: SHOT.dashboard,
        imageAlt: "דשבורד לפני הושבה",
        imageDevice: "laptop",
      },
      {
        heading: "יום האירוע",
        paragraphs: [
          "אפשר לעדכן שיבוצים כל עוד יש גישה לחשבון. כלי כניסה/תפעול תלויים בחבילה ובתוספות — לא בכל חבילה אוטומטית.",
        ],
      },
    ],
    faqs: [
      {
        q: "איך יודעים כמה מקומות פנויים נשארו?",
        a: "במפה ובסיכומי השולחנות רואים תפוסה מול קיבולת. לא־משובצים נשארים ברשימה בצד.",
      },
      {
        q: "אפשר לשנות אחרי שכבר שיבצתם?",
        a: "כן. מעבירים אורח או מעדכנים מהרשימה. אם נשלח מספר ישן — שולחים שוב למי שהשתנה.",
      },
      {
        q: "האם זה רק לחתונה?",
        a: "לא. אותו כלי לחינה, בר מצווה או אירוע חברה עם שולחנות — כשהתוספת נרכשה.",
      },
    ],
    related: [
      { href: "/seating-explained", label: "עמוד סידורי הושבה" },
      { href: "/info/guides/table-number-message", label: "הודעת מספר שולחן" },
      { href: "/try", label: "דמו הושבה" },
      { href: "/pricing", label: "תוספת במחשבון" },
    ],
    primaryCta: { href: "/try/dashboard/seating", label: "לפתיחת דמו ההושבה" },
    secondaryCta: { href: "/seating-explained", label: "לעמוד ההושבה" },
  },
  {
    slug: "save-the-date-vs-invitation",
    title: "מה ההבדל בין Save the Date להזמנה דיגיטלית?",
    description:
      "Save the Date שומר תאריך בלי לאסוף תשובה. ההזמנה והקישור האישי הם השלב שבו האורח רואה פרטים ומאשר הגעה.",
    h1: "Save the Date מול הזמנה ואישור",
    titleAccent: "שלושה שלבים — לא אותו דבר",
    lede:
      "בלבול בין שלושת השלבים גורם לאורחים לענות מוקדם מדי או לא לענות בכלל. הנה ההפרדה כמו שהיא במערכת.",
    problem:
      "שלחתם «שמרו את התאריך» וביקשתם גם אישור הגעה באותה הודעה? חצי מהרשימה מתעלמת, וחצי עונה תשובה שתשתנה בעוד חודשיים.",
    timeline: [
      {
        when: "שלב א׳",
        title: "Save the Date",
        text: "וואטסאפ חד־פעמי כשהאפשרות פתוחה. לא אוסף מגיע/לא מגיע. לא נספר כסבב אישור.",
      },
      {
        when: "שלב ב׳",
        title: "הזמנה דיגיטלית / אתר",
        text: "פרטים מלאים בקישור. אפשר לערוך כל עוד האירוע פעיל. אתר חתונה הוא מוצר נפרד.",
      },
      {
        when: "שלב ג׳",
        title: "אישורי הגעה",
        text: "שני סבבי וואטסאפ בחבילת ההודעות + קישור אישי לתשובה.",
      },
    ],
    messageExamples: [
      {
        label: "Save the Date",
        body: "שמרו את ה־18.9 💍\nהזמנה מלאה תישלח בהמשך — בינתיים רק התאריך.",
      },
      {
        label: "הזמנה + בקשת אישור",
        body: "ההזמנה שלנו מוכנה.\nבקישור האישי תראו את הפרטים ותוכלו לאשר הגעה.",
      },
    ],
    mistakes: [
      {
        wrong: "לדרוש תשובה ב־Save the Date.",
        right: "קודם שומרים תאריך; תשובה רק בסבבי האישור.",
      },
    ],
    gallery: [
      {
        type: "image",
        src: SHOT.weddingEternalMobile,
        alt: "אתר חתונה בדמו",
        device: "phone",
        caption: "אתר חתונה (דמו) — משלים הזמנה, לא מחליף אישור",
      },
      {
        type: "image",
        src: SHOT.dashboardMobile,
        alt: "סטטוסי אישור",
        device: "phone",
        caption: "אישור הגעה — תשובה משויכת לרשומה",
      },
    ],
    steps: [
      { title: "נועלים תאריך", text: "בלי לשנות כל שבוע." },
      { title: "שולחים Save the Date", text: "אם פתוח בחשבון." },
      { title: "מכינים הזמנה", text: "פרטים מדויקים." },
      { title: "אוספים אישורים", text: "בזמן הנכון מול האולם." },
    ],
    sections: [
      {
        heading: "למה לא לאחד הכל להודעה אחת",
        paragraphs: [
          "אורחים שעונים חודשים מראש משנים תשובה. אורחים שמקבלים «רק תאריך» לא מצפים למלא מספר מגיעים. הפרדת השלבים מפחיתה רעש בדשבורד.",
        ],
      },
    ],
    tips: [
      {
        tone: "tip",
        title: "אתר חתונה איפה נכנס",
        text: "מידע עשיר לאורחים. לא מחליף שני סבבי וואטסאפ לאישור.",
      },
    ],
    faqs: [
      {
        q: "האם Save the Date כלול בחבילת ההודעות כשורה?",
        a: "הוא לא מופיע כשורה בחבילת ההודעות הבסיסית. זמין כשהאפשרות פתוחה בחשבון.",
      },
      {
        q: "אפשר בלי Save the Date?",
        a: "כן. בברית או במסיבה קטנה לרוב עוברים ישר להזמנה ואישורים.",
      },
    ],
    related: [
      { href: "/rsvp/save-the-date", label: "עמוד Save the Date" },
      { href: "/invitations/chatuna", label: "הזמנות דיגיטליות" },
      { href: "/info/guides/when-to-send-save-the-date", label: "מתי שולחים STD" },
      { href: "/wedding-website", label: "אתר חתונה" },
    ],
    primaryCta: { href: "/rsvp/save-the-date", label: "ל־Save the Date" },
    secondaryCta: { href: "/invitations/chatuna", label: "להזמנה דיגיטלית" },
  },
  {
    slug: "guests-who-dont-reply",
    title: "מה עושים עם אורחים שלא עונים?",
    description:
      "איך מטפלים באורחים שלא אישרו הגעה: סבב שני בוואטסאפ, שיחות לפי חבילה, ועדכון ידני — בלי לרדוף אחרי כולם בטלפון אישי.",
    h1: "אורחים שלא עונים — מה עושים?",
    titleAccent: "מהדשבורד, לא מהזיכרון",
    lede:
      "מי שלא ענה נשאר מסומן. סבב וואטסאפ שני כלול בחבילת ההודעות; שיחות הן חבילה נפרדת. תזכורת SMS לא סוגרת פתוחים.",
    problem:
      "נשארו 40 פתוחים שבוע לפני האולם, ואתם כבר לא זוכרים למי כתבתם בפרטי. הדשבורד קיים כדי שלא תנהלו את זה בראש.",
    media: {
      type: "image",
      src: SHOT.dashboard,
      alt: "דשבורד עם פתוחים",
      variant: "wide",
    },
    gallery: [
      {
        type: "image",
        src: SHOT.dashboard,
        device: "laptop",
        alt: "מעקב פתוחים",
        caption: "מסננים מי עדיין בלי תשובה",
      },
      {
        type: "image",
        src: SHOT.dashboardMobile,
        device: "phone",
        alt: "פתוחים בנייד",
        caption: "אותה רשימה בנייד",
      },
    ],
    video: {
      src: "/marketing/videos/demo-try-dashboard.webm",
      poster: SHOT.dashboard,
      caption: "איך נראה מעקב התשובות בדמו",
    },
    steps: [
      { title: "נותנים זמן לסבב ראשון", text: "לא שולחים סבב שני אחרי שעתיים." },
      { title: "מסננים פתוחים", text: "בדשבורד — כולל תיקון מספרים שגויים." },
      { title: "סבב שני", text: "בחבילת ההודעות." },
      { title: "שיחות או עדכון ידני", text: "לפי חבילה / טלפון אישי קצר לפתוחים חשובים." },
    ],
    tips: [
      {
        tone: "warning",
        title: "אל תסמכו על תזכורת במקום סבב",
        text: "תזכורת SMS מזכירה מועד. מי שלא אישר נשאר פתוח עד שעונים או מעדכנים ידנית.",
      },
    ],
    mistakes: [
      {
        wrong: "לשלוח חמישה וואטסאפים זהים לכל הרשימה.",
        right: "שני סבבים מסודרים + מיקוד בפתוחים (ושיחות אם נרכשו).",
      },
    ],
    sections: [
      {
        heading: "סדר עדיפויות בשבוע האחרון",
        paragraphs: [
          "קודם פתוחים שמשפיעים על מנות או על שולחנות מלאים. אחר כך שאר הרשימה. תשובה שהגיעה בטלפון — מעדכנים על הרשומה כדי שהמספר לאולם יהיה אחד.",
        ],
      },
    ],
    faqs: [
      {
        q: "כמה סבבי שיחה יש?",
        a: "לפי חבילה: מוקלטת / אנושית / משולבת — כמפורט במחשבון.",
      },
      {
        q: "איפה עמוד השיחות?",
        a: "/rsvp/calls",
      },
    ],
    related: [
      { href: "/rsvp/calls", label: "אישורי הגעה בשיחות" },
      { href: "/info/guides/how-many-rsvp-rounds", label: "כמה סבבים" },
      { href: "/rsvp/whatsapp", label: "וואטסאפ" },
      { href: "/try", label: "דמו" },
    ],
    primaryCta: { href: "/try", label: "לראות פתוחים בדמו" },
    secondaryCta: { href: "/rsvp/calls", label: "לחבילות שיחה" },
  },
  {
    slug: "how-many-rsvp-rounds",
    title: "כמה סבבי אישורי הגעה כדאי לבצע?",
    description:
      "בחבילת ההודעות שני סבבי וואטסאפ. חבילות שיחה מוסיפות סבבים למי שלא ענה. מדריך בלי מספרים מומצאים.",
    h1: "כמה סבבי אישורי הגעה?",
    titleAccent: "שניים בוואטסאפ — ואז לפי הצורך",
    lede:
      "שני סבבי וואטסאפ הם הבסיס. מעבר לזה — שיחות לפי חבילה, לא «עוד וואטסאפ אינסופי».",
    problem:
      "אחרי סבב שלישי באותו ניסוח האורחים כבר לא פותחים. עדיף שני סבבים ברורים וטיפול ממוקד במי שנשאר פתוח.",
    timeline: [
      { when: "יום 1", title: "סבב וואטסאפ ראשון", text: "לכל הרשימה הרלוונטית." },
      { when: "אחרי יומיים–כמה ימים", title: "בדיקת דשבורד", text: "תיקון מספרים, סימון מי ענה." },
      { when: "סבב שני", title: "רק לפתוחים", text: "כלול בחבילת ההודעות." },
      { when: "לפי חבילה", title: "שיחות", text: "מוקלטת / אנושית / משולבת לפתוחים חשובים." },
    ],
    gallery: [
      {
        type: "image",
        src: SHOT.dashboard,
        device: "laptop",
        alt: "דשבורד",
        caption: "אחרי סבב ראשון — רואים מי נשאר",
      },
    ],
    steps: [
      { title: "סבב ראשון", text: "לכל הרשימה." },
      { title: "הפסקה ובדיקה", text: "לא מיד סבב שני." },
      { title: "סבב שני", text: "לפתוחים." },
      { title: "שיחות אם צריך", text: "לפי מה שנרכש." },
    ],
    tips: [
      {
        tone: "tip",
        title: "ברית ≠ חתונה של 400 איש",
        text: "ברשימה קצרה לעיתים מספיק סבב וחצי. בחתונה גדולה כמעט תמיד צריך את השני.",
      },
    ],
    sections: [
      {
        heading: "מה כלול במחשבון",
        paragraphs: [
          "הודעות בלבד: שני סבבי וואטסאפ + תזכורת ותודה ב־SMS. חבילות השיחה מוסיפות סבבי שיחה על אותו בסיס.",
        ],
      },
    ],
    faqs: [
      {
        q: "האם תזכורת נספרת כסבב?",
        a: "לא.",
      },
    ],
    related: [
      { href: "/rsvp/whatsapp", label: "וואטסאפ" },
      { href: "/rsvp/calls", label: "שיחות" },
      { href: "/pricing", label: "מחשבון" },
      { href: "/info/guides/guests-who-dont-reply", label: "מי שלא עונה" },
    ],
    primaryCta: { href: "/pricing", label: "להשוואת חבילות" },
    secondaryCta: { href: "/try", label: "לדמו" },
  },
  {
    slug: "guest-list",
    title: "איך בונים רשימת מוזמנים?",
    description:
      "בניית רשימת מוזמנים במערכת: שם, טלפון, קבוצות, סטטוס ומספר מגיעים — ממנה יוצאות ההודעות ואליה חוזרות התשובות.",
    h1: "איך בונים רשימת מוזמנים?",
    titleAccent: "רשימה אחת — לא חמישה אקסלים",
    lede:
      "רשימה טובה היא כזו שאפשר לשלוח ממנה הודעה ולראות תשובה על אותה שורה. בלי «גרסה סופית_אמיתית2».",
    problem:
      "אצלכם בקובץ אחד, אצל בן/בת הזוג באחר, ובוואטסאפ של אמא יש עוד שמות. ביום סגירת המנות אף אחד לא יודע מה המספר.",
    media: {
      type: "image",
      src: SHOT.dashboard,
      alt: "רשימה בדשבורד",
      variant: "wide",
    },
    gallery: [
      {
        type: "image",
        src: SHOT.dashboard,
        device: "laptop",
        alt: "רשימת מוזמנים",
        caption: "סטטוס ומספר מגיעים על אותה רשומה",
      },
    ],
    steps: [
      { title: "אוספים שמות ומספרים", text: "טלפון תקין לכל מי שיקבל הודעה." },
      { title: "מחלקים לקבוצות", text: "צדדים / משפחה / חברים — אם זה עוזר לכם." },
      { title: "מעלים למערכת", text: "רשומה אחת לכל אישור (יכול לכסות כמה מגיעים)." },
      { title: "מנקים לפני שליחה", text: "כפילויות, קידומות, שמות חסרים." },
    ],
    tips: [
      {
        tone: "example",
        title: "רשומה ≠ מנה",
        text: "משפחה שמאשרת יחד = רשומה אחת עם מספר מגיעים. במחשבון משלמים לפי רשומות, לא בהכרח לפי כיסאות.",
      },
    ],
    sections: [
      {
        heading: "חבילה אחת לאירוע אחד",
        paragraphs: [
          "אלא אם סוכם אחרת — חינה וחתונה הן שני אירועים. ערבוב סטטוסים בין שני מועדים שוברים את המעקב.",
        ],
      },
    ],
    faqs: [
      {
        q: "יש עמוד שירות לרשימה?",
        a: "כן — /rsvp/guest-list. המדריך הזה הוא העומק התפעולי.",
      },
    ],
    related: [
      { href: "/rsvp/guest-list", label: "עמוד רשימת מוזמנים" },
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/try", label: "דמו" },
    ],
    primaryCta: { href: "/try", label: "לראות רשימה בדמו" },
    secondaryCta: { href: "/rsvp/guest-list", label: "לעמוד השירות" },
  },
  {
    slug: "send-digital-invitation",
    title: "איך שולחים הזמנה דיגיטלית לחתונה?",
    description:
      "העלאת הזמנה או שימוש בהזמנה במערכת, בדיקת פרטים, קישור אישי ושליחה עם סבבי וואטסאפ.",
    h1: "איך שולחים הזמנה דיגיטלית?",
    titleAccent: "קישור אישי — לא קובץ לקבוצה",
    lede:
      "האורח פותח קישור משלו. התשובה חוזרת לרשומה הנכונה — לא לצ׳אט קבוצתי שבו אי אפשר לדעת מי באמת אישר.",
    problem:
      "שלחתם JPEG לקבוצת משפחה, וקיבלתם 17 לייקים ואפס מספרים ברורים לאולם.",
    media: {
      type: "image",
      src: SHOT.weddingGardenMobile,
      alt: "המחשת הזמנה/אתר",
      variant: "phone",
    },
    gallery: [
      {
        type: "image",
        src: SHOT.weddingEternalMobile,
        device: "phone",
        alt: "תבנית חתונה",
        caption: "חוויית אורח (דמו תבנית)",
      },
      {
        type: "image",
        src: SHOT.dashboard,
        device: "laptop",
        alt: "אחרי שליחה",
        caption: "אחרי שהאורחים פותחים — הסטטוסים בדשבורד",
      },
    ],
    steps: [
      { title: "מעלים או בוחרים הזמנה", text: "בודקים שמות, תאריך, שעה, מיקום." },
      { title: "מחברים לרשימה", text: "מספר לכל רשומה." },
      { title: "שולחים סבב ראשון", text: "ואז שני לפתוחים." },
      { title: "עורכים אם צריך", text: "כל עוד האירוע פעיל." },
    ],
    tips: [
      {
        tone: "tip",
        title: "אתר חתונה נפרד",
        text: "תבניות האתר הן מסך אחר. ההזמנה לאישור היא הקישור שנשלח בוואטסאפ.",
      },
    ],
    sections: [
      {
        heading: "לא רק לחתונה",
        paragraphs: [
          "אותו מנגנון לבת מצווה, ברית או יום הולדת — ההבדל בתוכן ובעיצוב, לא בקישור האישי.",
        ],
      },
    ],
    faqs: [
      {
        q: "צריך אפליקציה?",
        a: "לא. האורח פותח קישור.",
      },
    ],
    related: [
      { href: "/invitations/chatuna", label: "עמוד הזמנות" },
      { href: "/wedding-website", label: "אתר חתונה" },
      { href: "/info/guides/when-to-send-invitation", label: "מתי שולחים" },
      { href: "/try", label: "דמו" },
    ],
    primaryCta: { href: "/invitations/chatuna", label: "להזמנות דיגיטליות" },
    secondaryCta: { href: "/try", label: "לדמו" },
  },
  {
    slug: "when-to-send-save-the-date",
    title: "מתי שולחים Save the Date?",
    description:
      "מתי לשלוח Save the Date: אחרי שננעל התאריך, לפני ההזמנה המלאה ולפני סבבי אישור ההגעה.",
    h1: "מתי שולחים Save the Date?",
    titleAccent: "לשמור תאריך — בלי לבקש תשובה",
    lede:
      "שולחים כשהתאריך יציב ואתם עדיין לא מוכנים לאסוף מגיע/לא מגיע. ב־Invistimo זו הודעת וואטסאפ חד־פעמית כשהאפשרות פתוחה בחשבון.",
    problem:
      "התאריך ננעל, האולם רחוק, והאורחים מחו״ל כבר שואלים. עוד לא מוכנים להזמנה מלאה — וגם לא רוצים לאסוף אישורים עכשיו.",
    timeline: [
      {
        when: "אחרי נעילת תאריך",
        title: "Save the Date",
        text: "פעם אחת. בלי טופס אישור.",
      },
      {
        when: "כשהפרטים מוכנים",
        title: "הזמנה",
        text: "תאריך, שעה, מיקום מדויקים.",
      },
      {
        when: "קרוב למועד",
        title: "אישורי הגעה",
        text: "סבבים עם מרווח לסבב שני.",
      },
    ],
    messageExamples: [
      {
        label: "ניסוח קצר",
        body: "Save the Date ✨\n12.06 — פרטים מלאים בהמשך.",
      },
    ],
    steps: [
      { title: "נועלים תאריך", text: "ומיקום כללי אם יש." },
      { title: "מעלים רשימה ראשונית", text: "מספרים תקינים." },
      { title: "שולחים", text: "כשהאפשרות פתוחה." },
      { title: "לא אוספים תשובות כאן", text: "מחכים להזמנה ואישורים." },
    ],
    mistakes: [
      {
        wrong: "לשלוח Save the Date כשהתאריך עוד זז.",
        right: "לחכות ליציבות — אחרת תשלחו תיקון ותאבדו אמון.",
      },
    ],
    sections: [
      {
        heading: "מתי לדלג",
        paragraphs: [
          "ברית, מסיבה בעוד שבועיים, או רשימה קטנה מאוד — לרוב ישר להזמנה ואישורים.",
        ],
      },
    ],
    faqs: [
      {
        q: "האם זה אוסף אישור?",
        a: "לא במודל של Invistimo.",
      },
    ],
    related: [
      { href: "/rsvp/save-the-date", label: "עמוד Save the Date" },
      { href: "/info/guides/save-the-date-vs-invitation", label: "מול הזמנה" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי אישורים" },
    ],
    primaryCta: { href: "/rsvp/save-the-date", label: "לעמוד Save the Date" },
    secondaryCta: { href: "/contact", label: "לבדוק זמינות בחשבון" },
  },
  {
    slug: "when-to-send-invitation",
    title: "מתי שולחים הזמנה דיגיטלית?",
    description:
      "מתי לשלוח הזמנה דיגיטלית: אחרי שפרטי האירוע מדויקים, ולפני או יחד עם תחילת סבבי אישור ההגעה.",
    h1: "מתי שולחים הזמנה דיגיטלית?",
    titleAccent: "כשהפרטים כבר נכונים",
    lede:
      "שולחים כשהתאריך, השעה והמיקום בהזמנה יציבים. אחר כך (או באותו מסע קישור) מתחילים לאסוף אישורים בזמן הנכון.",
    problem:
      "שלחתם הזמנה עם מיקום זמני, ואז שיניתם אולם. עכשיו חצי מהתשובות מתייחסות לכתובת הישנה.",
    steps: [
      { title: "נועלים פרטים", text: "תאריך, שעה, מיקום, לבוש אם רלוונטי." },
      { title: "מעלים/עורכים הזמנה", text: "בודקים תצוגת אורח." },
      { title: "שולחים", text: "קישור אישי." },
      { title: "מתזמנים אישורים", text: "לפי דד־ליין האולם." },
    ],
    gallery: [
      {
        type: "image",
        src: SHOT.weddingMidnightMobile,
        device: "phone",
        alt: "תבנית",
        caption: "דוגמת תצוגת אורח (דמו תבנית)",
      },
    ],
    tips: [
      {
        tone: "tip",
        title: "אחרי Save the Date",
        text: "ההזמנה ממלאת את הפרטים. אין צורך לבקש תשובה ב־STD.",
      },
    ],
    sections: [
      {
        heading: "עריכה אחרי שליחה",
        paragraphs: [
          "כל עוד האירוע פעיל — מעדכנים והאורחים רואים גרסה עדכנית בקישור.",
        ],
      },
    ],
    faqs: [
      {
        q: "מתי מתחילים אישורים אחרי ההזמנה?",
        a: "כשיש מרווח לסבב שני לפני האולם. ראו מדריך «מתי שולחים אישורי הגעה».",
      },
    ],
    related: [
      { href: "/invitations/chatuna", label: "הזמנות" },
      { href: "/info/guides/send-digital-invitation", label: "איך שולחים" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי אישורים" },
    ],
    primaryCta: { href: "/invitations/chatuna", label: "לעמוד ההזמנות" },
    secondaryCta: { href: "/try", label: "לדמו" },
  },
  {
    slug: "build-wedding-website",
    title: "איך בונים אתר חתונה אישי?",
    description:
      "בניית אתר חתונה ב־Invistimo: תבנית, עורך, תוכן לאורחים, וחיבור להזמנה ולאישורי הגעה — עם דוגמאות חיות.",
    h1: "איך בונים אתר חתונה אישי?",
    titleAccent: "תבנית חיה — לא מצגת",
    lede:
      "בוחרים תבנית, ממלאים סיפור ופרטים, ובודקים מה האורח רואה. האתר משלים הזמנה ואישורים — לא מחליף סבבי וואטסאפ.",
    problem:
      "אתם רוצים מקום אחד עם לו״ז, מיקום וגלריה — בלי לשלוח חמישה קבצים ובלי לוותר על אישורי הגעה מסודרים.",
    media: {
      type: "video",
      src: "/marketing/videos/demo-wedding-eternal-gold.webm",
      poster: SHOT.weddingEternal,
      caption: "תבנית Eternal Gold — דמו",
      variant: "wide",
    },
    gallery: [
      {
        type: "image",
        src: SHOT.weddingEternal,
        device: "laptop",
        alt: "Eternal Gold",
        caption: "Eternal Gold",
      },
      {
        type: "image",
        src: SHOT.weddingMidnight,
        device: "laptop",
        alt: "Midnight Velvet",
        caption: "Midnight Velvet",
      },
      {
        type: "image",
        src: SHOT.weddingGarden,
        device: "laptop",
        alt: "Garden Bloom",
        caption: "Garden Bloom",
      },
    ],
    steps: [
      { title: "בודקים הרשאה", text: "האתר תלוי במה שפתוח בחשבון." },
      { title: "בוחרים תבנית", text: "מהעורך / מהדוגמאות החיות." },
      { title: "עורכים תוכן", text: "שמות, תאריך, טקסטים, תמונות." },
      { title: "מחברים למסע", text: "הזמנה + אישורי הגעה." },
    ],
    tips: [
      {
        tone: "warning",
        title: "האתר לא שולח סבבי וואטסאפ",
        text: "איסוף האישורים נשאר בתהליך ה־RSVP.",
      },
    ],
    sections: [
      {
        heading: "דוגמאות פעילות",
        paragraphs: [
          "בעמוד אתר החתונה ובנתיבי /wedding-website/[תבנית] אפשר לפתוח תבניות חיות עם נתוני דמו לפני שעורכים את שלכם.",
        ],
      },
    ],
    faqs: [
      {
        q: "חובה לכל אירוע?",
        a: "לא. ברית ומסיבה קטנה לרוב מסתפקות בהזמנה ואישורים.",
      },
    ],
    related: [
      { href: "/wedding-website", label: "עמוד אתר חתונה" },
      { href: "/wedding-website/eternal-gold", label: "דוגמה Eternal Gold" },
      { href: "/wedding-website/midnight-velvet", label: "דוגמה Midnight Velvet" },
      { href: "/wedding-website/garden-bloom", label: "דוגמה Garden Bloom" },
      { href: "/invitations/chatuna", label: "הזמנה דיגיטלית" },
    ],
    primaryCta: { href: "/wedding-website", label: "לגלריית התבניות" },
    secondaryCta: { href: "/wedding-website/eternal-gold", label: "לפתיחת דוגמה חיה" },
  },
  {
    slug: "table-number-message",
    title: "איך שולחים הודעת מספר שולחן?",
    description:
      "אחרי שיבוץ הושבה אפשר לשלוח לכל אורח מספר שולחן. בתזכורת SMS הוא יכול להופיע כשיש הושבה.",
    h1: "הודעת מספר שולחן — מתי ואיך",
    titleAccent: "אחרי השיבוץ, לא עם האישור",
    lede:
      "סבבי האישור אוספים תשובה. מספר השולחן נשלח אחרי שיש שיבוץ — וגם יכול להופיע בתזכורת כשיש תוספת הושבה.",
    problem:
      "שיבצתם שולחנות, ואז קיבלתם עשרות הודעות «מה המספר שלי?» ביום האירוע.",
    gallery: [
      {
        type: "image",
        src: SHOT.seating,
        device: "laptop",
        alt: "מפה",
        caption: "קודם שיבוץ יציב — אחר כך הודעה",
      },
    ],
    video: {
      src: "/videos/tablesit.mp4",
      poster: SHOT.seating,
      caption: "שיבוץ במערכת — לפני שליחת מספר",
    },
    steps: [
      { title: "סוגרים שיבוץ", text: "כמה שאפשר." },
      { title: "שולחים מספר שולחן", text: "הודעה אישית מהמערכת." },
      { title: "מתקנים שינויים", text: "ושולחים שוב רק למי שהשתנה." },
      { title: "תזכורת", text: "יכולה לכלול מספר שולחן כשיש הושבה." },
    ],
    mistakes: [
      {
        wrong: "לשלוח מספר שולחן יחד עם סבב האישור הראשון.",
        right: "קודם תשובה, אחר כך שיבוץ, אחר כך מספר.",
      },
    ],
    sections: [
      {
        heading: "בלי תוספת הושבה",
        paragraphs: [
          "אין להניח שמספר שולחן יישלח או שתופיע מפה. בודקים במחשבון מה נרכש.",
        ],
      },
    ],
    faqs: [
      {
        q: "מה אם שינינו שולחן אחרי השליחה?",
        a: "מעדכנים במפה ושולחים שוב למי שהמספר שלו השתנה.",
      },
    ],
    related: [
      { href: "/seating-explained", label: "הושבה" },
      { href: "/info/guides/seating-plan", label: "איך מכינים הושבה" },
      { href: "/rsvp/reminders", label: "תזכורות" },
    ],
    primaryCta: { href: "/try/dashboard/seating", label: "לדמו הושבה" },
    secondaryCta: { href: "/seating-explained", label: "לעמוד ההושבה" },
  },
  {
    slug: "send-reminder-messages",
    title: "איך שולחים הודעות תזכורת?",
    description:
      "תזכורת SMS לפני האירוע בחבילת ההודעות: מתי לשלוח, מה הקשר להושבה, ולמה היא לא מחליפה סבב אישור.",
    h1: "איך שולחים הודעות תזכורת?",
    titleAccent: "אחרי האישורים — לפני היום",
    lede:
      "התזכורת מזכירה מועד (ולפעמים שולחן). קודם סוגרים פתוחים ככל האפשר — אחר כך מוודאים שהתזכורת מוגדרת.",
    problem:
      "נשאר יום לאירוע ויש עדיין פתוחים, ואתם שולחים «תזכורת» במקום לסיים לאסוף תשובות.",
    steps: [
      { title: "סוגרים פתוחים", text: "סבב שני / שיחות." },
      { title: "משלימים הושבה", text: "אם נרכשה." },
      { title: "בודקים מועד תזכורת", text: "לפי ההגדרה באירוע." },
      { title: "מאשרים שליחה", text: "לפי מה שזמין בחשבון." },
    ],
    tips: [
      {
        tone: "warning",
        title: "תזכורת ≠ אישור",
        text: "מי שלא ענה נשאר פתוח גם אחרי תזכורת.",
      },
    ],
    gallery: [
      {
        type: "image",
        src: SHOT.dashboardMobile,
        device: "phone",
        alt: "דשבורד",
        caption: "לפני תזכורת — מצב הרשימה",
      },
    ],
    sections: [
      {
        heading: "SMS במסע",
        paragraphs: [
          "בחבילת ההודעות: תזכורת ותודה ב־SMS. סבבי האישור עצמם בוואטסאפ. פירוט ב־/rsvp/sms.",
        ],
      },
    ],
    faqs: [
      {
        q: "איפה עמוד השירות?",
        a: "/rsvp/reminders",
      },
    ],
    related: [
      { href: "/rsvp/reminders", label: "עמוד תזכורות" },
      { href: "/rsvp/sms", label: "SMS" },
      { href: "/info/guides/table-number-message", label: "מספר שולחן" },
      { href: "/info/guides/event-day-checklist", label: "לפני יום האירוע" },
    ],
    primaryCta: { href: "/rsvp/reminders", label: "לעמוד התזכורות" },
    secondaryCta: { href: "/pricing", label: "לחבילות" },
  },
  {
    slug: "event-day-checklist",
    title: "מה בודקים לפני יום האירוע במערכת?",
    description:
      "רשימת בדיקה: סטטוסים, הושבה, תזכורת, הודעת תודה וגבולות המערכת מול ליווי באולם.",
    h1: "מה בודקים לפני יום האירוע?",
    titleAccent: "רשימת בדיקה מעשית",
    lede:
      "סוגרים רשימה, מסיימים סבבים ככל האפשר, מעדכנים הושבה אם יש, ומוודאים תזכורת ותודה. המערכת לא מחליפה מפיק באולם אלא אם סוכם ליווי.",
    problem:
      "הערב לפני האירוע ואתם מגילים ש־15 פתוחים, שלושה שולחנות לא מעודכנים, והתזכורת לא הוגדרה.",
    timeline: [
      {
        when: "72 שעות לפני",
        title: "סגירת פתוחים קריטיים",
        text: "סבב שני / שיחות / עדכון ידני.",
      },
      {
        when: "48 שעות לפני",
        title: "הושבה ותזכורת",
        text: "שיבוץ יציב; בדיקת מועד SMS.",
      },
      {
        when: "יום האירוע",
        title: "תפעול לפי חבילה",
        text: "כניסה/ניהול באולם רק אם נרכש/סוכם.",
      },
      {
        when: "אחרי",
        title: "הודעת תודה",
        text: "SMS בחבילת ההודעות.",
      },
    ],
    gallery: [
      {
        type: "image",
        src: SHOT.eventMgmt,
        device: "laptop",
        alt: "ניהול אירוע",
        caption: "מסך ניהול אירוע בדמו",
      },
      {
        type: "image",
        src: SHOT.seating,
        device: "laptop",
        alt: "הושבה",
        caption: "בדיקת מפה לפני היום",
      },
    ],
    steps: [
      { title: "סוגרים פתוחים", text: "הכי חשובים קודם." },
      { title: "מעבירים מספר לאולם", text: "לפי המועד שלהם." },
      { title: "סוגרים הושבה", text: "אם יש תוספת." },
      { title: "בודקים תזכורת ותודה", text: "מועדים ותוכן." },
    ],
    sections: [
      {
        heading: "מה המערכת לא עושה לבד",
        paragraphs: [
          "לא שולחת מספר מנות לאולם אוטומטית. לא מחליפה מפיק בשטח אלא אם סוכם ליווי.",
        ],
      },
    ],
    faqs: [
      {
        q: "יש צ׳ק־אין?",
        a: "יש מסכי צ׳ק־אין כשהם מופעלים לאירוע. זה לא מחליף אישורי הגעה מראש.",
      },
    ],
    related: [
      { href: "/event-management", label: "ניהול אירוע" },
      { href: "/rsvp/thank-you-messages", label: "הודעות תודה" },
      { href: "/seating-explained", label: "הושבה" },
      { href: "/try", label: "דמו" },
    ],
    primaryCta: { href: "/event-management", label: "לעמוד ניהול האירוע" },
    secondaryCta: { href: "/try", label: "לדמו" },
  },
  {
    slug: "bar-mitzvah-rsvp-plan",
    title: "איך מתכננים אישורי הגעה לבר מצווה?",
    description:
      "תכנון לבר מצווה: רשימת משפחה וחברים, תזמון סבבים, ומספר מגיעים לפני האולם — עם קישור לעמוד הייעודי.",
    h1: "אישורי הגעה לבר מצווה — תכנון",
    titleAccent: "משפחה, כיתה ומספר לאולם",
    lede:
      "הרשימה מתפצלת בין משפחה לחברים. הלחץ הוא מספר יציב לפני סגירה מול האולם — לא אתר חתונה מלא.",
    problem:
      "החברים מהכיתה לא עונים, הסבתא צריכה הסבר לקישור, והאולם שואל מחר כמה מנות.",
    timeline: [
      {
        when: "אחרי הזמנה מדויקת",
        title: "סבב ראשון",
        text: "לכל הרשימה — משפחה וחברים.",
      },
      {
        when: "אחרי יומיים",
        title: "בדיקה + סבב שני",
        text: "תיקון מספרים; מיקוד בפתוחים.",
      },
      {
        when: "לפני האולם",
        title: "סגירת מספר",
        text: "הושבה רק אם נרכשה ויש שולחנות.",
      },
    ],
    gallery: [
      {
        type: "image",
        src: SHOT.dashboard,
        device: "laptop",
        alt: "דשבורד",
        caption: "מעקב תשובות — אותו דשבורד, תרחיש בר מצווה",
      },
    ],
    steps: [
      { title: "מאחדים רשימה", text: "משפחה + חברים + הורים אם רלוונטי." },
      { title: "שולחים הזמנה", text: "פרטים מדויקים." },
      { title: "אישורים בזמן", text: "עם מרווח לסבב שני." },
      { title: "מעבירים מספר", text: "לאולם." },
    ],
    tips: [
      {
        tone: "tip",
        title: "אתר חתונה לא חובה",
        text: "רוב בר המצווה מסתפקים בהזמנה ואישורים.",
      },
    ],
    sections: [
      {
        heading: "עמוד ייעודי",
        paragraphs: [
          "לתרחיש השיווקי המלא: /for/bar-mitzvah. כאן השלבים התפעוליים.",
        ],
      },
    ],
    faqs: [
      {
        q: "בת מצווה?",
        a: "תהליך דומה — עמוד /for/bat-mitzvah.",
      },
    ],
    related: [
      { href: "/for/bar-mitzvah", label: "עמוד בר מצווה" },
      { href: "/for/bat-mitzvah", label: "בת מצווה" },
      { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים" },
      { href: "/rsvp", label: "אישורי הגעה" },
    ],
    primaryCta: { href: "/for/bar-mitzvah", label: "לעמוד בר מצווה" },
    secondaryCta: { href: "/try", label: "לדמו" },
  },
  {
    slug: "manage-corporate-event",
    title: "איך מנהלים אירוע עסקי עם Invistimo?",
    description:
      "ניהול מוזמנים לאירוע חברה או כנס: רשימה, סטטוסים, תזכורות, וניהול אירוע כתוספת — בלי להחליף מערכת כנסים מלאה.",
    h1: "איך מנהלים אירוע עסקי?",
    titleAccent: "מוזמנים וסטטוסים — לא סשנים מקבילים",
    lede:
      "מתאים כשצריך רשימה, אישורי הגעה ותזכורות. לא מחליף מערכת כנסים עם סשנים מקבילים.",
    problem:
      "יש לכם 180 מוזמנים לערב חברה, ואתם צריכים לדעת מי מגיע לפני ההזמנה לקייטרינג — בלי לנהל את זה באקסל של ה־HR.",
    gallery: [
      {
        type: "image",
        src: SHOT.dashboard,
        device: "laptop",
        alt: "דשבורד",
        caption: "סטטוסים בזמן אמת",
      },
      {
        type: "image",
        src: SHOT.eventMgmt,
        device: "laptop",
        alt: "ניהול",
        caption: "ניהול אירוע כתוספת — משימות ותקציב",
      },
    ],
    steps: [
      { title: "מעלים רשימה", text: "אנשי קשר ארגוניים." },
      { title: "שולחים קישור", text: "לפי מדיניות הארגון." },
      { title: "עוקבים אחרי סטטוסים", text: "בדשבורד." },
      { title: "מוסיפים ניהול/הושבה", text: "רק אם באמת צריך." },
    ],
    tips: [
      {
        tone: "tip",
        title: "הושבה בכנס?",
        text: "רלוונטי לארוחת ערב / ישיבה באולם. בקוקטייל עמידה — לרוב לא.",
      },
    ],
    sections: [
      {
        heading: "עמוד ייעודי",
        paragraphs: ["/for/corporate מרחיב את התרחיש השיווקי."],
      },
    ],
    faqs: [
      {
        q: "חבילה עסקית נפרדת?",
        a: "התמחור לפי רשומות וסוג חבילה במחשבון. לצרכים מיוחדים — יצירת קשר.",
      },
    ],
    related: [
      { href: "/for/corporate", label: "עמוד אירועי חברה" },
      { href: "/event-management", label: "ניהול אירוע" },
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/contact", label: "צור קשר" },
    ],
    primaryCta: { href: "/for/corporate", label: "לעמוד אירוע חברה" },
    secondaryCta: { href: "/contact", label: "לשיחה עם הצוות" },
  },
  {
    slug: "cost-rsvp-wedding",
    title: "כמה עולים אישורי הגעה לחתונה?",
    description:
      "איך מחושב מחיר אישורי הגעה ב־Invistimo: לפי רשומות, חבילה ותוספות — בלי מחיר אחיד מומצא.",
    h1: "כמה עולים אישורי הגעה לחתונה?",
    titleAccent: "בלי מחיר אחיד מומצא",
    lede:
      "אין מחיר אחד לכל חתונה. בוחרים כמות רשומות, חבילה ותוספות במחשבון — והסכום מופיע שם.",
    problem:
      "חיפשתם «מחיר לאישורי הגעה לחתונה» וקיבלתם מספר שיווקי שלא קשור לגודל הרשימה שלכם.",
    steps: [
      { title: "בוחרים כמות רשומות", text: "לפי גודל הרשימה ששולחים אליה." },
      { title: "בוחרים חבילה", text: "הודעות / שיחות מוקלטות / אנושיות / משולבות." },
      { title: "מסמנים תוספות", text: "הושבה, ניהול, מתנות באשראי, עיצוב — לפי הצורך." },
      { title: "רואים סכום", text: "רק במחשבון." },
    ],
    tips: [
      {
        tone: "example",
        title: "רשומה מול מנה",
        text: "אישור אחד יכול לכסות כמה מגיעים. לא משווים אוטומטית רשומות למנות באולם.",
      },
    ],
    sections: [
      {
        heading: "ארבע החבילות בקצרה",
        paragraphs: [
          "הודעות בלבד: הזמנה, שני סבבי וואטסאפ, תזכורת ותודה ב־SMS. חבילות השיחה מוסיפות סבבי שיחה על אותו בסיס.",
        ],
      },
      {
        heading: "איפה רואים מספר",
        paragraphs: [
          "רק ב־/pricing אחרי בחירה. המדריך לא מחליף את המחשבון.",
        ],
      },
    ],
    faqs: [
      {
        q: "למה אין כאן מחיר סופי?",
        a: "כי הוא תלוי בכמות ובחבילה שבחרתם.",
      },
    ],
    related: [
      { href: "/pricing", label: "מחשבון חבילות" },
      { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { href: "/faq", label: "שאלות נפוצות" },
    ],
    primaryCta: { href: "/pricing", label: "למחשבון" },
    secondaryCta: { href: "/contact", label: "יצירת קשר" },
  },
  {
    slug: "reduce-meal-waste",
    title: "איך מעבירים מספר מנות מדויק יותר לאולם?",
    description:
      "איך משתמשים בסטטוסי הגעה ובמספר מגיעים כדי לסגור מול האולם — בלי הבטחת חיסכון כספי.",
    h1: "מספר מנות לאולם — בלי ניחושים",
    titleAccent: "מהדשבורד, לא מהתחושה",
    lede:
      "המערכת מראה מי מגיע, כמה סומנו בכל אישור, ומי פתוח. אתם מעבירים את המספר לאולם — אין הבטחת «כמה כסף תחסכו».",
    problem:
      "האולם לוחץ למספר, ואתם עדיין סופרים לייקים בוואטסאפ.",
    gallery: [
      {
        type: "image",
        src: SHOT.dashboard,
        device: "laptop",
        alt: "דשבורד",
        caption: "סכום מגיעים ופתוחים במקום אחד",
      },
    ],
    steps: [
      { title: "אוספים תשובות", text: "סבבים לפי החבילה." },
      { title: "סוגרים פתוחים קריטיים", text: "לפני הדד־ליין." },
      { title: "מייצאים/מעבירים מספר", text: "ידנית לאולם." },
      { title: "מעדכנים ברגע האחרון", text: "אם האולם מאפשר." },
    ],
    tips: [
      {
        tone: "warning",
        title: "בלי הבטחות ROI",
        text: "אנחנו לא מפרסמים אחוז חיסכון גורף. המטרה היא מספר עבודה ברור יותר.",
      },
    ],
    sections: [
      {
        heading: "רשומה ומגיעים",
        paragraphs: [
          "רשומה אחת יכולה לכלול כמה מגיעים. מסתכלים על סכום המגיעים שסומן — לא רק על מספר השורות.",
        ],
      },
    ],
    faqs: [
      {
        q: "המערכת שולחת לאולם לבד?",
        a: "לא. אתם מעבירים את המספר.",
      },
    ],
    related: [
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/info/guides/guests-who-dont-reply", label: "פתוחים" },
      { href: "/try", label: "דמו" },
    ],
    primaryCta: { href: "/try", label: "לראות דשבורד בדמו" },
    secondaryCta: { href: "/rsvp", label: "לאישורי הגעה" },
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug);
}

export function guidePath(slug: string) {
  return `/info/guides/${slug}`;
}
