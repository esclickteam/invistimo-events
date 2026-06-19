"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const VAT_RATE = 0.18;
const COMMISSION_RATE = 0.05;
const QUOTE_VALIDITY_DAYS = 4;

type PackageKey = "easy" | "smart" | "seating";
type DocumentType = "quote" | "agreement";
type PaymentMode = "full" | "split";
type AdminDiscountType = "none" | "amount" | "percent";
type QuotePricingDisplay = "showUpsellPrices" | "packageTotalOnly";

type DetailSection = {
  title: string;
  items: string[];
};

type PackageTier = {
  maxRecords: number;
  price: number;
};

type PackagePlan = {
  key: PackageKey;
  title: string;
  badge: string;
  shortDescription: string;
  includes: string[];
  customerSummary: string;
  employeeDetails: DetailSection[];
  tiers: PackageTier[];
};

type UpsellKey =
  | "digitalSeating"
  | "creditGifts"
  | "venueSeating"
  | "personalRepresentative"
  | "thirdRsvpRound"
  | "suppliersBudgetSystem"
  | "alcoholManagement";

type SelectedUpsells = Record<UpsellKey, boolean>;
type VenueSeatingStaffCount = 1 | 2 | 3;
type AlcoholManagementStaffCount = 1 | 2;

type UpsellItem = {
  key: UpsellKey;
  title: string;
  price: number;
  description: string;
  availableForPlans?: PackageKey[];
  note?: string;
  customerDetails: DetailSection[];
  employeeDetails: DetailSection[];
};

type PaymentSchedule = {
  paymentMode: PaymentMode;
  originalGrossAmount: number;
  discountAmount: number;
  finalGrossAmount: number;
  immediateTotal: number;
  eventDayTotal: number;
  preEventServicesTotal: number;
  eventServicesTotal: number;
  eventServicesDeposit: number;
  eventServicesBalance: number;
  stripeAmount: number;
};

type DetailsModalState = {
  title: string;
  subtitle?: string;
  price?: number;
  sections: DetailSection[];
  employeeSections?: DetailSection[];
  customerSections?: DetailSection[];
  defaultView?: "employee" | "customer";
} | null;

const PACKAGE_TIERS = {
  easy: [
    { maxRecords: 50, price: 99 },
    { maxRecords: 100, price: 149 },
    { maxRecords: 150, price: 199 },
    { maxRecords: 200, price: 239 },
    { maxRecords: 250, price: 269 },
    { maxRecords: 300, price: 299 },
    { maxRecords: 350, price: 339 },
    { maxRecords: 400, price: 379 },
    { maxRecords: 450, price: 409 },
    { maxRecords: 500, price: 429 },
    { maxRecords: 550, price: 459 },
    { maxRecords: 600, price: 489 },
    { maxRecords: 650, price: 519 },
    { maxRecords: 700, price: 539 },
    { maxRecords: 750, price: 569 },
    { maxRecords: 800, price: 599 },
    { maxRecords: 850, price: 619 },
    { maxRecords: 900, price: 649 },
    { maxRecords: 950, price: 679 },
    { maxRecords: 1000, price: 699 },
  ],
  smart: [
    { maxRecords: 50, price: 149 },
    { maxRecords: 100, price: 249 },
    { maxRecords: 150, price: 349 },
    { maxRecords: 200, price: 449 },
    { maxRecords: 250, price: 549 },
    { maxRecords: 300, price: 649 },
    { maxRecords: 350, price: 749 },
    { maxRecords: 400, price: 849 },
    { maxRecords: 450, price: 949 },
    { maxRecords: 500, price: 1049 },
    { maxRecords: 550, price: 1149 },
    { maxRecords: 600, price: 1249 },
    { maxRecords: 650, price: 1349 },
    { maxRecords: 700, price: 1449 },
    { maxRecords: 750, price: 1549 },
    { maxRecords: 800, price: 1649 },
    { maxRecords: 850, price: 1749 },
    { maxRecords: 900, price: 1849 },
    { maxRecords: 950, price: 1949 },
    { maxRecords: 1000, price: 2049 },
  ],
  seating: [
    { maxRecords: 50, price: 199 },
    { maxRecords: 100, price: 299 },
    { maxRecords: 150, price: 399 },
    { maxRecords: 200, price: 499 },
    { maxRecords: 250, price: 599 },
    { maxRecords: 300, price: 699 },
    { maxRecords: 350, price: 799 },
    { maxRecords: 400, price: 899 },
    { maxRecords: 450, price: 999 },
    { maxRecords: 500, price: 1099 },
    { maxRecords: 550, price: 1199 },
    { maxRecords: 600, price: 1299 },
    { maxRecords: 650, price: 1399 },
    { maxRecords: 700, price: 1499 },
    { maxRecords: 750, price: 1599 },
    { maxRecords: 800, price: 1699 },
    { maxRecords: 850, price: 1799 },
    { maxRecords: 900, price: 1899 },
    { maxRecords: 950, price: 1999 },
    { maxRecords: 1000, price: 2099 },
  ],
} satisfies Record<PackageKey, PackageTier[]>;

const EASY_INCLUDES = [
  "הזמנה דיגיטלית מלאה על בסיס קובץ/תמונה שהלקוח מעלה למערכת — ללא עיצוב גרפי של Invistimo.",
  "דף הזמנה דיגיטלי עם פרטי האירוע וקישור לאישור הגעה.",
  "ניהול רשימת מוזמנים ורשומות לפי הכמות שנרכשה.",
  "2 סבבי הודעות אוטומטיים לאישורי הגעה ב־WhatsApp או SMS, לפי בחירת הערוץ לכל סבב.",
  "אפשרות לפצל בין WhatsApp ו־SMS כדי לשפר את אחוזי המענה.",
  "עדכון סטטוסי הגעה במערכת לפי תשובות האורחים.",
  "הודעת תזכורת לקראת האירוע, כולל פרטי האירוע ומספר שולחן אם הוגדר.",
  "הודעת תודה לאחר האירוע ב־SMS.",
];

const SMART_INCLUDES = [
  "הזמנה דיגיטלית מלאה על בסיס קובץ/תמונה שהלקוח מעלה למערכת — ללא עיצוב גרפי של Invistimo.",
  "דף הזמנה דיגיטלי עם פרטי האירוע וקישור לאישור הגעה.",
  "ניהול רשימת מוזמנים ורשומות לפי הכמות שנרכשה.",
  "2 סבבי הודעות אוטומטיים לאישורי הגעה ב־WhatsApp או SMS, לפי בחירת הערוץ לכל סבב.",
  "אפשרות לפצל בין WhatsApp ו־SMS כדי לשפר את אחוזי המענה.",
  "עדכון סטטוסי הגעה במערכת לפי תשובות האורחים.",
  "הודעת תזכורת לקראת האירוע, כולל פרטי האירוע ומספר שולחן אם הוגדר.",
  "הודעת תודה לאחר האירוע ב־SMS.",
  "מוקד טלפוני מקצועי לאורחים שלא ענו להודעות.",
  "עד 3 סבבי שיחה של נציגים אנושיים למוזמנים שלא ענו או נדרשת אליהם חזרה.",
  "תיעוד שיחות, הערות ועדכון סטטוסים בזמן אמת במערכת.",
];

const SEATING_INCLUDES = [
  "הזמנה דיגיטלית מלאה על בסיס קובץ/תמונה שהלקוח מעלה למערכת — ללא עיצוב גרפי של Invistimo.",
  "דף הזמנה דיגיטלי עם פרטי האירוע וקישור לאישור הגעה.",
  "ניהול רשימת מוזמנים ורשומות לפי הכמות שנרכשה.",
  "2 סבבי הודעות אוטומטיים לאישורי הגעה ב־WhatsApp או SMS, לפי בחירת הערוץ לכל סבב.",
  "אפשרות לפצל בין WhatsApp ו־SMS כדי לשפר את אחוזי המענה.",
  "עדכון סטטוסי הגעה במערכת לפי תשובות האורחים.",
  "הודעת תזכורת לקראת האירוע, כולל פרטי האירוע ומספר שולחן אם הוגדר.",
  "הודעת תודה לאחר האירוע ב־SMS.",
  "מוקד טלפוני מקצועי לאורחים שלא ענו להודעות.",
  "עד 3 סבבי שיחה של נציגים אנושיים למוזמנים שלא ענו או נדרשת אליהם חזרה.",
  "תיעוד שיחות, הערות ועדכון סטטוסים בזמן אמת במערכת.",
  "מערכת הושבה דיגיטלית באתר לניהול שולחנות וסידורי הושבה.",
  "חיבור בין אישורי ההגעה לבין סידורי ההושבה, כדי לראות מי אישר וכמה מגיעים מכל רשומה.",
  "אפשרות לעדכן שולחנות, מספרי כיסאות ושיוך אורחים עד מועד האירוע.",
  "פתיחת אפשרות מתנות באשראי דרך ספק חיצוני, כחלק מהחבילה וללא תוספת תשלום.",
];

const PACKAGE_PLANS: PackagePlan[] = [
  {
    key: "easy",
    title: "קל להזמין",
    badge: "מתאים לאירוע פשוט",
    shortDescription: "הזמנה דיגיטלית + 2 סבבי הודעות לאישורי הגעה",
    includes: EASY_INCLUDES,
    customerSummary:
      "חבילת קל להזמין כוללת הזמנה דיגיטלית על בסיס קובץ שהלקוח מעלה, ניהול רשומות, 2 סבבי הודעות לאישורי הגעה ב־WhatsApp או SMS, הודעת תזכורת והודעת תודה לאחר האירוע.",
    employeeDetails: [
      {
        title: "דגשים לעובד",
        items: [
          "להבהיר שההזמנה הדיגיטלית היא הזמנה שהלקוח מעלה, לא עיצוב אישי שלנו.",
          "להסביר שיש 2 סבבי הודעות בלבד, וכל סבב יכול להיות ב־WhatsApp או SMS.",
          "אם הלקוח רוצה הושבה דיגיטלית באתר בחבילה זו — לבחור תוספת הושבה דיגיטלית ב־100 ₪.",
        ],
      },
    ],
    tiers: PACKAGE_TIERS.easy,
  },
  {
    key: "smart",
    title: "מזמינים חכם",
    badge: "הבחירה הפופולרית",
    shortDescription: "הזמנה + הודעות + מוקד טלפוני למי שלא ענה",
    includes: SMART_INCLUDES,
    customerSummary:
      "חבילת מזמינים חכם כוללת הזמנה דיגיטלית על בסיס קובץ שהלקוח מעלה, 2 סבבי הודעות ב־WhatsApp או SMS, הודעת תזכורת, הודעת תודה, מוקד טלפוני ועד 3 סבבי שיחה למוזמנים שלא ענו.",
    employeeDetails: [
      {
        title: "דגשים לעובד",
        items: [
          "לא לומר 'כולל את חבילה 1' — לפרט ללקוח את כל השירותים בפועל.",
          "השיחות מתבצעות למי שלא ענה או למי שנדרשת אליו חזרה, לא לכל מי שכבר אישר.",
          "אם הלקוח רוצה הושבה דיגיטלית באתר בחבילה זו — לבחור תוספת הושבה דיגיטלית ב־100 ₪.",
        ],
      },
    ],
    tiers: PACKAGE_TIERS.smart,
  },
  {
    key: "seating",
    title: "מזמינים ומושיבים",
    badge: "הכי מקיף",
    shortDescription: "הזמנה + הודעות + מוקד + הושבה דיגיטלית באתר",
    includes: SEATING_INCLUDES,
    customerSummary:
      "חבילת מזמינים ומושיבים כוללת הזמנה דיגיטלית על בסיס קובץ שהלקוח מעלה, 2 סבבי הודעות ב־WhatsApp או SMS, הודעת תזכורת, הודעת תודה, מוקד טלפוני ועד 3 סבבי שיחה, מערכת הושבה דיגיטלית באתר לניהול שולחנות וסידורי הושבה, ומתנות באשראי דרך ספק חיצוני ללא תוספת תשלום.",
    employeeDetails: [
      {
        title: "דגשים לעובד",
        items: [
          "הושבה דיגיטלית באתר כלולה בחבילה זו ללא תוספת 100 ₪.",
          "ההושבה הדיגיטלית היא מערכת באתר, ולא צוות פיזי באולם. צוות פיזי באולם נבחר כאפסייל נפרד.",
        ],
      },
    ],
    tiers: PACKAGE_TIERS.seating,
  },
];

const DIGITAL_SEATING_DETAILS: DetailSection[] = [
  {
    title: "הושבה דיגיטלית באתר",
    items: [
      "פתיחת מערכת הושבה דיגיטלית באתר לניהול שולחנות וסידורי הושבה.",
      "אפשרות להגדיר שולחנות, מספרי כיסאות ושיוך אורחים לשולחנות.",
      "חיבור בין אישורי ההגעה לבין ההושבה, כך שהלקוח רואה מי אישר וכמה צפויים להגיע מכל רשומה.",
      "השירות הוא מערכת דיגיטלית בלבד ואינו כולל צוות פיזי באולם, אלא אם נרכש שירות הושבה באולם בנפרד.",
    ],
  },
];

const CREDIT_GIFTS_DETAILS: DetailSection[] = [
  {
    title: "מתנות באשראי דרך ספק חיצוני",
    items: [
      "פתיחת אפשרות לקבלת מתנות באשראי דרך ספק חיצוני, בהתאם לתנאי הספק והחיבור הפעיל במערכת.",
      "השירות מיועד לאפשר לאורחים להעביר מתנה באשראי בצורה נוחה ומסודרת דרך קישור ייעודי.",
      "הכספים, העמלות, מועדי ההעברה ותנאי השירות כפופים לספק החיצוני שמפעיל את שירות המתנות באשראי.",
      "השירות אינו כולל סליקה ישירה של Invistimo ואינו מהווה שירות פיננסי מטעם Invistimo.",
    ],
  },
];

const VENUE_SEATING_OPTIONS: { staffCount: VenueSeatingStaffCount; title: string; price: number; maxRecords?: number; description: string }[] = [
  { staffCount: 1 as const, title: "איש צוות אחד", price: 1000, maxRecords: 200, description: "מתאים עד 200 רשומות." },
  { staffCount: 2 as const, title: "2 אנשי צוות", price: 1600, description: "מתאים לאירועים בינוניים או צורך בשתי עמדות." },
  { staffCount: 3 as const, title: "3 אנשי צוות", price: 2100, description: "מתאים לאירועים גדולים או עומס כניסה גבוה." },
];

const ALCOHOL_OPTIONS: { staffCount: AlcoholManagementStaffCount; title: string; price: number; maxRecords?: number; minRecords?: number; description: string }[] = [
  { staffCount: 1 as const, title: "איש צוות אחד", price: 1200, maxRecords: 450, description: "מתאים עד 450 רשומות." },
  { staffCount: 2 as const, title: "2 אנשי צוות", price: 2000, minRecords: 451, description: "חובה מעל 450 רשומות." },
];

const VENUE_SEATING_CUSTOMER_DETAILS: DetailSection[] = [
  {
    title: "שירות הושבה באולם",
    items: [
      "השירות כולל צוות הושבה מטעמנו ביום האירוע, בהתאם לכמות אנשי הצוות שנבחרה וסוכמה מול הלקוח.",
      "הצוות מגיע לאולם לפני תחילת קבלת הפנים, מקים עמדת הושבה ועובד עם מערכת לייב לניהול ההושבה בזמן אמת.",
      "הצוות מסייע באיתור אורחים, מסירת מספרי שולחן, עדכון הגעה בפועל ומציאת פתרונות במקרה של שינוי בכמות המגיעים.",
      "פתיחת רזרבות או התחייבות נוספת מול האולם תתבצע רק באישור נציג משפחה או גורם מוסמך מטעם בעל האירוע.",
    ],
  },
];

const PERSONAL_REP_CUSTOMER_DETAILS: DetailSection[] = [
  {
    title: "נציג אישי לליווי",
    items: [
      "נציג אישי מטעמנו מלווה את הלקוח מרחוק לאורך תהליך ההכנות לאירוע.",
      "הליווי כולל מעבר ועדכון פעמיים בשבוע על נתוני האירוע, אישורי ההגעה, משימות פתוחות והתקדמות ההושבה הדיגיטלית אם קיימת.",
      "הנציג מסייע בהבנת הנתונים ובסידור ראשוני או עדכון של ההושבה הדיגיטלית מרחוק לפי סקיצת האולם שהלקוח מעביר.",
      "השירות אינו כולל הגעה פיזית לאולם ביום האירוע, אלא אם נרכש שירות הושבה באולם בנפרד.",
    ],
  },
];

const SUPPLIERS_BUDGET_CUSTOMER_DETAILS: DetailSection[] = [
  {
    title: "מערכת עצמאית לניהול ספקים ותקציב",
    items: [
      "פתיחת אזור עצמאי במערכת לניהול ספקים, תקציב, מקדמות, יתרות, חוזים ולוחות זמנים של האירוע.",
      "ניתן להוסיף ספקים לפי תחומים, להזין מחיר כולל, מקדמה, יתרה לתשלום, פרטי קשר והערות.",
      "המערכת מחשבת אוטומטית כמה שולם, כמה נותר לשלם ומה העלות הממוצעת לאורח לפי הנתונים שהלקוח מזין.",
      "המערכת היא כלי ניהול עצמי ואינה מחליפה ייעוץ משפטי, פיננסי או בדיקת חוזים.",
    ],
  },
];

const ALCOHOL_CUSTOMER_DETAILS: DetailSection[] = [
  {
    title: "ניהול אלכוהול באולם",
    items: [
      "השירות כולל איש צוות אחד או שני אנשי צוות לניהול, פיזור ותיעוד אלכוהול באולם ביום האירוע.",
      "איש הצוות פועל לפי ההנחיות שסוכמו עם הלקוח או נציג מוסמך מטעמו, ומתעד פתיחה או הקצאת בקבוקים במערכת.",
      "השירות נועד לצמצם פתיחת בקבוקים מיותרת ולתת בסיום הערב תמונת מצב מסודרת על האלכוהול שנוהל בפועל.",
      "השירות אינו כולל רכישת אלכוהול, אספקת בקבוקים או אחריות על כמות האלכוהול שסופקה לאירוע.",
    ],
  },
];



/* =========================================================
   פירוט מלא מהקוד הקודם — למודל עם מתג עובד/לקוח
========================================================= */
const DETAILED_VENUE_SEATING_CUSTOMER_DETAILS: DetailSection[] = [
  {
    title: "שירות הושבה באולם",
    items: [
      "שירות ההושבה באולם כולל צוות הושבה מטעמנו, הכולל דיילים/דיילות ומנהל/ת הושבה, בהתאם לחבילה שנבחרה ולכמות אנשי הצוות שסוכמה מול הלקוח.",
      "השירות נועד לנהל את שלב קבלת האורחים והושבתם באולם בצורה מסודרת, יעילה ומקצועית, תוך שימוש במערכת לייב ייעודית לניהול ההושבה בזמן אמת.",
      "מטרת השירות היא לצמצם עיכובים בכניסה לאולם, למנוע אי־נעימות לאורחים, ולסייע במציאת פתרונות מהירים במקרה של שינויים בכמות המגיעים בפועל.",
    ],
  },
  {
    title: "היערכות לפני תחילת האירוע",
    items: [
      "צוות ההושבה יגיע לאולם כחצי שעה לפני תחילת האירוע, ייצור קשר עם בעל/ת האירוע או עם נציג מוסמך מטעמם, ויבצע מעבר על סקיצת ההושבה, מספרי השולחנות, כמות הכיסאות והסידור בפועל באולם.",
      "לאחר מכן הצוות יקים עמדת הושבה מסודרת, הכוללת מחשבים, מערכת לייב ופתקי הושבה, ויוודא שהנתונים במערכת תואמים ככל האפשר לסידור שהוגדר מראש.",
      "שירות ההושבה נמשך לאורך שלב קבלת האורחים והכניסה לאולם, ועד לשלב המנה הראשונה או עד שכלל האורחים יושבים בצורה מסודרת — בהתאם להתנהלות האירוע בפועל.",
    ],
  },
  {
    title: "קבלת האורחים והכוונה לשולחנות",
    items: [
      "במהלך הגעת האורחים, הצוות יקבל את האורחים בכניסה, יאתר אותם במערכת, וימסור להם את פרטי ההושבה שלהם בצורה נעימה וברורה.",
      "הצוות פועל כדי שהאורחים יקבלו מענה מהיר, ידעו לאיזה שולחן הם משובצים, ולא יצטרכו להמתין או להסתובב באולם עד למציאת מקום.",
    ],
  },
  {
    title: "ניהול הושבה בזמן אמת",
    items: [
      "ההושבה מנוהלת באמצעות מערכת לייב ייעודית, המאפשרת לצוות לעדכן בזמן אמת את כמות האורחים שהגיעו בפועל ביחס לאישורי ההגעה שסומנו מראש.",
      "לדוגמה, אם אורח אישר הגעה עבור 4 אנשים ובפועל הגיע אדם אחד בלבד, הצוות רשאי לברר בנימוס האם צפויים להגיע אורחים נוספים מתוך אותה רשומה.",
      "אם לא צפויים להגיע נוספים, ניתן לעדכן את המערכת בזמן אמת ולפנות את המקומות שלא נוצלו, כך שניתן יהיה להשתמש בהם במקרה הצורך.",
      "במקרה שבו מגיעים יותר אורחים מהכמות שסומנה מראש, המערכת מסייעת לצוות לאתר מקומות פנויים באולם בצורה מהירה ומסודרת, כדי למצוא פתרון יעיל ולצמצם עיכובים או אי־נעימות לאורחים.",
    ],
  },
  {
    title: "ניהול במהלך האירוע",
    items: [
      "במהלך שלב הכניסה לאולם ועד להתייצבות ההושבה, הצוות יפעל לוודא שהאורחים יודעים היכן הם יושבים, ויסייע במקרה שבו אורחים עומדים, מחפשים מקום או נדרשת התאמה בשטח.",
      "במידת הצורך, הצוות יסייע בניוד כיסאות, איתור מקומות פנויים, עדכון הגעת אורחים בפועל ותיאום פתרונות מול נציג המשפחה או הגורם המוסמך מטעם בעל האירוע.",
    ],
  },
  {
    title: "רזרבות ושינויים מול האולם",
    items: [
      "השירות כולל סיוע בניהול ההושבה ובצמצום הצורך בפתיחת רזרבות מיותרות, ככל שניתן ובהתאם למצב בפועל באירוע.",
      "פתיחת רזרבות או התחייבות נוספת מול האולם תתבצע רק באישור נציג המשפחה או גורם מוסמך מטעם בעל האירוע.",
      "ככל שנדרשת חתימה על פתיחת רזרבות מול האולם, החתימה תתבצע על ידי נציג המשפחה או הגורם המוסמך בלבד, ולא על ידי צוות ההושבה.",
    ],
  },
];

const DETAILED_VENUE_SEATING_EMPLOYEE_DETAILS: DetailSection[] = [
  {
    title: "מה העובד צריך להסביר בשיחה",
    items: [
      "להסביר ללקוח ששירות הושבה באולם הוא שירות פיזי באירוע, בנוסף למערכת ההושבה הדיגיטלית.",
      "להדגיש שהצוות מגיע כחצי שעה לפני תחילת האירוע ונשאר עד שלב המנה הראשונה או עד שכל האורחים יושבים בצורה מסודרת, בהתאם להתנהלות האירוע בפועל.",
      "להסביר שהעבודה מתבצעת דרך מערכת לייב, כדי לזהות בזמן אמת מי הגיע, כמה הגיעו מכל רשומה, איפה התפנו מקומות ואיפה אפשר להושיב אורחים במקרה של שינוי.",
      "להבהיר שהמטרה היא למנוע עיכובים ואי־נעימות לאורחים, ולצמצם פתיחת רזרבות מיותרות ככל שניתן.",
    ],
  },
  {
    title: "מה חובה לסגור מול הלקוח לפני מכירה",
    items: [
      "איזו חבילת הושבה נרכשה וכמה אנשי צוות מגיעים לאירוע.",
      "שם איש קשר באירוע ומספר טלפון זמין ליום האירוע.",
      "שעת תחילת האירוע ושעת קבלת הפנים, כדי לוודא הגעה כחצי שעה לפני.",
      "קבלת סקיצת אולם, מספרי שולחנות וכמות כיסאות לפי ההתחייבות מול האולם.",
      "הבהרה שחתימה או אישור על פתיחת רזרבות מול האולם נעשית רק על ידי נציג משפחה או גורם מוסמך מטעם בעל האירוע.",
    ],
  },
  {
    title: "נוסח מומלץ לסיכום עם הלקוח",
    items: [
      "השירות כולל צוות הושבה מטעמנו שמגיע לאולם, מקים עמדת הושבה ועובד עם מערכת לייב לניהול ההושבה בזמן אמת.",
      "הצוות בודק בזמן אמת אם הגיעו יותר או פחות אורחים ממה שסומן באישורי ההגעה, ומעדכן את המערכת כדי למצוא פתרונות במהירות.",
      "השירות נמשך עד שלב המנה הראשונה או עד שכל האורחים יושבים בצורה מסודרת.",
      "פתיחת רזרבות או התחייבות נוספת מול האולם תתבצע רק באישור נציג המשפחה או גורם מוסמך מטעם בעל האירוע.",
    ],
  },
];

const DETAILED_ALCOHOL_MANAGEMENT_CUSTOMER_DETAILS: DetailSection[] = [
  {
    title: "שירות ניהול אלכוהול באולם",
    items: [
      "שירות ניהול האלכוהול באולם כולל איש צוות אחד או שני אנשי צוות מתוך צוות השירות שמגיע לאולם ביום האירוע, בהתאם לכמות הרשומות שנרכשה ולבחירה שסוכמה מול הלקוח.",
      "איש הצוות יישאר באירוע לצורך ניהול, פיזור ותיעוד האלכוהול עד השעה 02:00 בלילה לכל המאוחר, או עד לסיום השירות בפועל — לפי המוקדם מביניהם.",
      "השירות נועד לסייע לבעל/ת האירוע לנהל את האלכוהול בצורה מסודרת, מבוקרת ומתועדת, לצמצם פתיחה מיותרת של בקבוקים, לוודא שהבקבוקים נפתחים ומוקצים רק לפי צורך בפועל, ולאפשר לבעל/ת האירוע לקבל בסיום הערב תמונת מצב מסודרת וברורה.",
    ],
  },
  {
    title: "היערכות ותיאום לפני תחילת השירות",
    items: [
      "לפני תחילת ניהול האלכוהול, איש הצוות יבצע תיאום מול בעל/ת האירוע או מול נציג מוסמך מטעמם לגבי אופן ניהול האלכוהול באירוע.",
      "במסגרת התיאום יוגדרו, ככל שנמסרו מראש, סוגי האלכוהול, כמות הבקבוקים, אופן הפיזור לשולחנות, סדר עדיפויות לפתיחת בקבוקים והנחיות מיוחדות של בעל/ת האירוע לגבי שימוש באלכוהול במהלך הערב.",
      "איש הצוות יפעל בהתאם להנחיות שסוכמו מראש, ובמידת הצורך יתאם במהלך האירוע מול בעל/ת האירוע או מול נציג מוסמך מטעמם.",
    ],
  },
  {
    title: "פיזור בקבוקים וניהול במהלך האירוע",
    items: [
      "במהלך האירוע, איש הצוות ידאג לפיזור בקבוקים על השולחנות בהתאם למה שסוכם מראש עם בעל/ת האירוע או עם נציג מוסמך מטעמם.",
      "איש הצוות יבצע בדיקות במהלך הערב בשולחנות, יבדוק האם קיימים בקבוקים ריקים או בקבוקים שנדרש להחליף, וידאג לפתוח או להקצות בקבוק נוסף רק במידת הצורך ובהתאם להנחיות שסוכמו מראש.",
      "מטרת השירות היא למנוע פתיחה מיותרת של בקבוקים, לצמצם בזבוז, ולשמור על ניהול מסודר של מלאי האלכוהול במהלך האירוע.",
    ],
  },
  {
    title: "תיעוד ממוחשב",
    items: [
      "כל בקבוק שייפתח או יוקצה יתועד במערכת, לרבות מיקום ההקצאה, מועד פתיחת הבקבוק, ומועד הקצאת בקבוק נוסף ככל שבוצעה.",
      "בסיום הערב, בעל/ת האירוע יקבלו דוח ממוחשב מסודר הכולל את תיעוד ניהול האלכוהול במהלך האירוע, בהתאם לנתונים שתועדו בפועל.",
    ],
  },
  {
    title: "שעות השירות",
    items: [
      "שירות ניהול האלכוהול מתבצע על ידי איש צוות אחד או שני אנשי צוות מתוך הצוות שמגיע לאולם, בהתאם להיקף האירוע והבחירה שסוכמה.",
      "איש הצוות יישאר לצורך שירות זה עד השעה 02:00 בלילה לכל המאוחר, או עד לסיום הצורך בשירות בפועל — לפי המוקדם מביניהם.",
      "באירועים מעל 450 רשומות נדרש שירות של 2 אנשי צוות לניהול אלכוהול.",
    ],
  },
  {
    title: "הבהרות חשובות",
    items: [
      "השירות כולל ניהול, פיזור ותיעוד של האלכוהול באירוע בלבד.",
      "השירות אינו כולל רכישת אלכוהול, אספקת בקבוקים או אחריות על כמות האלכוהול שסופקה לאירוע.",
      "האחריות על רכישת האלכוהול, אספקתו לאולם, אישור שימוש בו מול האולם וכל התחייבות מול האולם בנושא האלכוהול הינה באחריות בעל/ת האירוע או מי מטעמם.",
    ],
  },
];

const DETAILED_ALCOHOL_MANAGEMENT_EMPLOYEE_DETAILS: DetailSection[] = [
  {
    title: "מה העובד צריך להסביר בשיחה",
    items: [
      "להסביר שזה שירות נוסף לניהול אלכוהול באולם, והוא מתבצע על ידי איש צוות מתוך הצוות שמגיע לאירוע.",
      "להסביר שאיש הצוות נשאר עד השעה 02:00 לכל המאוחר, או עד סיום הצורך בשירות בפועל — לפי המוקדם מביניהם.",
      "להסביר שהשירות כולל ניהול, פיזור ותיעוד בקבוקים בלבד, ולא כולל רכישה או אספקה של אלכוהול.",
      "להדגיש שהמטרה היא לצמצם פתיחה מיותרת של בקבוקים, לתעד כל בקבוק שנפתח או הוקצה, ולתת ללקוח דוח ממוחשב בסוף הערב.",
    ],
  },
  {
    title: "מה חובה לסגור מול הלקוח לפני מכירה",
    items: [
      "מי איש הקשר באירוע שמוסמך לתת הנחיות בנושא האלכוהול.",
      "אילו סוגי אלכוהול קיימים, כמה בקבוקים יש, ואיפה הם מאוחסנים באולם.",
      "איך הלקוח רוצה לפזר בקבוקים בשולחנות ובאיזה סדר עדיפויות לפתוח בקבוקים.",
      "להבהיר שבאירועים מעל 450 רשומות נדרש לבחור 2 אנשי צוות לניהול אלכוהול בעלות 2,000 ₪.",
      "להבהיר שהשירות אינו כולל רכישת אלכוהול או אספקת בקבוקים.",
    ],
  },
  {
    title: "נוסח מומלץ לסיכום עם הלקוח",
    items: [
      "השירות כולל איש צוות מתוך הצוות שמגיע לאולם, אשר יישאר עד השעה 02:00 לכל המאוחר לצורך ניהול, פיזור ותיעוד האלכוהול.",
      "איש הצוות יפעל לפי ההנחיות שסוכמו מראש עם בעל האירוע, יבדוק בקבוקים ריקים, יחליף או יקצה בקבוק נוסף רק במידת הצורך, ויתעד במערכת כל בקבוק שנפתח או הוקצה.",
      "בסיום הערב הלקוח יקבל דוח ממוחשב מסודר על ניהול האלכוהול בפועל.",
    ],
  },
];

const DETAILED_PERSONAL_REP_CUSTOMER_DETAILS: DetailSection[] = [
  {
    title: "נציג אישי לליווי",
    items: [
      "שירות נציג אישי לליווי כולל ליווי אישי וממוקד לאורך תהליך ניהול האירוע במערכת, בהתאם לחבילה שנבחרה ולצרכים שסוכמו מול הלקוח.",
      "השירות נועד לתת ללקוח מענה אישי, סדר ובקרה לאורך הדרך, לעזור לו להבין את מצב האירוע במערכת, לעקוב אחרי הנתונים, לקבל עדכונים שוטפים ולבצע פעולות חשובות בצורה מסודרת יותר עד מועד האירוע.",
    ],
  },
  {
    title: "מטרת השירות",
    items: [
      "מטרת השירות היא להעניק ללקוח ליווי אישי בתהליך ההכנות, כך שלא יצטרך להתמודד לבד עם כל הנתונים, הרשימות, אישורי ההגעה וההושבה הדיגיטלית.",
      "הנציג האישי מסייע ללקוח לעקוב אחרי התקדמות האירוע, להבין מה כבר בוצע, מה עדיין פתוח, אילו נתונים דורשים תשומת לב, ומה מומלץ לעשות בשלבים הבאים.",
    ],
  },
  {
    title: "מה כולל הליווי האישי",
    items: [
      "במסגרת השירות ימונה ללקוח נציג אישי מטעמנו אשר ילווה אותו מרחוק לאורך תקופת ההכנות לאירוע.",
      "הליווי כולל מעבר על נתוני האירוע במערכת, בדיקת סטטוס אישורי ההגעה, מעקב אחר רשימת המוזמנים, סיוע בהבנת הנתונים ומתן הכוונה לגבי המשך הפעולות הנדרשות במערכת.",
      "הנציג יסייע ללקוח להבין את תמונת המצב של האירוע, כולל כמות מאשרים, כמות לא מגיעים, אורחים שטרם ענו, שינויים ברשימות ועדכונים חשובים לקראת האירוע.",
    ],
  },
  {
    title: "עדכונים שוטפים",
    items: [
      "השירות כולל עדכון ומעבר עם הלקוח פעמיים בשבוע, בהתאם להתקדמות האירוע ולשלב שבו נמצא הלקוח בתהליך.",
      "במהלך העדכונים הנציג יעבור עם הלקוח על הנתונים המרכזיים במערכת, יציף נקודות שדורשות טיפול, ויסייע ללקוח להבין מה מומלץ לבצע בהמשך.",
      "העדכונים נועדו לשמור על סדר, להפחית עומס מהלקוח, ולוודא שהלקוח נמצא בשליטה על הנתונים לקראת האירוע.",
    ],
  },
  {
    title: "סיוע בהושבה דיגיטלית מרחוק",
    items: [
      "ככל שהלקוח משתמש במערכת ההושבה הדיגיטלית, הנציג האישי יסייע מרחוק בבניית ההושבה ובארגון השולחנות בהתאם לסקיצת האולם ולנתונים שהלקוח מספק.",
      "הסיוע יכול לכלול הכוונה בבניית שולחנות, שיוך אורחים לשולחנות, בדיקת חוסרים, התאמות לפי משפחות או קבוצות, וסידור ראשוני או עדכונים בהתאם לשינויים שמתקבלים במערכת.",
      "הלקוח נדרש להעביר את סקיצת האולם, כמות השולחנות, כמות הכיסאות בכל שולחן וכל מידע נוסף הדרוש לצורך סיוע בבניית ההושבה.",
    ],
  },
  {
    title: "אופי השירות והבהרות",
    items: [
      "שירות הנציג האישי מתבצע מרחוק ואינו כולל הגעה פיזית לאולם ביום האירוע, אלא אם נרכש בנפרד שירות הושבה באולם.",
      "הנציג האישי מסייע ללקוח בניהול, מעקב, הכוונה וסדר במערכת, אך אינו מחליף את אחריות הלקוח לעדכון פרטים, אישור שינויים, העברת רשימות, קבלת החלטות או אישור סופי של סידורי ההושבה.",
      "החלטות סופיות לגבי רשימות, אישורי הגעה, הושבה, פתיחת שולחנות, שינויים מול האולם או כל התחייבות אחרת נשארות באחריות הלקוח או נציג מוסמך מטעמו.",
    ],
  },
];

const DETAILED_PERSONAL_REP_EMPLOYEE_DETAILS: DetailSection[] = [
  {
    title: "מה העובד צריך להסביר בשיחה",
    items: [
      "להסביר שזה שירות ליווי אישי מרחוק ללקוח לאורך תקופת ההכנות לאירוע.",
      "להדגיש שהלקוח מקבל מעבר ועדכון פעמיים בשבוע על הנתונים, אישורי ההגעה והמשימות הפתוחות במערכת.",
      "להסביר שהשירות כולל סיוע בהושבה דיגיטלית מרחוק לפי סקיצת אולם, אבל לא כולל הגעה פיזית לאולם.",
      "אם הלקוח רוצה צוות פיזי באולם ביום האירוע — צריך להוסיף אפסייל הושבה באולם בנפרד.",
    ],
  },
  {
    title: "מה חובה לסגור מול הלקוח",
    items: [
      "שהליווי הוא מרחוק בלבד.",
      "שהלקוח צריך להעביר רשימות, סקיצה ועדכונים בזמן כדי שניתן יהיה לסייע בצורה מסודרת.",
      "שהנציג מלווה ומכוון, אך החלטות סופיות נשארות באחריות הלקוח או נציג מוסמך מטעמו.",
      "לתעד בסיכום השיחה שהוסבר ללקוח מה כולל השירות ומה אינו כולל.",
    ],
  },
];

const DETAILED_SUPPLIERS_BUDGET_CUSTOMER_DETAILS: DetailSection[] = [
  {
    title: "מערכת עצמאית לניהול ספקים ותקציב",
    items: [
      "השירות כולל פתיחת אזור עצמאי במערכת לניהול ספקים, תקציב, הוצאות ולוחות זמנים של האירוע.",
      "המערכת נועדה לאפשר ללקוח לרכז במקום אחד את כל הספקים, המחירים, המקדמות, היתרות, החוזים והנתונים הכספיים של האירוע.",
    ],
  },
  {
    title: "ניהול ספקים ומחירים",
    items: [
      "ניתן להוסיף ספקים לפי תחומים, לרבות שם ספק, פרטי התקשרות, מחיר כולל, סכום מקדמה, יתרה לתשלום והערות חשובות.",
      "המערכת מציגה תמונת מצב מסודרת של כל ההתחייבויות מול הספקים ומאפשרת מעקב אחר ההוצאות בצורה נוחה וברורה.",
    ],
  },
  {
    title: "חישובים אוטומטיים",
    items: [
      "המערכת מחשבת אוטומטית כמה שולם, כמה נותר לשלם, סכומי מקדמות ויתרות פתוחות מול הספקים.",
      "המערכת מחשבת עלות ממוצעת לאדם לפי כמות האורחים וההוצאות שהוזנו, כדי לעזור ללקוח להבין את המשמעות הכספית של האירוע ביחס לכמות המשתתפים.",
    ],
  },
  {
    title: "מסמכים וחוזים",
    items: [
      "בכל כרטיס ספק ניתן להעלות חוזים, מסמכים וקבצים רלוונטיים, כדי שכל המידע החשוב יהיה מרוכז תחת אותו ספק.",
      "העלאת החוזים מיועדת לנוחות הלקוח ולשמירת סדר במסמכים, ואינה מהווה בדיקה משפטית או אישור מקצועי של תוכן ההסכמים.",
    ],
  },
  {
    title: "תכנון לו״ז אירוע",
    items: [
      "המערכת כוללת אפשרות לתכנון לו״ז האירוע, ריכוז משימות, שלבים וזמנים חשובים לקראת האירוע ובמהלכו.",
      "מטרת הלו״ז היא לעזור ללקוח לשמור על סדר, להבין מה מתוכנן ומתי, ולרכז את פרטי האירוע במקום אחד.",
    ],
  },
  {
    title: "הבהרות חשובות",
    items: [
      "המערכת היא כלי לניהול עצמי של הלקוח ואינה מחליפה ייעוץ מקצועי, ייעוץ משפטי, ייעוץ פיננסי או אחריות של הלקוח מול הספקים.",
      "האחריות להזנת נתונים נכונים, עדכון תשלומים, בדיקת חוזים וקבלת החלטות מול ספקים נשארת באחריות הלקוח.",
    ],
  },
];

const DETAILED_SUPPLIERS_BUDGET_EMPLOYEE_DETAILS: DetailSection[] = [
  {
    title: "מה העובד צריך להסביר בשיחה",
    items: [
      "להסביר שזה אזור עצמאי ללקוח לניהול ספקים, תקציב, מקדמות, יתרות, חוזים ולו״ז אירוע.",
      "להדגיש שהמערכת מחשבת אוטומטית כמה שולם, כמה נשאר לשלם, ומה העלות הממוצעת לאדם לפי כמות אורחים והוצאות.",
      "להסביר שניתן להעלות חוזים וקבצים תחת כל ספק כדי לשמור הכול במקום אחד.",
      "להבהיר שהמערכת היא כלי ניהול עצמי ולא ייעוץ משפטי/פיננסי או בדיקת חוזים.",
    ],
  },
  {
    title: "הטבה",
    items: [
      "ברכישות מעל 1,000 ₪ העובד רשאי לתת את המודול ללא עלות אם ההטבה מסומנת במערכת.",
      "אם ההטבה ניתנת ללא עלות — היא תופיע בסיכום העסקה כ'ללא עלות'.",
    ],
  },
];

const UPSELLS: UpsellItem[] = [
  {
    key: "digitalSeating",
    title: "הושבה דיגיטלית באתר",
    price: 100,
    availableForPlans: ["easy", "smart"],
    description: "תוספת לחבילות קל להזמין / מזמינים חכם בלבד.",
    customerDetails: DIGITAL_SEATING_DETAILS,
    employeeDetails: [
      {
        title: "דגשים לעובד",
        items: [
          "לבחור רק אם הלקוח רוכש חבילה 1 או 2 ורוצה הושבה דיגיטלית באתר.",
          "בחבילת מזמינים ומושיבים ההושבה הדיגיטלית כבר כלולה ואין צורך לבחור תוספת.",
        ],
      },
    ],
  },
  {
    key: "creditGifts",
    title: "מתנות באשראי דרך ספק חיצוני",
    price: 150,
    availableForPlans: ["easy", "smart"],
    description: "תוספת לקבלת מתנות באשראי דרך ספק חיצוני.",
    customerDetails: CREDIT_GIFTS_DETAILS,
    employeeDetails: [
      {
        title: "דגשים לעובד",
        items: [
          "בחבילת קל להזמין התוספת היא 150 ₪.",
          "בחבילת מזמינים חכם התוספת היא 100 ₪.",
          "בחבילת מזמינים ומושיבים מתנות באשראי כלול בחבילה ואין צורך לבחור תוספת.",
          "להבהיר שהשירות מתבצע דרך ספק חיצוני, ותנאי הסליקה, העמלות והעברות הכספים הם לפי תנאי הספק.",
        ],
      },
    ],
  },
  {
    key: "venueSeating",
    title: "הושבה באולם",
    price: 1000,
    description: "צוות פיזי להושבה ביום האירוע, לפי כמות אנשי צוות שנבחרה.",
    customerDetails: VENUE_SEATING_CUSTOMER_DETAILS,
    employeeDetails: [
      {
        title: "דגשים לעובד",
        items: [
          "להסביר שזה שירות פיזי באולם ולא מערכת דיגיטלית בלבד.",
          "לסגור מול הלקוח שעת הגעה, איש קשר באירוע וסקיצת אולם.",
          "פתיחת רזרבות מול האולם נעשית רק באישור נציג המשפחה או גורם מוסמך.",
        ],
      },
    ],
  },
  {
    key: "personalRepresentative",
    title: "נציג אישי לליווי",
    price: 450,
    description: "ליווי מרחוק, מעבר ועדכון פעמיים בשבוע ועזרה בהושבה דיגיטלית.",
    customerDetails: PERSONAL_REP_CUSTOMER_DETAILS,
    employeeDetails: [
      {
        title: "דגשים לעובד",
        items: [
          "להבהיר שהליווי מרחוק בלבד.",
          "הלקוח צריך להעביר סקיצה, רשימות ועדכונים בזמן כדי שניתן יהיה לסייע.",
        ],
      },
    ],
  },
  {
    key: "thirdRsvpRound",
    title: "תוספת סבב 3 לאישורי הגעה",
    price: 90,
    description: "פתיחת סבב הודעות שלישי מעבר ל־2 הסבבים הכלולים.",
    customerDetails: [
      {
        title: "סבב שלישי לאישורי הגעה",
        items: [
          "פתיחת סבב הודעות נוסף לאישורי הגעה מעבר ל־2 הסבבים הכלולים בחבילה.",
          "הסבב מיועד למוזמנים שעדיין לא ענו או למי שנדרש אליו ניסיון נוסף.",
          "ניתן לשלוח את הסבב בהתאם לערוצי ההודעות הפעילים במערכת.",
        ],
      },
    ],
    employeeDetails: [
      {
        title: "דגשים לעובד",
        items: ["להסביר שסבב שנשלח לא נשלח רטרואקטיבית לאורחים שנוספו אחריו."],
      },
    ],
  },
  {
    key: "suppliersBudgetSystem",
    title: "מערכת עצמאית לניהול ספקים ותקציב",
    price: 200,
    description: "פתיחת אזור ניהול ספקים, תקציב, חוזים ולו״ז אירוע.",
    note: "ברכישות מעל 1,000 ₪ ניתן לתת ללא עלות לפי שיקול העובד.",
    customerDetails: SUPPLIERS_BUDGET_CUSTOMER_DETAILS,
    employeeDetails: [
      {
        title: "דגשים לעובד",
        items: [
          "להסביר שזה כלי ניהול עצמי ללקוח.",
          "אם העסקה מעל 1,000 ₪ ניתן לסמן ללא עלות, והמערכת תציג זאת בהצעה ובהסכם.",
        ],
      },
    ],
  },
  {
    key: "alcoholManagement",
    title: "ניהול אלכוהול באולם",
    price: 1200,
    description: "ניהול, פיזור ותיעוד אלכוהול באולם עד 02:00 לכל המאוחר.",
    customerDetails: ALCOHOL_CUSTOMER_DETAILS,
    employeeDetails: [
      {
        title: "דגשים לעובד",
        items: [
          "להבהיר שהשירות אינו כולל רכישת אלכוהול או אספקת בקבוקים.",
          "מעל 450 רשומות חובה לבחור 2 אנשי צוות בעלות 2,000 ₪.",
        ],
      },
    ],
  },
];

const CANCELLATION_TERMS: DetailSection[] = [
  {
    title: "תנאי ביטול",
    items: [
      "מרגע ביצוע התשלום נפתח ללקוח משתמש במערכת ונפתחת גישה לשירותים הדיגיטליים שנרכשו, ולכן לא ניתן לבטל שירותים דיגיטליים לאחר פתיחת הגישה והשימוש במערכת.",
      "שירותים הניתנים ביום האירוע, כגון הושבה באולם וניהול אלכוהול באולם, ניתנים לביטול רק בהודעה מוקדמת של יותר מחודש לפני מועד האירוע.",
      "במקרה של ביטול שירות יום אירוע בהתראה של יותר מחודש, יתרת השירות שטרם סופקה תבוטל, אך דמי השריון ששולמו מראש לא יוחזרו, מאחר שהם מיועדים לשריון הצוות ותאריך האירוע מראש.",
      "ביטול שירותי יום אירוע בהתראה של חודש או פחות ממועד האירוע אינו מזכה בהחזר, אלא אם סוכם אחרת בכתב.",
      "במקרה של ביטול או דחיית אירוע עקב כוח עליון, לרבות מלחמה, מצב ביטחוני חריג, הנחיית רשויות או נסיבות חיצוניות שאינן בשליטת הלקוח או Invistimo, ניתן יהיה לדחות את השירותים למועד האירוע החדש, בכפוף לזמינות ולתיאום מראש. שירותים דיגיטליים שטרם נוצלו בפועל יידחו גם הם למועד החדש, ולא ייחשבו כמבוטלים.",
    ],
  },
];

const PAYMENT_TERMS: DetailSection[] = [
  {
    title: "תנאי תשלום",
    items: [
      "שירותים דיגיטליים ושירותי הכנה לפני האירוע משולמים במלואם במועד ביצוע העסקה.",
      "שירותי יום האירוע, לרבות הושבה באולם וניהול אלכוהול באולם, משולמים לפי הבחירה בעסקה: תשלום מלא מראש או תשלום ראשוני ויתרה ביום האירוע.",
      "כאשר נבחר תשלום ראשוני ויתרה ביום האירוע, שירותי יום האירוע מחושבים כך: 50% במועד ביצוע העסקה לצורך שריון הצוות והתאריך, ו־50% ביום האירוע.",
      "המחיר הסופי בהצעת המחיר ובהסכם מוצג כולל מע״מ.",
    ],
  },
];

function createEmptyUpsells(): SelectedUpsells {
  return {
    digitalSeating: false,
    creditGifts: false,
    venueSeating: false,
    personalRepresentative: false,
    thirdRsvpRound: false,
    suppliersBudgetSystem: false,
    alcoholManagement: false,
  };
}

function asNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function money(value: unknown) {
  return asNumber(value).toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  });
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function clampRecords(value: unknown) {
  const parsed = Math.floor(asNumber(value));
  if (parsed <= 0) return 1;
  if (parsed > 1000) return 1000;
  return parsed;
}

function getSelectedPlan(planKey: PackageKey) {
  return PACKAGE_PLANS.find((plan) => plan.key === planKey) || PACKAGE_PLANS[0];
}

function getTierForRecords(plan: PackagePlan, records: number) {
  const safeRecords = clampRecords(records);
  return plan.tiers.find((tier) => safeRecords <= tier.maxRecords) || plan.tiers[plan.tiers.length - 1];
}

function calculatePackagePrice(plan: PackagePlan, records: number) {
  const safeRecords = clampRecords(records);
  const tier = getTierForRecords(plan, safeRecords);
  const pricePerRecord = tier.price / tier.maxRecords;
  const finalPrice = roundMoney(pricePerRecord * safeRecords);

  return {
    records: safeRecords,
    tierMaxRecords: tier.maxRecords,
    tierPrice: tier.price,
    pricePerRecord: roundMoney(pricePerRecord),
    finalPrice,
  };
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(value: string) {
  if (!value) return "לא הוגדר";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("he-IL");
}

function isEventDayService(key: UpsellKey) {
  return key === "venueSeating" || key === "alcoholManagement";
}

function getVenueOption(staffCount: VenueSeatingStaffCount) {
  return VENUE_SEATING_OPTIONS.find((option) => option.staffCount === staffCount) || VENUE_SEATING_OPTIONS[0];
}

function getAlcoholOption(staffCount: AlcoholManagementStaffCount) {
  return ALCOHOL_OPTIONS.find((option) => option.staffCount === staffCount) || ALCOHOL_OPTIONS[0];
}

function getUpsellPrice(
  upsell: UpsellItem,
  venueStaff: VenueSeatingStaffCount,
  alcoholStaff: AlcoholManagementStaffCount,
  planKey: PackageKey = "easy",
) {
  if (upsell.key === "venueSeating") return getVenueOption(venueStaff).price;
  if (upsell.key === "alcoholManagement") return getAlcoholOption(alcoholStaff).price;
  if (upsell.key === "creditGifts") {
    if (planKey === "smart") return 100;
    if (planKey === "easy") return 150;
    return 0;
  }
  return upsell.price;
}

function getUpsellTitle(upsell: UpsellItem, venueStaff: VenueSeatingStaffCount, alcoholStaff: AlcoholManagementStaffCount) {
  if (upsell.key === "venueSeating") return `${upsell.title} — ${getVenueOption(venueStaff).title}`;
  if (upsell.key === "alcoholManagement") return `${upsell.title} — ${getAlcoholOption(alcoholStaff).title}`;
  return upsell.title;
}

function getUpsellDescription(upsell: UpsellItem, venueStaff: VenueSeatingStaffCount, alcoholStaff: AlcoholManagementStaffCount) {
  if (upsell.key === "venueSeating") return `${upsell.description} ${getVenueOption(venueStaff).description}`;
  if (upsell.key === "alcoholManagement") return `${upsell.description} ${getAlcoholOption(alcoholStaff).description}`;
  return upsell.description;
}

function Icon({ name, className = "h-5 w-5" }: { name: "arrow" | "save" | "check" | "info" | "card" | "shield" | "sms" | "eye" | "lock"; className?: string }) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (name === "check") return <svg {...common}><path d="m20 6-11 11-5-5" /></svg>;
  if (name === "save") return <svg {...common}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></svg>;
  if (name === "info") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>;
  if (name === "card") return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18" /><path d="M7 15h3" /></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (name === "sms") return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>;
  if (name === "eye") return <svg {...common}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
  if (name === "lock") return <svg {...common}><rect x="4" y="11" width="16" height="10" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
  return <svg {...common}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>;
}


function getCustomerDetailsForPlan(plan: PackagePlan): DetailSection[] {
  return [
    {
      title: "פירוט ללקוח",
      items: [plan.customerSummary, ...plan.includes],
    },
  ];
}

function getEmployeeDetailsForPlan(plan: PackagePlan): DetailSection[] {
  return [
    ...plan.employeeDetails,
    {
      title: "דגשים להצגה בשיחה",
      items: [
        "לעבור עם הלקוח על החבילה שנבחרה, כמות הרשומות והמחיר.",
        "להסביר שהמחיר מחושב אוטומטית לפי כמות הרשומות והתוספות שנבחרו.",
        "אם נשלחת הצעת מחיר, לוודא מול הלקוח האם להציג בה פירוט מחירי תוספות או רק מחיר כולל.",
      ],
    },
  ];
}

function getCustomerSectionsForUpsell(upsell: UpsellItem): DetailSection[] {
  if (upsell.key === "venueSeating") return DETAILED_VENUE_SEATING_CUSTOMER_DETAILS;
  if (upsell.key === "alcoholManagement") return DETAILED_ALCOHOL_MANAGEMENT_CUSTOMER_DETAILS;
  if (upsell.key === "personalRepresentative") return DETAILED_PERSONAL_REP_CUSTOMER_DETAILS;
  if (upsell.key === "suppliersBudgetSystem") return DETAILED_SUPPLIERS_BUDGET_CUSTOMER_DETAILS;
  if (upsell.key === "creditGifts") return CREDIT_GIFTS_DETAILS;

  return upsell.customerDetails || [];
}

function getEmployeeSectionsForUpsell(upsell: UpsellItem): DetailSection[] {
  if (upsell.key === "venueSeating") return DETAILED_VENUE_SEATING_EMPLOYEE_DETAILS;
  if (upsell.key === "alcoholManagement") return DETAILED_ALCOHOL_MANAGEMENT_EMPLOYEE_DETAILS;
  if (upsell.key === "personalRepresentative") return DETAILED_PERSONAL_REP_EMPLOYEE_DETAILS;
  if (upsell.key === "suppliersBudgetSystem") return DETAILED_SUPPLIERS_BUDGET_EMPLOYEE_DETAILS;

  return upsell.employeeDetails || [];
}

function DetailsModal({ details, onClose }: { details: DetailsModalState; onClose: () => void }) {
  const [activeView, setActiveView] = useState<"employee" | "customer">(
    details?.defaultView || "customer",
  );

  if (!details) return null;

  const employeeSections = details.employeeSections || details.sections;
  const customerSections = details.customerSections || details.sections;
  const currentSections =
    activeView === "customer" ? customerSections : employeeSections;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-[32px] border border-[#eadfce] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#eadfce] bg-[#fff7ec] p-5 sm:p-6">
          <div className="min-w-0 flex-1">
            <p className="inline-flex rounded-full border border-[#d8b777] bg-white px-4 py-2 text-xs font-black text-[#8a5c20]">
              פירוט מלא
            </p>

            <h3 className="mt-3 text-2xl font-black text-[#3f3327]">
              {details.title}
            </h3>

            {details.subtitle ? (
              <p className="mt-2 text-sm font-semibold leading-6 text-[#7b6a58]">
                {details.subtitle}
              </p>
            ) : null}

            {typeof details.price === "number" ? (
              <p className="mt-3 text-lg font-black text-[#3f3327]">
                מחיר: {money(details.price)}
              </p>
            ) : null}

            <div className="mt-4 inline-flex rounded-2xl border border-[#eadfce] bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveView("customer")}
                className={`h-9 rounded-xl px-4 text-xs font-black transition ${
                  activeView === "customer"
                    ? "bg-[#3f3327] text-white shadow-sm"
                    : "text-[#7b6a58] hover:bg-[#fff7ec]"
                }`}
              >
                סיכום ללקוח
              </button>

              <button
                type="button"
                onClick={() => setActiveView("employee")}
                className={`h-9 rounded-xl px-4 text-xs font-black transition ${
                  activeView === "employee"
                    ? "bg-[#3f3327] text-white shadow-sm"
                    : "text-[#7b6a58] hover:bg-[#fff7ec]"
                }`}
              >
                סיכום לעובד
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#eadfce] bg-white text-xl font-black text-[#7b6a58] transition hover:bg-[#fffdf9]"
          >
            ×
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-5 sm:p-6">
          <div className="mb-4 rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3 text-xs font-bold leading-5 text-[#7b6a58]">
            {activeView === "customer"
              ? "זה הפירוט שיוצג/יישמר ללקוח בהצעת המחיר או בהסכם."
              : "זה הפירוט הפנימי לעובד: מה להסביר, מה לוודא ומה לסכם בשיחה."}
          </div>

          <div className="space-y-4">
            {currentSections.map((section) => (
              <section
                key={section.title}
                className="rounded-[26px] border border-[#eadfce] bg-[#fffdf9] p-4"
              >
                <h4 className="text-lg font-black text-[#3f3327]">
                  {section.title}
                </h4>

                <ul className="mt-3 space-y-2">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm font-semibold leading-7 text-[#5b4a3a]"
                    >
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff3df] text-[#b47a3b]">
                        <Icon name="check" className="h-3.5 w-3.5" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSalesNewPage() {
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [customerIdNumber, setCustomerIdNumber] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [venueName, setVenueName] = useState("");

  const [selectedPlanKey, setSelectedPlanKey] = useState<PackageKey>("smart");
  const [records, setRecords] = useState("300");
  const [selectedUpsells, setSelectedUpsells] = useState<SelectedUpsells>(() => createEmptyUpsells());
  const [venueSeatingStaffCount, setVenueSeatingStaffCount] = useState<VenueSeatingStaffCount>(2);
  const [alcoholManagementStaffCount, setAlcoholManagementStaffCount] = useState<AlcoholManagementStaffCount>(1);
  const [suppliersBudgetFree, setSuppliersBudgetFree] = useState(false);

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("split");
  const [adminPaymentStatus, setAdminPaymentStatus] = useState<"stripe" | "manual_paid">("stripe");
  const [adminPackagePriceOverride, setAdminPackagePriceOverride] = useState<number | "">("");
  const [adminUpsellPriceOverrides, setAdminUpsellPriceOverrides] = useState<Partial<Record<UpsellKey, number | "">>>({});
  const [adminDiscountType, setAdminDiscountType] = useState<AdminDiscountType>("none");
  const [adminDiscountValue, setAdminDiscountValue] = useState<number | "">("");
  const [adminCustomTotalEnabled, setAdminCustomTotalEnabled] = useState(false);
  const [adminCustomTotal, setAdminCustomTotal] = useState<number | "">("");
  const [adminSpecialOfferExpiresAt, setAdminSpecialOfferExpiresAt] = useState("");
  const [manualPaymentReference, setManualPaymentReference] = useState("");
  const [manualPaymentNote, setManualPaymentNote] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("quote");
  const [quotePricingDisplay, setQuotePricingDisplay] =
    useState<QuotePricingDisplay>("showUpsellPrices");

  const [detailsModal, setDetailsModal] = useState<DetailsModalState>(null);
  const [generatedDocument, setGeneratedDocument] = useState<{
    type: DocumentType;
    url: string;
    token?: string;
    expiresAt: string;
    smsSentAt?: string;
    status?: string;
    signedAt?: string;
  } | null>(null);
  const [documentSaving, setDocumentSaving] = useState(false);
  const [documentSuccess, setDocumentSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const quoteCreatedAt = useMemo(() => toDateInputValue(new Date()), []);
  const quoteExpiresAt = useMemo(() => toDateInputValue(addDays(new Date(), QUOTE_VALIDITY_DAYS)), []);

  const selectedPlan = useMemo(() => getSelectedPlan(selectedPlanKey), [selectedPlanKey]);
  const packageCalculation = useMemo(() => calculatePackagePrice(selectedPlan, clampRecords(records)), [records, selectedPlan]);

  const canGiveSuppliersBudgetFree = useMemo(() => {
    const totalWithoutSuppliers = packageCalculation.finalPrice + UPSELLS.reduce((sum, upsell) => {
      if (upsell.key === "suppliersBudgetSystem") return sum;
      if (!selectedUpsells[upsell.key]) return sum;
      return sum + getUpsellPrice(upsell, venueSeatingStaffCount, alcoholManagementStaffCount, selectedPlanKey);
    }, 0);

    return totalWithoutSuppliers >= 1000;
  }, [alcoholManagementStaffCount, packageCalculation.finalPrice, selectedPlanKey, selectedUpsells, venueSeatingStaffCount]);

  const availableUpsells = useMemo(() => {
    return UPSELLS.filter((upsell) => !upsell.availableForPlans || upsell.availableForPlans.includes(selectedPlanKey));
  }, [selectedPlanKey]);

  const selectedUpsellsList = useMemo(() => {
    return availableUpsells.filter((upsell) => selectedUpsells[upsell.key]);
  }, [availableUpsells, selectedUpsells]);

  const packageBasePrice = packageCalculation.finalPrice;

  const effectivePackagePrice = useMemo(() => {
    const override = Number(adminPackagePriceOverride);
    return adminPackagePriceOverride !== "" && Number.isFinite(override) && override >= 0
      ? roundMoney(override)
      : packageBasePrice;
  }, [adminPackagePriceOverride, packageBasePrice]);

  const getEffectiveUpsellPrice = useCallback(
    (upsell: UpsellItem) => {
      const freeApplied =
        upsell.key === "suppliersBudgetSystem" &&
        suppliersBudgetFree &&
        canGiveSuppliersBudgetFree;

      if (freeApplied) return 0;

      const overrideValue = adminUpsellPriceOverrides[upsell.key];
      const override = Number(overrideValue);

      if (overrideValue !== undefined && overrideValue !== "" && Number.isFinite(override) && override >= 0) {
        return roundMoney(override);
      }

      return getUpsellPrice(upsell, venueSeatingStaffCount, alcoholManagementStaffCount, selectedPlanKey);
    },
    [adminUpsellPriceOverrides, alcoholManagementStaffCount, canGiveSuppliersBudgetFree, selectedPlanKey, suppliersBudgetFree, venueSeatingStaffCount],
  );

  const upsellsTotal = useMemo(() => {
    return selectedUpsellsList.reduce((sum, upsell) => sum + getEffectiveUpsellPrice(upsell), 0);
  }, [getEffectiveUpsellPrice, selectedUpsellsList]);

  const baseGrossAmount = useMemo(
    () => roundMoney(effectivePackagePrice + upsellsTotal),
    [effectivePackagePrice, upsellsTotal],
  );

  const fullPaymentDiscountAmount = useMemo(() => {
    if (paymentMode !== "full") return 0;
    return roundMoney(baseGrossAmount * 0.05);
  }, [baseGrossAmount, paymentMode]);

  const adminManualDiscountAmount = useMemo(() => {
    const rawValue = Number(adminDiscountValue || 0);
    if (!Number.isFinite(rawValue) || rawValue <= 0 || adminDiscountType === "none") return 0;

    if (adminDiscountType === "percent") {
      return roundMoney(baseGrossAmount * Math.min(rawValue, 100) / 100);
    }

    return roundMoney(Math.min(rawValue, baseGrossAmount));
  }, [adminDiscountType, adminDiscountValue, baseGrossAmount]);

  const paymentDiscountAmount = useMemo(() => {
    return roundMoney(Math.min(baseGrossAmount, fullPaymentDiscountAmount + adminManualDiscountAmount));
  }, [adminManualDiscountAmount, baseGrossAmount, fullPaymentDiscountAmount]);

  const calculatedFinalGrossAmount = useMemo(
    () => roundMoney(Math.max(0, baseGrossAmount - paymentDiscountAmount)),
    [baseGrossAmount, paymentDiscountAmount],
  );

  const finalGrossAmount = useMemo(() => {
    if (!adminCustomTotalEnabled) return calculatedFinalGrossAmount;

    const customTotal = Number(adminCustomTotal || 0);
    return Number.isFinite(customTotal) && customTotal > 0
      ? roundMoney(customTotal)
      : 0;
  }, [adminCustomTotal, adminCustomTotalEnabled, calculatedFinalGrossAmount]);

  const netAmount = useMemo(
    () => roundMoney(finalGrossAmount / (1 + VAT_RATE)),
    [finalGrossAmount],
  );

  const paymentSchedule = useMemo<PaymentSchedule>(() => {
    const nonEventUpsellsTotal = selectedUpsellsList.reduce((sum, upsell) => {
      if (isEventDayService(upsell.key)) return sum;
      return sum + getEffectiveUpsellPrice(upsell);
    }, 0);

    const eventServicesTotal = selectedUpsellsList.reduce((sum, upsell) => {
      if (!isEventDayService(upsell.key)) return sum;
      return sum + getEffectiveUpsellPrice(upsell);
    }, 0);

    const preEventServicesTotal = roundMoney(effectivePackagePrice + nonEventUpsellsTotal);
    const roundedEventServicesTotal = roundMoney(eventServicesTotal);

    if (paymentMode === "full") {
      return {
        paymentMode,
        originalGrossAmount: baseGrossAmount,
        discountAmount: paymentDiscountAmount,
        finalGrossAmount,
        preEventServicesTotal,
        eventServicesTotal: roundedEventServicesTotal,
        eventServicesDeposit: roundedEventServicesTotal,
        eventServicesBalance: 0,
        immediateTotal: finalGrossAmount,
        eventDayTotal: 0,
        stripeAmount: finalGrossAmount,
      };
    }

    const eventServicesDeposit = roundMoney(roundedEventServicesTotal * 0.5);
    const eventServicesBalance = roundMoney(roundedEventServicesTotal - eventServicesDeposit);
    const immediateTotal = roundMoney(preEventServicesTotal + eventServicesDeposit);

    return {
      paymentMode,
      originalGrossAmount: baseGrossAmount,
      discountAmount: 0,
      finalGrossAmount,
      preEventServicesTotal,
      eventServicesTotal: roundedEventServicesTotal,
      eventServicesDeposit,
      eventServicesBalance,
      immediateTotal,
      eventDayTotal: eventServicesBalance,
      stripeAmount: immediateTotal,
    };
  }, [baseGrossAmount, effectivePackagePrice, finalGrossAmount, getEffectiveUpsellPrice, paymentDiscountAmount, paymentMode, selectedUpsellsList]);

  const extraRecordPrice = packageCalculation.pricePerRecord;

  const extraRecordsTerms = useMemo<DetailSection[]>(() => [
    {
      title: "רשומות נוספות",
      items: [
        `העסקה כוללת ${packageCalculation.records} רשומות. כל רשומה נוספת מעבר לכמות שנרכשה תחויב לפי ${money(extraRecordPrice)} לרשומה, בהתאם למחיר הממוצע לרשומה בחבילה שנבחרה.`,
      ],
    },
  ], [extraRecordPrice, packageCalculation.records]);

  const finalPaymentTerms = useMemo(
    () => [...PAYMENT_TERMS, ...extraRecordsTerms],
    [extraRecordsTerms],
  );

  const showUpsellPricesInDocument =
    quotePricingDisplay === "showUpsellPrices";

  const customerDealSummary = useMemo(() => ({
    packageTitle: selectedPlan.title,
    packageSummary: selectedPlan.customerSummary,
    records: packageCalculation.records,
    pricePerRecord: extraRecordPrice,
    extraRecordPrice,
    extraRecordsNote: `כל רשומה נוספת מעבר ל-${packageCalculation.records} רשומות תחויב לפי ${money(extraRecordPrice)} לרשומה.`,
    originalTotalPrice: baseGrossAmount,
    discountAmount: paymentDiscountAmount,
    totalPrice: finalGrossAmount,
    eventName: eventName.trim(),
    eventDate,
    eventCity: eventCity.trim(),
    venueName: venueName.trim(),
    quoteCreatedAt,
    quoteExpiresAt,
    paymentMode,
    paymentSchedule,
    quotePricingDisplay,
    showUpsellPricesInDocument,
    pricingDisplayMode: quotePricingDisplay,
    cancellationTerms: CANCELLATION_TERMS,
    paymentTerms: finalPaymentTerms,
    extraRecordsTerms,
    includedItems: selectedPlan.includes,
    upsells: selectedUpsellsList.map((upsell) => {
      const effectivePrice = getEffectiveUpsellPrice(upsell);
      const givenFree =
        upsell.key === "suppliersBudgetSystem" &&
        suppliersBudgetFree &&
        canGiveSuppliersBudgetFree;

      return {
        title: getUpsellTitle(upsell, venueSeatingStaffCount, alcoholManagementStaffCount),
        description: getUpsellDescription(upsell, venueSeatingStaffCount, alcoholManagementStaffCount),
        customerDetails: getCustomerSectionsForUpsell(upsell),
        price: effectivePrice,
        actualPrice: effectivePrice,
        documentPrice: showUpsellPricesInDocument ? effectivePrice : undefined,
        displayPrice: showUpsellPricesInDocument ? effectivePrice : undefined,
        priceLabel: showUpsellPricesInDocument ? money(effectivePrice) : " ",
        showPriceInDocument: showUpsellPricesInDocument,
        hidePriceInDocument: !showUpsellPricesInDocument,
        givenFree,
        showFreeLabelInDocument: showUpsellPricesInDocument && givenFree,
      };
    }),
  }), [alcoholManagementStaffCount, baseGrossAmount, canGiveSuppliersBudgetFree, eventCity, eventDate, eventName, extraRecordPrice, extraRecordsTerms, finalGrossAmount, finalPaymentTerms, packageCalculation.records, paymentDiscountAmount, paymentMode, paymentSchedule, quoteCreatedAt, quoteExpiresAt, quotePricingDisplay, selectedPlan.customerSummary, selectedPlan.includes, selectedPlan.title, selectedUpsellsList, showUpsellPricesInDocument, suppliersBudgetFree, venueSeatingStaffCount, getEffectiveUpsellPrice]);

  const effectiveEventDate = eventDate || quoteCreatedAt;
  const effectiveEventCity = eventCity.trim() || "לא הוגדרה";
  const effectiveVenueName = venueName.trim() || "לא הוגדר";
  const effectiveEventName = eventName.trim() || "אירוע";

  const documentPayload = useMemo(() => ({
    type: documentType,
    quotePricingDisplay,
    showUpsellPricesInDocument,
    pricingDisplayMode: quotePricingDisplay,
    client: {
      fullName: clientName.trim(),
      idNumber: customerIdNumber.trim(),
      email: clientEmail.trim(),
      phone: clientPhone.trim(),
      address: clientAddress.trim(),
    },
    event: {
      name: effectiveEventName,
      date: effectiveEventDate,
      city: effectiveEventCity,
      venueName: effectiveVenueName,
    },
    quote: {
      createdAt: quoteCreatedAt,
      expiresAt: quoteExpiresAt,
      validityDays: QUOTE_VALIDITY_DAYS,
    },
    selectedPackage: {
      key: selectedPlan.key,
      title: selectedPlan.title,
      customerSummary: selectedPlan.customerSummary,
      includes: selectedPlan.includes,
      records: packageCalculation.records,
      price: effectivePackagePrice,
      originalCalculatedPrice: packageCalculation.finalPrice,
      priceOverriddenByAdmin: effectivePackagePrice !== packageCalculation.finalPrice,
      pricePerRecord: extraRecordPrice,
      extraRecordPrice,
      extraRecordsNote: `כל רשומה נוספת מעבר ל-${packageCalculation.records} רשומות תחויב לפי ${money(extraRecordPrice)} לרשומה.`,
      actualPrice: effectivePackagePrice,
      documentPrice: showUpsellPricesInDocument ? effectivePackagePrice : undefined,
      displayPrice: showUpsellPricesInDocument ? effectivePackagePrice : undefined,
      priceLabel: showUpsellPricesInDocument ? money(effectivePackagePrice) : " ",
      showPriceInDocument: showUpsellPricesInDocument,
      hidePriceInDocument: !showUpsellPricesInDocument,
    },
    upsells: selectedUpsellsList.map((upsell) => {
      const originalDynamicPrice = getUpsellPrice(upsell, venueSeatingStaffCount, alcoholManagementStaffCount, selectedPlanKey);
      const dynamicPrice = getEffectiveUpsellPrice(upsell);
      const givenFree = upsell.key === "suppliersBudgetSystem" && suppliersBudgetFree && canGiveSuppliersBudgetFree;

      return {
        key: upsell.key,
        title: getUpsellTitle(upsell, venueSeatingStaffCount, alcoholManagementStaffCount),
        description: getUpsellDescription(upsell, venueSeatingStaffCount, alcoholManagementStaffCount),
        price: dynamicPrice,
        actualPrice: dynamicPrice,
        documentPrice: showUpsellPricesInDocument ? dynamicPrice : undefined,
        displayPrice: showUpsellPricesInDocument ? dynamicPrice : undefined,
        priceLabel: showUpsellPricesInDocument ? money(dynamicPrice) : " ",
        originalCalculatedPrice: originalDynamicPrice,
        priceOverriddenByAdmin: dynamicPrice !== originalDynamicPrice,
        givenFree,
        showFreeLabelInDocument: showUpsellPricesInDocument && givenFree,
        customerDetails: getCustomerSectionsForUpsell(upsell),
        employeeDetails: getEmployeeSectionsForUpsell(upsell),
        showPriceInDocument: showUpsellPricesInDocument,
        hidePriceInDocument: !showUpsellPricesInDocument,
        paymentType: isEventDayService(upsell.key) ? "event_day_service" : "pre_event_service",
      };
    }),
    totals: {
      grossAmount: finalGrossAmount,
      originalGrossAmount: baseGrossAmount,
      discountAmount: paymentDiscountAmount,
      netAmount,
      vatRate: VAT_RATE,
      paymentMode,
      records: packageCalculation.records,
      pricePerRecord: extraRecordPrice,
      extraRecordPrice,
      extraRecordsNote: `כל רשומה נוספת מעבר ל-${packageCalculation.records} רשומות תחויב לפי ${money(extraRecordPrice)} לרשומה.`,
      stripeAmount: paymentSchedule.stripeAmount,
      quotePricingDisplay,
      showUpsellPricesInDocument,
      pricingDisplayMode: quotePricingDisplay,
      paymentSchedule,
    },
    customerDealSummary,
    cancellationTerms: CANCELLATION_TERMS,
    paymentTerms: finalPaymentTerms,
  }), [alcoholManagementStaffCount, baseGrossAmount, canGiveSuppliersBudgetFree, clientAddress, clientEmail, clientName, clientPhone, customerDealSummary, customerIdNumber, documentType, effectiveEventCity, effectiveEventDate, effectiveEventName, effectiveVenueName, extraRecordPrice, finalGrossAmount, finalPaymentTerms, netAmount, effectivePackagePrice, getEffectiveUpsellPrice, packageCalculation.finalPrice, packageCalculation.records, paymentDiscountAmount, paymentMode, paymentSchedule, quoteCreatedAt, quoteExpiresAt, quotePricingDisplay, selectedPlan.customerSummary, selectedPlan.includes, selectedPlan.key, selectedPlan.title, selectedUpsellsList, showUpsellPricesInDocument, suppliersBudgetFree, venueSeatingStaffCount, getEffectiveUpsellPrice]);

  const documentRequestPayload = useMemo(() => {
    if (showUpsellPricesInDocument) return documentPayload;

    return {
      ...documentPayload,
      selectedPackage: {
        ...documentPayload.selectedPackage,
        price: null,
        documentPrice: null,
        displayPrice: null,
        priceLabel: " ",
        showPriceInDocument: false,
        hidePriceInDocument: true,
        showLinePriceInDocument: false,
        hideLinePriceInDocument: true,
        priceHiddenInDocument: true,
        linePriceHiddenInDocument: true,
      },
      upsells: documentPayload.upsells.map((upsell) => ({
        ...upsell,
        price: null,
        documentPrice: null,
        displayPrice: null,
        priceLabel: " ",
        showPriceInDocument: false,
        hidePriceInDocument: true,
        showLinePriceInDocument: false,
        hideLinePriceInDocument: true,
        priceHiddenInDocument: true,
        linePriceHiddenInDocument: true,
        showFreeLabelInDocument: false,
      })),
      customerDealSummary: {
        ...documentPayload.customerDealSummary,
        upsells: documentPayload.customerDealSummary.upsells.map((upsell) => ({
          ...upsell,
          price: null,
          documentPrice: null,
          displayPrice: null,
          priceLabel: " ",
          showPriceInDocument: false,
          hidePriceInDocument: true,
          showLinePriceInDocument: false,
          hideLinePriceInDocument: true,
          priceHiddenInDocument: true,
          linePriceHiddenInDocument: true,
          showFreeLabelInDocument: false,
        })),
      },
    };
  }, [documentPayload, showUpsellPricesInDocument]);

  const isDocumentActionDisabled = documentSaving || finalGrossAmount <= 0;

  const signedAgreementReady =
    generatedDocument?.type === "agreement" && generatedDocument.status === "signed";

  // באדמין הצעת מחיר/הסכם הם אופציונליים בלבד.
  // אפשר לפתוח לקוח, לסמן שולם ידנית או לעבור ל-Stripe גם בלי הסכם חתום.
  const isSubmitDisabled = saving || finalGrossAmount <= 0;

  function getMissingDocumentFields() {
    const missing: string[] = [];

    if (!clientName.trim()) missing.push("שם לקוח");
    if (!clientPhone.trim()) missing.push("טלפון לקוח");

    return missing;
  }

  function getMissingPaymentFields() {
    const missing: string[] = [];

    if (!clientName.trim()) missing.push("שם לקוח");
    if (!clientPhone.trim()) missing.push("טלפון לקוח");
    if (!eventDate) missing.push("תאריך אירוע");
    if (!eventCity.trim()) missing.push("עיר אירוע");
    if (!venueName.trim()) missing.push("שם אולם");

    return missing;
  }

  function toggleUpsell(key: UpsellKey) {
    setSelectedUpsells((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === "suppliersBudgetSystem" && !next[key]) setSuppliersBudgetFree(false);
      return next;
    });
  }

  function changePlan(nextPlan: PackageKey) {
    setSelectedPlanKey(nextPlan);
    if (nextPlan === "seating") {
      setSelectedUpsells((prev) => ({ ...prev, digitalSeating: false }));
    }
  }

  async function createDocument(action: "preview" | "sms") {
    const missing = getMissingDocumentFields();

    if (missing.length > 0) {
      setError(`כדי ליצור ${documentType === "quote" ? "הצעת מחיר" : "הסכם"} חסר: ${missing.join(", ")}`);
      return;
    }

    if (isDocumentActionDisabled) return;

    try {
      setError("");
      setDocumentSuccess("");
      setDocumentSaving(true);

      const response = await fetch("/api/employee/sales/documents", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentRequestPayload),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "שגיאה ביצירת קישור למסמך");
      }

      const url = data?.url || data?.documentUrl;
      const token = data?.token;
      if (!url || !token) throw new Error("לא התקבל קישור למסמך");

      const nextDocument = {
        type: documentType,
        url,
        token,
        expiresAt: data?.expiresAt || quoteExpiresAt,
        status: data?.document?.status || data?.status || "draft",
        signedAt:
          data?.document?.signedAt ||
          data?.document?.signature?.signedAt ||
          data?.document?.agreement?.signedAt ||
          "",
      };

      if (action === "preview") {
        setGeneratedDocument(nextDocument);
        setDocumentSuccess(documentType === "quote" ? "הצעת המחיר נוצרה ונפתחה לתצוגה מקדימה" : "ההסכם נוצר ונפתח לתצוגה מקדימה");
        window.open(`${url}?preview=1`, "_blank", "noopener,noreferrer");
        return;
      }

      const smsResponse = await fetch(`/api/employee/sales/documents/${token}/send-sms`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clientPhone.trim() }),
      });
      const smsData = await smsResponse.json().catch(() => null);

      if (!smsResponse.ok || smsData?.success === false) {
        throw new Error(smsData?.message || smsData?.error || "הקישור נוצר, אבל שליחת ה־SMS נכשלה");
      }

      setGeneratedDocument({ ...nextDocument, smsSentAt: new Date().toISOString() });
      setDocumentSuccess(documentType === "quote" ? "הצעת המחיר נשלחה ב-SMS" : "קישור ההסכם נשלח ב-SMS");
    } catch (documentError) {
      console.error("CREATE OR SEND SALES DOCUMENT FAILED:", documentError);
      setError(documentError instanceof Error ? documentError.message : "שגיאה ביצירת/שליחת מסמך");
    } finally {
      setDocumentSaving(false);
    }
  }

  async function refreshGeneratedDocumentStatus() {
    if (!generatedDocument?.token) {
      setError("אין קישור הסכם לבדיקה");
      return;
    }

    try {
      setError("");
      setDocumentSuccess("");
      setDocumentSaving(true);

      const response = await fetch(
        `/api/sales-documents/${generatedDocument.token}?markViewed=false`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false || !data?.document) {
        throw new Error(data?.message || data?.error || "שגיאה בבדיקת סטטוס ההסכם");
      }

      const signedAt =
        data.document?.signedAt ||
        data.document?.signature?.signedAt ||
        data.document?.agreement?.signedAt ||
        "";

      setGeneratedDocument((prev) =>
        prev
          ? {
              ...prev,
              status: data.document?.status || prev.status,
              signedAt,
            }
          : prev,
      );

      if (data.document?.status === "signed") {
        setDocumentSuccess("ההסכם נחתם — ניתן לעבור לתשלום");
        return;
      }

      setDocumentSuccess("ההסכם עדיין לא נחתם. לאחר שהלקוח יחתום, לחצי שוב על בדיקת חתימה.");
    } catch (statusError) {
      console.error("CHECK SALES DOCUMENT STATUS FAILED:", statusError);
      setError(
        statusError instanceof Error
          ? statusError.message
          : "שגיאה בבדיקת סטטוס ההסכם",
      );
    } finally {
      setDocumentSaving(false);
    }
  }

  async function submitSale(event: React.FormEvent) {
    event.preventDefault();

    const missing = getMissingPaymentFields();

    if (missing.length > 0) {
      setError(`כדי לעבור לתשלום חסר: ${missing.join(", ")}`);
      return;
    }

    if (isSubmitDisabled) return;

    try {
      setError("");
      setSaving(true);

      const response = await fetch("/api/admin/sales", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          clientPhone: clientPhone.trim(),
          customerIdNumber: customerIdNumber.trim(),
          clientAddress: clientAddress.trim(),

          eventName: eventName.trim(),
          eventDate,
          eventCity: eventCity.trim(),
          venueName: venueName.trim(),

          plan: selectedPlan.key,
          packageName: selectedPlan.title,
          guests: packageCalculation.records,
          records: packageCalculation.records,

          grossAmount: finalGrossAmount,
          originalGrossAmount: baseGrossAmount,
          discountAmount: paymentDiscountAmount,

          status: "pending",
          signedAgreementToken: generatedDocument?.token || "",

          selectedPackage: documentPayload.selectedPackage,
          upsells: documentPayload.upsells,
          quote: documentPayload.quote,
          totals: documentPayload.totals,
          customerDealSummary,
          cancellationTerms: CANCELLATION_TERMS,
          paymentTerms: finalPaymentTerms,
          paymentSchedule,
          paymentMode,
          adminPaymentStatus,
          manualPaymentReference: manualPaymentReference.trim(),
          manualPaymentNote: manualPaymentNote.trim(),
          adminPricingOverride: {
            enabled: adminCustomTotalEnabled,
            customTotal: adminCustomTotalEnabled ? finalGrossAmount : 0,
            originalCalculatedTotal: calculatedFinalGrossAmount,
            packageBasePrice,
            effectivePackagePrice,
            packagePriceOverride: adminPackagePriceOverride === "" ? null : Number(adminPackagePriceOverride),
            upsellPriceOverrides: adminUpsellPriceOverrides,
            discountType: adminDiscountType,
            discountValue: adminDiscountValue === "" ? 0 : Number(adminDiscountValue),
            fullPaymentDiscountAmount,
            adminManualDiscountAmount,
            specialOfferExpiresAt: adminSpecialOfferExpiresAt,
          },

          notes: manualPaymentNote.trim(),

          saleCompliance: {
            recordedCall: false,
            cardOwnerConfirmed: false,
            cardHolderPresentAndApproved: false,
            saleSummaryConfirmed: true,
            termsConfirmed: true,
            summary: manualPaymentNote.trim(),
          },

          payment: {
            method: "stripe",
            provider: "stripe",
            amount: finalGrossAmount,
            originalAmount: baseGrossAmount,
            discountAmount: paymentDiscountAmount,
            immediateAmount: paymentSchedule.immediateTotal,
            stripeAmount: paymentSchedule.stripeAmount,
            eventDayAmount: paymentSchedule.eventDayTotal,
            mode: paymentMode,
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || data?.error || "שגיאה ביצירת הלקוח והמכירה",
        );
      }

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data?.stripeCheckoutUrl) {
        window.location.href = data.stripeCheckoutUrl;
        return;
      }

      if (data?.sale?.status === "paid" || data?.payment?.provider === "manual") {
        setError("");
        setDocumentSuccess("הלקוח נפתח וסומן כשולם ידנית בהצלחה. נשארת בעמוד כדי להמשיך לעבוד.");
        router.refresh();
        return;
      }

      throw new Error("הלקוח נוצר, אבל לא התקבל קישור תשלום");
    } catch (submitError) {
      console.error("CREATE EMPLOYEE SALE FAILED:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "שגיאה ביצירת הלקוח והמכירה",
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <div dir="rtl" className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f8fafc_38%,#eef2f7_100%)] text-slate-950">
      <DetailsModal details={detailsModal} onClose={() => setDetailsModal(null)} />

      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] border border-[#eadfce] bg-white/90 p-6 shadow-sm sm:p-8">
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <button type="button" onClick={() => router.push("/admin/crm")} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#5b4a3a] transition hover:bg-[#fff7ec]">
                <Icon name="arrow" className="h-4 w-4" />
                חזרה ל־CRM
              </button>

              <p className="mt-5 inline-flex rounded-full border border-[#eadfce] bg-[#fff7ec] px-4 py-2 text-sm font-black text-[#8a5c20]">
                יצירת עסקה / הצעת מחיר / הסכם
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">יצירת לקוח חדש ותשלום</h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-slate-600">
                האדמין יוצר לקוח בדיוק כמו במסך העובד: הצעת מחיר, הסכם, חתימה ותשלום. בנוסף אפשר לבחור שולם ידנית, לערוך מחיר ידנית ולהגדיר מבצע מוגבל בזמן.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:w-[560px]">
              <div className="rounded-[24px] border border-[#eadfce] bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-black text-[#3f3327]">שיחה מוקלטת</p>
                <p className="mt-1 text-xs font-semibold leading-6 text-[#7b6a58]">חובה לסכם חבילה, מחיר, תנאי תשלום ותנאי ביטול בשיחה מוקלטת.</p>
              </div>
              <div className="rounded-[24px] border border-[#eadfce] bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-black text-[#3f3327]">מחיר אדמין</p>
                <p className="mt-1 text-xs font-semibold leading-6 text-[#7b6a58]">באדמין אפשר להשאיר מחיר מחושב אוטומטית או להפעיל מחיר ידני/מבצע מוגבל בזמן.</p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submitSale} className="mt-6 grid gap-6 xl:grid-cols-[1fr_430px]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[34px] border border-[#eadfce] bg-white shadow-sm">
              <div className="border-b border-[#eadfce] bg-[#fff7ec] p-5 sm:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="inline-flex rounded-full border border-[#d8b777] bg-white px-4 py-2 text-xs font-black text-[#8a5c20]">
                      שלב 1
                    </p>
                    <h2 className="mt-3 text-2xl font-black text-slate-950">
                      פרטי לקוח ואירוע
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[#7b6a58]">
                      כאן מזינים רק את הפרטים הדרושים לעובד לצורך יצירת הצעה/הסכם.
                      תעודת זהות וכתובת ימולאו על ידי הלקוח בקישור ההסכם בזמן החתימה.
                    </p>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#9b6a30] shadow-sm">
                    <Icon name="shield" />
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-black text-[#3f3327]">
                    שם לקוח
                    <input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                      required
                    />
                  </label>

                  <label className="text-sm font-black text-[#3f3327]">
                    טלפון
                    <input
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                      required
                    />
                  </label>

                  <label className="text-sm font-black text-[#3f3327] md:col-span-2">
                    מייל
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                      required
                    />
                  </label>

                  <label className="text-sm font-black text-[#3f3327]">
                    שם האירוע
                    <input
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="לדוגמה: חתונת הדר ו..."
                      className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                    />
                  </label>

                  <label className="text-sm font-black text-[#3f3327]">
                    תאריך אירוע
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                      required
                    />
                  </label>

                  <label className="text-sm font-black text-[#3f3327]">
                    עיר
                    <input
                      value={eventCity}
                      onChange={(e) => setEventCity(e.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                      required
                    />
                  </label>

                  <label className="text-sm font-black text-[#3f3327]">
                    שם האולם
                    <input
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                      required
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="inline-flex rounded-full border border-[#d8b777] bg-[#fff7ec] px-4 py-2 text-xs font-black text-[#8a5c20]">
                    שלב 2
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-slate-950">בחירת חבילה</h2>
                </div>
                <label className="text-sm font-black text-[#3f3327]">כמות רשומות<input type="number" min={1} max={1000} value={records} onChange={(e) => setRecords(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15 md:w-40" /></label>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {PACKAGE_PLANS.map((plan) => {
                  const active = selectedPlanKey === plan.key;
                  const calc = calculatePackagePrice(plan, packageCalculation.records);

                  return (
                    <button key={plan.key} type="button" onClick={() => changePlan(plan.key)} className={`rounded-[30px] border p-5 text-right transition ${active ? "border-[#b47a3b] bg-[#fff7ec] shadow-lg shadow-[#b47a3b]/10" : "border-[#eadfce] bg-white hover:border-[#d8b777]"}`}>
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff3df] text-[#b47a3b]"><Icon name="check" /></span>
                        <span className="rounded-full border border-[#eadfce] bg-white px-3 py-1 text-xs font-black text-[#8a6a43]">{plan.badge}</span>
                      </div>
                      <h3 className="mt-5 text-2xl font-black text-[#3f3327]">{plan.title}</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#7b6a58]">{plan.shortDescription}</p>
                      <div className="mt-5 rounded-[24px] border border-[#eadfce] bg-white p-4 text-center">
                        <p className="text-xs font-black text-[#8b7b68]">מחיר לפי {packageCalculation.records} רשומות</p>
                        <p className="mt-2 text-3xl font-black text-[#3f3327]">{money(calc.finalPrice)}</p>
                        <p className="mt-1 text-xs font-bold text-[#9a8976]">מדרגה עד {calc.tierMaxRecords} · ממוצע {money(calc.pricePerRecord)} לרשומה</p>
                        {active ? (
                          <label className="mt-3 block text-right text-xs font-black text-[#7b6a58]">
                            עריכת מחיר חבילה באדמין
                            <input
                              type="number"
                              min={0}
                              value={adminPackagePriceOverride}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => setAdminPackagePriceOverride(event.target.value === "" ? "" : Number(event.target.value))}
                              placeholder={`ברירת מחדל: ${calc.finalPrice}`}
                              className="mt-2 h-10 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-3 text-right text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                            />
                          </label>
                        ) : null}
                      </div>
                      <button type="button" onClick={(event) => { event.stopPropagation(); setDetailsModal({
                          title: plan.title,
                          subtitle: plan.customerSummary,
                          price: calc.finalPrice,
                          sections: getCustomerDetailsForPlan(plan),
                          customerSections: getCustomerDetailsForPlan(plan),
                          employeeSections: getEmployeeDetailsForPlan(plan),
                          defaultView: "customer",
                        }); }} className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-xs font-black text-[#7b6a58] transition hover:bg-[#fffdf9]"><Icon name="info" className="h-4 w-4" /> פירוט מלא</button>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-2xl font-black text-slate-950">תוספות ושירותים</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">בחבילות 1 ו־2 ניתן להוסיף הושבה דיגיטלית באתר ב־100 ₪. בחבילה 3 זה כבר כלול.</p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {availableUpsells.map((upsell) => {
                  const selected = selectedUpsells[upsell.key];
                  const dynamicPrice = getUpsellPrice(upsell, venueSeatingStaffCount, alcoholManagementStaffCount, selectedPlanKey);
                  const freeApplied = upsell.key === "suppliersBudgetSystem" && selected && suppliersBudgetFree && canGiveSuppliersBudgetFree;

                  return (
                    <div key={upsell.key} className={`rounded-[26px] border p-4 transition ${selected ? "border-[#b47a3b] bg-[#fff7ec]" : "border-[#eadfce] bg-white"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input type="checkbox" checked={selected} onChange={() => toggleUpsell(upsell.key)} className="mt-1 h-4 w-4 accent-[#9b7a3c]" />
                          <span>
                            <span className="block text-sm font-black text-[#3f3327]">{getUpsellTitle(upsell, venueSeatingStaffCount, alcoholManagementStaffCount)}</span>
                            <span className="mt-1 block text-xs font-semibold leading-5 text-[#7b6a58]">{getUpsellDescription(upsell, venueSeatingStaffCount, alcoholManagementStaffCount)}</span>
                            {upsell.note && <span className="mt-2 block text-xs font-black leading-5 text-[#9b6a30]">{upsell.note}</span>}
                          </span>
                        </label>
                        <div className="shrink-0 text-left text-sm font-black text-[#3f3327]">{freeApplied ? "ללא עלות" : money(getEffectiveUpsellPrice(upsell))}</div>
                      </div>

                      {selected && !freeApplied ? (
                        <label className="mt-3 block text-xs font-black text-[#7b6a58]">
                          עריכת מחיר אפסייל באדמין
                          <input
                            type="number"
                            min={0}
                            value={adminUpsellPriceOverrides[upsell.key] ?? ""}
                            onChange={(event) =>
                              setAdminUpsellPriceOverrides((prev) => ({
                                ...prev,
                                [upsell.key]: event.target.value === "" ? "" : Number(event.target.value),
                              }))
                            }
                            placeholder={`ברירת מחדל: ${dynamicPrice}`}
                            className="mt-2 h-10 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-3 text-right text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                          />
                        </label>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setDetailsModal({
                              title: getUpsellTitle(upsell, venueSeatingStaffCount, alcoholManagementStaffCount),
                              subtitle: getUpsellDescription(upsell, venueSeatingStaffCount, alcoholManagementStaffCount),
                              price: dynamicPrice,
                              sections: getCustomerSectionsForUpsell(upsell),
                              customerSections: getCustomerSectionsForUpsell(upsell),
                              employeeSections: getEmployeeSectionsForUpsell(upsell),
                              defaultView: "customer",
                            })} className="inline-flex h-8 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3 text-xs font-black text-[#7b6a58] transition hover:bg-[#fffdf9]"><Icon name="info" className="h-3.5 w-3.5" /> פירוט</button>

                        {upsell.key === "suppliersBudgetSystem" && selected && canGiveSuppliersBudgetFree && (
                          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-800">
                            <input type="checkbox" checked={suppliersBudgetFree} onChange={(e) => setSuppliersBudgetFree(e.target.checked)} className="accent-emerald-600" />
                            לתת ללא עלות
                          </label>
                        )}
                      </div>

                      {upsell.key === "venueSeating" && selected && (
                        <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-3">
                          <p className="text-xs font-black text-[#3f3327]">כמות אנשי צוות להושבה באולם</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {VENUE_SEATING_OPTIONS.map((option) => {
                              const disabled = Boolean(option.maxRecords && packageCalculation.records > option.maxRecords);
                              return (
                                <label key={option.staffCount} className={`rounded-2xl border p-3 text-xs font-bold leading-5 ${venueSeatingStaffCount === option.staffCount ? "border-[#b47a3b] bg-[#fff7ec]" : "border-[#eadfce] bg-[#fffdf9]"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                                  <input type="radio" name="venueStaff" checked={venueSeatingStaffCount === option.staffCount} disabled={disabled} onChange={() => setVenueSeatingStaffCount(option.staffCount)} className="ml-2 accent-[#9b7a3c]" />
                                  <span className="font-black">{option.title}</span>
                                  <span className="block">{money(option.price)}</span>
                                  <span className="block">{option.description}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {upsell.key === "alcoholManagement" && selected && (
                        <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-3">
                          <p className="text-xs font-black text-[#3f3327]">כמות אנשי צוות לניהול אלכוהול</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {ALCOHOL_OPTIONS.map((option) => {
                              const disabled = Boolean((option.maxRecords && packageCalculation.records > option.maxRecords) || (option.minRecords && packageCalculation.records < option.minRecords));
                              return (
                                <label key={option.staffCount} className={`rounded-2xl border p-3 text-xs font-bold leading-5 ${alcoholManagementStaffCount === option.staffCount ? "border-[#b47a3b] bg-[#fff7ec]" : "border-[#eadfce] bg-[#fffdf9]"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                                  <input type="radio" name="alcoholStaff" checked={alcoholManagementStaffCount === option.staffCount} disabled={disabled} onChange={() => setAlcoholManagementStaffCount(option.staffCount)} className="ml-2 accent-[#9b7a3c]" />
                                  <span className="font-black">{option.title}</span>
                                  <span className="block">{money(option.price)}</span>
                                  <span className="block">{option.description}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

          </div>

          <aside className="h-fit space-y-4 xl:sticky xl:top-6">
            <section className="overflow-hidden rounded-[34px] border border-[#eadfce] bg-white shadow-sm">
              <div className="border-b border-[#eadfce] bg-[#fff7ec] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-[#3f3327]">סיכום עסקה</h2>
                    <p className="mt-1 text-xs font-bold text-[#8b7b68]">המחיר אדמין ומחושב אוטומטית</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#9b6a30]"><Icon name="lock" /></div>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdf9] p-4">
                  <p className="text-xs font-black text-[#8b7b68]">חבילה נבחרת</p>
                  <p className="mt-1 text-lg font-black text-[#3f3327]">{selectedPlan.title}</p>
                  <p className="mt-1 text-xs font-bold text-[#9a8976]">{packageCalculation.records} רשומות · מדרגה עד {packageCalculation.tierMaxRecords}</p>
                </div>

                <div className="rounded-[24px] border border-[#eadfce] bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-[#5b4a3a]"><span>מחיר חבילה</span><span>{money(effectivePackagePrice)}</span></div>
                  <div className="flex items-center justify-between text-sm font-bold text-[#5b4a3a]"><span>תוספות</span><span>{money(upsellsTotal)}</span></div>
                  {selectedUpsellsList.map((upsell) => {
                    const free = upsell.key === "suppliersBudgetSystem" && suppliersBudgetFree && canGiveSuppliersBudgetFree;
                    return <div key={upsell.key} className="flex items-start justify-between border-t border-[#eadfce] pt-2 text-xs font-bold leading-5 text-[#8b7b68]"><span>{getUpsellTitle(upsell, venueSeatingStaffCount, alcoholManagementStaffCount)}</span><span>{free ? "ללא עלות" : money(getEffectiveUpsellPrice(upsell))}</span></div>;
                  })}
                </div>

                <div className="rounded-[24px] border border-[#d8b777] bg-[#fff7ec] p-4">
                  <p className="text-xs font-black text-[#8a5c20]">סה״כ עסקה כולל מע״מ</p>
                  {paymentDiscountAmount > 0 ? (
                    <div className="mt-2 space-y-1 text-xs font-bold text-[#7b6a58]">
                      <div className="flex items-center justify-between gap-3"><span>מחיר לפני הנחות</span><span className="line-through">{money(baseGrossAmount)}</span></div>
                      {fullPaymentDiscountAmount > 0 ? <div className="flex items-center justify-between gap-3 text-emerald-700"><span>הנחת תשלום מלא 5%</span><span>-{money(fullPaymentDiscountAmount)}</span></div> : null}
                      {adminManualDiscountAmount > 0 ? <div className="flex items-center justify-between gap-3 text-emerald-700"><span>הנחת אדמין</span><span>-{money(adminManualDiscountAmount)}</span></div> : null}
                    </div>
                  ) : null}
                  <p className="mt-2 text-4xl font-black tracking-tight text-[#3f3327]">{money(finalGrossAmount)}</p>
                  <p className="mt-1 text-xs font-bold text-[#8b7b68]">לפני מע״מ: {money(netAmount)}</p>
                </div>


                <div className="rounded-[24px] border border-[#eadfce] bg-white p-4">
                  <p className="text-sm font-black text-[#3f3327]">בחירת תשלום</p>
                  <div className="mb-4 rounded-[26px] border border-[#eadfce] bg-white p-4">
                    <p className="text-sm font-black text-[#3f3327]">אפשרויות אדמין</p>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-black text-[#7b6a58]">אופן גבייה</span>
                        <select
                          value={adminPaymentStatus}
                          onChange={(e) => setAdminPaymentStatus(e.target.value as "stripe" | "manual_paid")}
                          className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                        >
                          <option value="stripe">תשלום דרך Stripe</option>
                          <option value="manual_paid">שולם ידנית — לפתוח לקוח כשולם</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-black text-[#7b6a58]">תוקף מבצע / מחיר מיוחד</span>
                        <input
                          type="date"
                          value={adminSpecialOfferExpiresAt}
                          onChange={(e) => setAdminSpecialOfferExpiresAt(e.target.value)}
                          className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                        />
                      </label>
                    </div>

                    <label className="mt-4 flex items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3 text-sm font-black text-[#4b3b2a]">
                      <input
                        type="checkbox"
                        checked={adminCustomTotalEnabled}
                        onChange={(e) => setAdminCustomTotalEnabled(e.target.checked)}
                        className="h-4 w-4 accent-[#9b7a3c]"
                      />
                      עריכת מחיר חופשית / הנחה ידנית
                    </label>

                    {adminCustomTotalEnabled ? (
                      <label className="mt-3 block space-y-2">
                        <span className="text-xs font-black text-[#7b6a58]">מחיר סופי כולל מע״מ שהאדמין קובע</span>
                        <input
                          type="number"
                          min={0}
                          value={adminCustomTotal}
                          onChange={(e) => setAdminCustomTotal(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder={`מחיר מחושב כרגע: ${money(calculatedFinalGrossAmount)}`}
                          className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                        />
                      </label>
                    ) : null}


                    <div className="mt-4 rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
                      <p className="text-sm font-black text-[#3f3327]">הנחת אדמין</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <select
                          value={adminDiscountType}
                          onChange={(event) => setAdminDiscountType(event.target.value as AdminDiscountType)}
                          className="h-12 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                        >
                          <option value="none">ללא הנחה</option>
                          <option value="amount">הנחה בשקלים</option>
                          <option value="percent">הנחה באחוזים</option>
                        </select>

                        <input
                          type="number"
                          min={0}
                          value={adminDiscountValue}
                          onChange={(event) => setAdminDiscountValue(event.target.value === "" ? "" : Number(event.target.value))}
                          placeholder={adminDiscountType === "percent" ? "אחוז הנחה" : "סכום הנחה ₪"}
                          disabled={adminDiscountType === "none"}
                          className="h-12 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {adminPaymentStatus === "manual_paid" ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <input
                          type="text"
                          value={manualPaymentReference}
                          onChange={(e) => setManualPaymentReference(e.target.value)}
                          placeholder="אסמכתא / אמצעי תשלום ידני"
                          className="h-12 rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                        />
                        <input
                          type="text"
                          value={manualPaymentNote}
                          onChange={(e) => setManualPaymentNote(e.target.value)}
                          placeholder="הערה פנימית לתשלום ידני"
                          className="h-12 rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                        />
                      </div>
                    ) : null}
                  </div>

                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)} className="mt-3 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15">
                    <option value="split">תשלום ראשוני + יתרה ביום האירוע</option>
                    <option value="full">תשלום מלא עכשיו — 5% הנחה</option>
                  </select>

                  <div className="mt-4 space-y-2 text-xs font-bold leading-5 text-[#7b6a58]">
                    {paymentMode === "full" ? (
                      <>
                        <div className="flex items-center justify-between gap-3"><span>סה״כ לפני הנחה</span><span>{money(baseGrossAmount)}</span></div>
                        <div className="flex items-center justify-between gap-3 text-emerald-700"><span>הנחת תשלום מלא 5%</span><span>-{money(paymentDiscountAmount)}</span></div>
                        <div className="flex items-center justify-between gap-3 text-[#3f3327]"><span>לתשלום עכשיו</span><span>{money(paymentSchedule.immediateTotal)}</span></div>
                        <div className="flex items-center justify-between gap-3"><span>יתרה ביום האירוע</span><span>{money(0)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3"><span>תשלום ראשוני</span><span>{money(paymentSchedule.immediateTotal)}</span></div>
                        <div className="flex items-center justify-between gap-3"><span>יתרה ביום האירוע</span><span>{money(paymentSchedule.eventDayTotal)}</span></div>
                        <div className="flex items-center justify-between gap-3"><span>שירותים דיגיטליים/לפני האירוע</span><span>{money(paymentSchedule.preEventServicesTotal)}</span></div>
                        <div className="flex items-center justify-between gap-3"><span>שירותי יום אירוע</span><span>{money(paymentSchedule.eventServicesTotal)}</span></div>
                      </>
                    )}
                  </div>
                  <p className="mt-3 text-[11px] font-bold leading-5 text-[#8b7b68]">לתשלום עכשיו: {money(paymentSchedule.stripeAmount)}.</p>
                </div>

                <div className="rounded-[24px] border border-[#eadfce] bg-white p-4">
                  <p className="text-sm font-black text-[#3f3327]">הצעת מחיר / הסכם</p>
                  <select value={documentType} onChange={(e) => setDocumentType(e.target.value as DocumentType)} className="mt-3 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15">
                    <option value="quote">הצעת מחיר — צפייה בלבד</option>
                    <option value="agreement">הסכם תנאי עסקה — חתימה</option>
                  </select>
                  <p className="mt-3 text-xs font-bold leading-5 text-[#8b7b68]">תאריך הצעה: {formatDate(quoteCreatedAt)} · תקף עד: {formatDate(quoteExpiresAt)}</p>

                  <div className="mt-4 rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-3">
                    <p className="text-xs font-black text-[#3f3327]">
                      הצגת מחירים בהצעה/הסכם
                    </p>

                    <div className="mt-3 grid gap-2">
                      <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-[#eadfce] bg-white p-3 text-xs font-bold leading-5 text-[#6d5840]">
                        <input
                          type="radio"
                          name="quotePricingDisplay"
                          checked={quotePricingDisplay === "showUpsellPrices"}
                          onChange={() =>
                            setQuotePricingDisplay("showUpsellPrices")
                          }
                          className="mt-1 accent-[#9b7a3c]"
                        />
                        <span>
                          להציג מחיר לכל תוספת בנפרד + מחיר כולל
                        </span>
                      </label>

                      <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-[#eadfce] bg-white p-3 text-xs font-bold leading-5 text-[#6d5840]">
                        <input
                          type="radio"
                          name="quotePricingDisplay"
                          checked={quotePricingDisplay === "packageTotalOnly"}
                          onChange={() =>
                            setQuotePricingDisplay("packageTotalOnly")
                          }
                          className="mt-1 accent-[#9b7a3c]"
                        />
                        <span>
                          להציג רק מחיר חבילה כולל — בלי מחירי תוספות נפרדים
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <button type="button" disabled={isDocumentActionDisabled} onClick={() => createDocument("preview")} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d8b777] bg-[#fff7ec] px-5 text-sm font-black text-[#8a5c20] transition hover:bg-[#ffefd8] disabled:cursor-not-allowed disabled:opacity-40"><Icon name="eye" className="h-4 w-4" /> תצוגה מקדימה בחלון חדש</button>
                    <button type="button" disabled={isDocumentActionDisabled} onClick={() => createDocument("sms")} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><Icon name="sms" className="h-4 w-4" /> שליחה ישר ב־SMS</button>
                  </div>

                  {documentSaving ? (
                    <p className="mt-3 text-xs font-black text-[#8a5c20]">יוצר קישור...</p>
                  ) : null}

                  {documentSuccess ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">
                      {documentSuccess}
                    </div>
                  ) : null}

                  {generatedDocument && (
                    <div className={`mt-4 rounded-2xl border p-3 text-xs font-bold leading-5 ${
                      generatedDocument.status === "signed"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-[#eadfce] bg-[#fffdf9] text-[#6d5840]"
                    }`}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p>
                            קישור נוצר:{" "}
                            <a
                              href={generatedDocument.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              פתיחה
                            </a>
                          </p>
                          {generatedDocument.type === "agreement" ? (
                            <p className="mt-1">
                              סטטוס הסכם:{" "}
                              {generatedDocument.status === "signed"
                                ? "נחתם"
                                : "ממתין לחתימת לקוח"}
                            </p>
                          ) : null}
                        </div>

                        {generatedDocument.type === "agreement" ? (
                          <button
                            type="button"
                            onClick={refreshGeneratedDocumentStatus}
                            disabled={documentSaving}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-[#d8b777] bg-white px-3 text-xs font-black text-[#8a5c20] transition hover:bg-[#fff7ec] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            בדיקת חתימה
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold leading-6 text-emerald-800">
                  הצעת מחיר או הסכם הם אופציונליים באדמין. אפשר לפתוח לקוח ולהמשיך לתשלום גם בלי מסמך חתום.
                </div>

                <button type="submit" disabled={isSubmitDisabled} className="inline-flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#3f3327] px-5 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:bg-[#2f251d] disabled:cursor-not-allowed disabled:opacity-40">
                  <Icon name="save" className="h-4 w-4" />
                  {saving
                    ? "שומר..."
                    : adminPaymentStatus === "manual_paid"
                      ? `פתיחת לקוח וסימון כשולם ${money(paymentSchedule.stripeAmount)}`
                      : `פתיחת לקוח ומעבר לתשלום ${money(paymentSchedule.stripeAmount)}`}
                </button>
              </div>
            </section>
          </aside>
        </form>
      </main>
    </div>
  );
}
