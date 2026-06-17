"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const VAT_RATE = 0.18;
const COMMISSION_RATE = 0.05;
const QUOTE_VALIDITY_DAYS = 4;

type PackageKey = "easy" | "smart" | "seating";
type DocumentType = "quote" | "agreement";
type PaymentMode = "full" | "split";

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
  immediateTotal: number;
  eventDayTotal: number;
  preEventServicesTotal: number;
  eventServicesTotal: number;
  eventServicesDeposit: number;
  eventServicesBalance: number;
};

type DetailsModalState = {
  title: string;
  subtitle?: string;
  price?: number;
  sections: DetailSection[];
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
      "חבילת מזמינים ומושיבים כוללת הזמנה דיגיטלית על בסיס קובץ שהלקוח מעלה, 2 סבבי הודעות ב־WhatsApp או SMS, הודעת תזכורת, הודעת תודה, מוקד טלפוני ועד 3 סבבי שיחה, וכן מערכת הושבה דיגיטלית באתר לניהול שולחנות וסידורי הושבה.",
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

function getUpsellPrice(upsell: UpsellItem, venueStaff: VenueSeatingStaffCount, alcoholStaff: AlcoholManagementStaffCount) {
  if (upsell.key === "venueSeating") return getVenueOption(venueStaff).price;
  if (upsell.key === "alcoholManagement") return getAlcoholOption(alcoholStaff).price;
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

function DetailsModal({ details, onClose }: { details: DetailsModalState; onClose: () => void }) {
  if (!details) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-[32px] border border-[#eadfce] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#eadfce] bg-[#fff7ec] p-6">
          <div>
            <p className="inline-flex rounded-full border border-[#d8b777] bg-white px-4 py-2 text-xs font-black text-[#8a5c20]">פירוט מלא</p>
            <h3 className="mt-3 text-2xl font-black text-[#3f3327]">{details.title}</h3>
            {details.subtitle && <p className="mt-2 text-sm font-semibold leading-6 text-[#7b6a58]">{details.subtitle}</p>}
            {typeof details.price === "number" && <p className="mt-3 text-lg font-black text-[#3f3327]">מחיר: {money(details.price)}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfce] bg-white text-xl font-black text-[#7b6a58]">×</button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-6">
          <div className="space-y-4">
            {details.sections.map((section) => (
              <section key={section.title} className="rounded-[26px] border border-[#eadfce] bg-[#fffdf9] p-4">
                <h4 className="text-lg font-black text-[#3f3327]">{section.title}</h4>
                <ul className="mt-3 space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm font-semibold leading-7 text-[#5b4a3a]">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff3df] text-[#b47a3b]"><Icon name="check" className="h-3.5 w-3.5" /></span>
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

export default function NewEmployeeSalePage() {
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
  const [paymentStatus, setPaymentStatus] = useState<"stripe" | "paid">("stripe");
  const [documentType, setDocumentType] = useState<DocumentType>("quote");

  const [saleSummary, setSaleSummary] = useState("");
  const [confirmRecordedCall, setConfirmRecordedCall] = useState(false);
  const [confirmCardOwner, setConfirmCardOwner] = useState(false);
  const [confirmSaleSummary, setConfirmSaleSummary] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);

  const [detailsModal, setDetailsModal] = useState<DetailsModalState>(null);
  const [generatedDocument, setGeneratedDocument] = useState<{ type: DocumentType; url: string; expiresAt: string } | null>(null);
  const [documentSaving, setDocumentSaving] = useState(false);
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
      return sum + getUpsellPrice(upsell, venueSeatingStaffCount, alcoholManagementStaffCount);
    }, 0);

    return totalWithoutSuppliers >= 1000;
  }, [alcoholManagementStaffCount, packageCalculation.finalPrice, selectedUpsells, venueSeatingStaffCount]);

  const availableUpsells = useMemo(() => {
    return UPSELLS.filter((upsell) => !upsell.availableForPlans || upsell.availableForPlans.includes(selectedPlanKey));
  }, [selectedPlanKey]);

  const selectedUpsellsList = useMemo(() => {
    return availableUpsells.filter((upsell) => selectedUpsells[upsell.key]);
  }, [availableUpsells, selectedUpsells]);

  const upsellsTotal = useMemo(() => {
    return selectedUpsellsList.reduce((sum, upsell) => {
      if (upsell.key === "suppliersBudgetSystem" && suppliersBudgetFree && canGiveSuppliersBudgetFree) return sum;
      return sum + getUpsellPrice(upsell, venueSeatingStaffCount, alcoholManagementStaffCount);
    }, 0);
  }, [alcoholManagementStaffCount, canGiveSuppliersBudgetFree, selectedUpsellsList, suppliersBudgetFree, venueSeatingStaffCount]);

  const finalGrossAmount = useMemo(() => roundMoney(packageCalculation.finalPrice + upsellsTotal), [packageCalculation.finalPrice, upsellsTotal]);
  const netAmount = useMemo(() => roundMoney(finalGrossAmount / (1 + VAT_RATE)), [finalGrossAmount]);
  const commission = useMemo(() => roundMoney(netAmount * COMMISSION_RATE), [netAmount]);

  const paymentSchedule = useMemo<PaymentSchedule>(() => {
    const nonEventUpsellsTotal = selectedUpsellsList.reduce((sum, upsell) => {
      if (isEventDayService(upsell.key)) return sum;
      if (upsell.key === "suppliersBudgetSystem" && suppliersBudgetFree && canGiveSuppliersBudgetFree) return sum;
      return sum + getUpsellPrice(upsell, venueSeatingStaffCount, alcoholManagementStaffCount);
    }, 0);

    const eventServicesTotal = selectedUpsellsList.reduce((sum, upsell) => {
      if (!isEventDayService(upsell.key)) return sum;
      return sum + getUpsellPrice(upsell, venueSeatingStaffCount, alcoholManagementStaffCount);
    }, 0);

    const preEventServicesTotal = roundMoney(packageCalculation.finalPrice + nonEventUpsellsTotal);

    if (paymentMode === "full") {
      return {
        preEventServicesTotal,
        eventServicesTotal: roundMoney(eventServicesTotal),
        eventServicesDeposit: roundMoney(eventServicesTotal),
        eventServicesBalance: 0,
        immediateTotal: roundMoney(preEventServicesTotal + eventServicesTotal),
        eventDayTotal: 0,
      };
    }

    const eventServicesDeposit = roundMoney(eventServicesTotal * 0.5);
    const eventServicesBalance = roundMoney(eventServicesTotal - eventServicesDeposit);

    return {
      preEventServicesTotal,
      eventServicesTotal: roundMoney(eventServicesTotal),
      eventServicesDeposit,
      eventServicesBalance,
      immediateTotal: roundMoney(preEventServicesTotal + eventServicesDeposit),
      eventDayTotal: eventServicesBalance,
    };
  }, [alcoholManagementStaffCount, canGiveSuppliersBudgetFree, packageCalculation.finalPrice, paymentMode, selectedUpsellsList, suppliersBudgetFree, venueSeatingStaffCount]);

  const customerDealSummary = useMemo(() => ({
    packageTitle: selectedPlan.title,
    packageSummary: selectedPlan.customerSummary,
    records: packageCalculation.records,
    totalPrice: finalGrossAmount,
    eventName: eventName.trim(),
    eventDate,
    eventCity: eventCity.trim(),
    venueName: venueName.trim(),
    quoteCreatedAt,
    quoteExpiresAt,
    paymentMode,
    paymentSchedule,
    cancellationTerms: CANCELLATION_TERMS,
    paymentTerms: PAYMENT_TERMS,
    includedItems: selectedPlan.includes,
    upsells: selectedUpsellsList.map((upsell) => ({
      title: getUpsellTitle(upsell, venueSeatingStaffCount, alcoholManagementStaffCount),
      description: getUpsellDescription(upsell, venueSeatingStaffCount, alcoholManagementStaffCount),
      customerDetails: upsell.customerDetails,
      givenFree: upsell.key === "suppliersBudgetSystem" && suppliersBudgetFree && canGiveSuppliersBudgetFree,
    })),
  }), [alcoholManagementStaffCount, canGiveSuppliersBudgetFree, eventCity, eventDate, eventName, finalGrossAmount, packageCalculation.records, paymentMode, paymentSchedule, quoteCreatedAt, quoteExpiresAt, selectedPlan.customerSummary, selectedPlan.includes, selectedPlan.title, selectedUpsellsList, suppliersBudgetFree, venueName, venueSeatingStaffCount]);

  const documentPayload = useMemo(() => ({
    type: documentType,
    client: {
      fullName: clientName.trim(),
      idNumber: customerIdNumber.trim(),
      email: clientEmail.trim(),
      phone: clientPhone.trim(),
      address: clientAddress.trim(),
    },
    event: {
      name: eventName.trim(),
      date: eventDate,
      city: eventCity.trim(),
      venueName: venueName.trim(),
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
      price: packageCalculation.finalPrice,
    },
    upsells: selectedUpsellsList.map((upsell) => {
      const dynamicPrice = getUpsellPrice(upsell, venueSeatingStaffCount, alcoholManagementStaffCount);
      const givenFree = upsell.key === "suppliersBudgetSystem" && suppliersBudgetFree && canGiveSuppliersBudgetFree;

      return {
        key: upsell.key,
        title: getUpsellTitle(upsell, venueSeatingStaffCount, alcoholManagementStaffCount),
        description: getUpsellDescription(upsell, venueSeatingStaffCount, alcoholManagementStaffCount),
        price: givenFree ? 0 : dynamicPrice,
        givenFree,
        customerDetails: upsell.customerDetails,
        paymentType: isEventDayService(upsell.key) ? "event_day_service" : "pre_event_service",
      };
    }),
    totals: {
      grossAmount: finalGrossAmount,
      netAmount,
      vatRate: VAT_RATE,
      paymentMode,
      paymentSchedule,
    },
    customerDealSummary,
    cancellationTerms: CANCELLATION_TERMS,
    paymentTerms: PAYMENT_TERMS,
  }), [alcoholManagementStaffCount, canGiveSuppliersBudgetFree, clientAddress, clientEmail, clientName, clientPhone, customerDealSummary, customerIdNumber, documentType, eventCity, eventDate, eventName, finalGrossAmount, netAmount, packageCalculation.finalPrice, packageCalculation.records, paymentMode, paymentSchedule, quoteCreatedAt, quoteExpiresAt, selectedPlan.customerSummary, selectedPlan.includes, selectedPlan.key, selectedPlan.title, selectedUpsellsList, suppliersBudgetFree, venueName, venueSeatingStaffCount]);

  const isDocumentActionDisabled = documentSaving || !clientName.trim() || !clientPhone.trim() || !eventDate || !eventCity.trim() || !venueName.trim() || finalGrossAmount <= 0;

  const isSubmitDisabled =
    saving ||
    !clientName.trim() ||
    !clientEmail.trim() ||
    !clientPhone.trim() ||
    !eventDate ||
    !eventCity.trim() ||
    !venueName.trim() ||
    !saleSummary.trim() ||
    !confirmRecordedCall ||
    !confirmCardOwner ||
    !confirmSaleSummary ||
    !confirmTerms ||
    finalGrossAmount <= 0;

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
    if (isDocumentActionDisabled) return;

    try {
      setError("");
      setDocumentSaving(true);

      const response = await fetch("/api/employee/sales/documents", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentPayload),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "שגיאה ביצירת קישור למסמך");
      }

      const url = data?.url || data?.documentUrl;
      const token = data?.token;
      if (!url || !token) throw new Error("לא התקבל קישור למסמך");

      setGeneratedDocument({ type: documentType, url, expiresAt: data?.expiresAt || quoteExpiresAt });

      if (action === "preview") {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      const smsResponse = await fetch(`/api/employee/sales/documents/${token}/send-sms`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const smsData = await smsResponse.json().catch(() => null);

      if (!smsResponse.ok || smsData?.success === false) {
        throw new Error(smsData?.message || smsData?.error || "הקישור נוצר, אבל שליחת ה־SMS נכשלה");
      }

      alert(documentType === "quote" ? "הצעת המחיר נשלחה ב־SMS" : "קישור ההסכם נשלח ב־SMS");
    } catch (documentError) {
      console.error("CREATE OR SEND SALES DOCUMENT FAILED:", documentError);
      setError(documentError instanceof Error ? documentError.message : "שגיאה ביצירת/שליחת מסמך");
    } finally {
      setDocumentSaving(false);
    }
  }

  async function submitSale(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitDisabled) return;

    try {
      setError("");
      setSaving(true);

      const response = await fetch("/api/employee/sales", {
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
          status: paymentStatus === "paid" ? "paid" : "pending",
          selectedPackage: documentPayload.selectedPackage,
          upsells: documentPayload.upsells,
          quote: documentPayload.quote,
          totals: documentPayload.totals,
          customerDealSummary,
          cancellationTerms: CANCELLATION_TERMS,
          paymentTerms: PAYMENT_TERMS,
          paymentSchedule,
          paymentMode,
          notes: saleSummary.trim(),
          saleCompliance: {
            recordedCall: confirmRecordedCall,
            cardOwnerConfirmed: confirmCardOwner,
            cardHolderPresentAndApproved: confirmCardOwner,
            saleSummaryConfirmed: confirmSaleSummary,
            termsConfirmed: confirmTerms,
            summary: saleSummary.trim(),
          },
          payment: {
            method: paymentStatus,
            provider: paymentStatus === "stripe" ? "stripe" : "manual",
            amount: finalGrossAmount,
            immediateAmount: paymentSchedule.immediateTotal,
            eventDayAmount: paymentSchedule.eventDayTotal,
            mode: paymentMode,
          },
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "שגיאה ביצירת הלקוח והמכירה");
      }

      if (paymentStatus === "stripe") {
        if (data?.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
        if (data?.userId) {
          const checkoutResponse = await fetch(`/api/admin/users/${data.userId}/checkout`, {
            method: "POST",
            credentials: "include",
          });
          const checkoutData = await checkoutResponse.json().catch(() => null);
          if (checkoutData?.checkoutUrl) {
            window.location.href = checkoutData.checkoutUrl;
            return;
          }
        }
        throw new Error("הלקוח נוצר, אבל לא התקבל קישור תשלום Stripe");
      }

      alert("הלקוח והעסקה נוצרו בהצלחה");
      router.push("/employee/sales");
      router.refresh();
    } catch (submitError) {
      console.error("CREATE EMPLOYEE SALE FAILED:", submitError);
      setError(submitError instanceof Error ? submitError.message : "שגיאה ביצירת הלקוח והמכירה");
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
              <button type="button" onClick={() => router.push("/employee/sales")} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#5b4a3a] transition hover:bg-[#fff7ec]">
                <Icon name="arrow" className="h-4 w-4" />
                חזרה למכירות
              </button>

              <p className="mt-5 inline-flex rounded-full border border-[#eadfce] bg-[#fff7ec] px-4 py-2 text-sm font-black text-[#8a5c20]">
                יצירת עסקה / הצעת מחיר / הסכם
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">יצירת לקוח חדש ותשלום</h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-slate-600">
                העובד בוחר חבילה, כמות רשומות ושירותים בלבד. המחיר, המע״מ, התשלום הראשוני והיתרה ביום האירוע מחושבים אוטומטית.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:w-[560px]">
              <div className="rounded-[24px] border border-[#eadfce] bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-black text-[#3f3327]">שיחה מוקלטת</p>
                <p className="mt-1 text-xs font-semibold leading-6 text-[#7b6a58]">חובה לסכם חבילה, מחיר, תנאי תשלום ותנאי ביטול בשיחה מוקלטת.</p>
              </div>
              <div className="rounded-[24px] border border-[#eadfce] bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-black text-[#3f3327]">מחיר נעול</p>
                <p className="mt-1 text-xs font-semibold leading-6 text-[#7b6a58]">אין עריכת מחיר ידנית. כל המחירים מגיעים ממדרגות ותוספות מוגדרות.</p>
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
            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-2xl font-black text-slate-950">פרטי לקוח ואירוע</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-black text-[#3f3327]">שם לקוח<input value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15" required /></label>
                <label className="text-sm font-black text-[#3f3327]">טלפון<input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15" required /></label>
                <label className="text-sm font-black text-[#3f3327]">מייל<input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15" required /></label>
                <label className="text-sm font-black text-[#3f3327]">תעודת זהות<input value={customerIdNumber} onChange={(e) => setCustomerIdNumber(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15" /></label>
                <label className="text-sm font-black text-[#3f3327] md:col-span-2">כתובת לחתימה בהסכם<input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15" /></label>
                <label className="text-sm font-black text-[#3f3327]">שם האירוע<input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="לדוגמה: חתונת הדר ו..." className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15" /></label>
                <label className="text-sm font-black text-[#3f3327]">תאריך אירוע<input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15" required /></label>
                <label className="text-sm font-black text-[#3f3327]">עיר<input value={eventCity} onChange={(e) => setEventCity(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15" required /></label>
                <label className="text-sm font-black text-[#3f3327]">שם האולם<input value={venueName} onChange={(e) => setVenueName(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15" required /></label>
              </div>
            </section>

            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">בחירת חבילה</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">הפירוט ללקוח מלא ולא משתמש בניסוח “כל מה שכלול בחבילה...”.</p>
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
                      </div>
                      <button type="button" onClick={(event) => { event.stopPropagation(); setDetailsModal({ title: plan.title, subtitle: plan.customerSummary, price: calc.finalPrice, sections: [{ title: "פירוט ללקוח", items: plan.includes }, ...plan.employeeDetails] }); }} className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-xs font-black text-[#7b6a58] transition hover:bg-[#fffdf9]"><Icon name="info" className="h-4 w-4" /> פירוט מלא</button>
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
                  const dynamicPrice = getUpsellPrice(upsell, venueSeatingStaffCount, alcoholManagementStaffCount);
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
                        <div className="shrink-0 text-left text-sm font-black text-[#3f3327]">{freeApplied ? "ללא עלות" : money(dynamicPrice)}</div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setDetailsModal({ title: getUpsellTitle(upsell, venueSeatingStaffCount, alcoholManagementStaffCount), subtitle: upsell.description, price: dynamicPrice, sections: [...upsell.customerDetails, ...upsell.employeeDetails] })} className="inline-flex h-8 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3 text-xs font-black text-[#7b6a58] transition hover:bg-[#fffdf9]"><Icon name="info" className="h-3.5 w-3.5" /> פירוט</button>

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

            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-2xl font-black text-slate-950">סיכום שיחה ותאימות</h2>
              <textarea value={saleSummary} onChange={(e) => setSaleSummary(e.target.value)} className="mt-4 min-h-[150px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3 text-sm font-bold leading-7 outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15" placeholder="סיכום שיחה: מה הוסבר ללקוח, אילו שירותים נבחרו, מחיר כולל מע״מ, תשלום ראשוני ויתרה ביום האירוע..." required />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-bold text-[#5b4a3a]"><input type="checkbox" checked={confirmRecordedCall} onChange={(e) => setConfirmRecordedCall(e.target.checked)} className="accent-[#9b7a3c]" /> השיחה מוקלטת</label>
                <label className="flex items-center gap-2 text-sm font-bold text-[#5b4a3a]"><input type="checkbox" checked={confirmCardOwner} onChange={(e) => setConfirmCardOwner(e.target.checked)} className="accent-[#9b7a3c]" /> הכרטיס שייך ללקוח/משלם שאישר</label>
                <label className="flex items-center gap-2 text-sm font-bold text-[#5b4a3a]"><input type="checkbox" checked={confirmSaleSummary} onChange={(e) => setConfirmSaleSummary(e.target.checked)} className="accent-[#9b7a3c]" /> סוכמו מחיר ושירותים</label>
                <label className="flex items-center gap-2 text-sm font-bold text-[#5b4a3a]"><input type="checkbox" checked={confirmTerms} onChange={(e) => setConfirmTerms(e.target.checked)} className="accent-[#9b7a3c]" /> הוסברו תנאי תשלום וביטול</label>
              </div>
            </section>
          </div>

          <aside className="h-fit space-y-4 xl:sticky xl:top-6">
            <section className="overflow-hidden rounded-[34px] border border-[#eadfce] bg-white shadow-sm">
              <div className="border-b border-[#eadfce] bg-[#fff7ec] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-[#3f3327]">סיכום עסקה</h2>
                    <p className="mt-1 text-xs font-bold text-[#8b7b68]">המחיר נעול ומחושב אוטומטית</p>
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
                  <div className="flex items-center justify-between text-sm font-bold text-[#5b4a3a]"><span>מחיר חבילה</span><span>{money(packageCalculation.finalPrice)}</span></div>
                  <div className="flex items-center justify-between text-sm font-bold text-[#5b4a3a]"><span>תוספות</span><span>{money(upsellsTotal)}</span></div>
                  {selectedUpsellsList.map((upsell) => {
                    const free = upsell.key === "suppliersBudgetSystem" && suppliersBudgetFree && canGiveSuppliersBudgetFree;
                    return <div key={upsell.key} className="flex items-start justify-between border-t border-[#eadfce] pt-2 text-xs font-bold leading-5 text-[#8b7b68]"><span>{getUpsellTitle(upsell, venueSeatingStaffCount, alcoholManagementStaffCount)}</span><span>{free ? "ללא עלות" : money(getUpsellPrice(upsell, venueSeatingStaffCount, alcoholManagementStaffCount))}</span></div>;
                  })}
                </div>

                <div className="rounded-[24px] border border-[#d8b777] bg-[#fff7ec] p-4">
                  <p className="text-xs font-black text-[#8a5c20]">סה״כ כולל מע״מ</p>
                  <p className="mt-2 text-4xl font-black tracking-tight text-[#3f3327]">{money(finalGrossAmount)}</p>
                  <p className="mt-1 text-xs font-bold text-[#8b7b68]">לפני מע״מ: {money(netAmount)} · עמלה לעובד: {money(commission)} ({percent(COMMISSION_RATE)})</p>
                </div>

                <div className="rounded-[24px] border border-[#eadfce] bg-white p-4">
                  <p className="text-sm font-black text-[#3f3327]">בחירת תשלום</p>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)} className="mt-3 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15">
                    <option value="full">לשלם הכול עכשיו</option>
                    <option value="split">תשלום ראשוני + יתרה ביום האירוע</option>
                  </select>

                  <div className="mt-4 space-y-2 text-xs font-bold leading-5 text-[#7b6a58]">
                    <div className="flex items-center justify-between gap-3"><span>{paymentMode === "full" ? "לתשלום עכשיו" : "תשלום ראשוני"}</span><span>{money(paymentSchedule.immediateTotal)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>יתרה ביום האירוע</span><span>{money(paymentSchedule.eventDayTotal)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>שירותים דיגיטליים/לפני האירוע</span><span>{money(paymentSchedule.preEventServicesTotal)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>שירותי יום אירוע</span><span>{money(paymentSchedule.eventServicesTotal)}</span></div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#eadfce] bg-white p-4">
                  <p className="text-sm font-black text-[#3f3327]">הצעת מחיר / הסכם</p>
                  <select value={documentType} onChange={(e) => setDocumentType(e.target.value as DocumentType)} className="mt-3 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15">
                    <option value="quote">הצעת מחיר — צפייה בלבד</option>
                    <option value="agreement">הסכם תנאי עסקה — חתימה</option>
                  </select>
                  <p className="mt-3 text-xs font-bold leading-5 text-[#8b7b68]">תאריך הצעה: {formatDate(quoteCreatedAt)} · תקף עד: {formatDate(quoteExpiresAt)}</p>

                  <div className="mt-4 grid gap-2">
                    <button type="button" disabled={isDocumentActionDisabled} onClick={() => createDocument("preview")} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d8b777] bg-[#fff7ec] px-5 text-sm font-black text-[#8a5c20] transition hover:bg-[#ffefd8] disabled:cursor-not-allowed disabled:opacity-40"><Icon name="eye" className="h-4 w-4" /> תצוגה מקדימה בחלון חדש</button>
                    <button type="button" disabled={isDocumentActionDisabled} onClick={() => createDocument("sms")} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><Icon name="sms" className="h-4 w-4" /> שליחה ישר ב־SMS</button>
                  </div>

                  {generatedDocument && (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">
                      קישור נוצר: <a href={generatedDocument.url} target="_blank" rel="noreferrer" className="underline">פתיחה</a>
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-[#eadfce] bg-white p-4">
                  <p className="text-sm font-black text-[#3f3327]">אופן תשלום במערכת</p>
                  <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as "stripe" | "paid")} className="mt-3 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15">
                    <option value="stripe">לתשלום דרך Stripe</option>
                    <option value="paid">שולם ידנית</option>
                  </select>
                </div>

                <button type="submit" disabled={isSubmitDisabled} className="inline-flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#3f3327] px-5 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:bg-[#2f251d] disabled:cursor-not-allowed disabled:opacity-40">
                  <Icon name="save" className="h-4 w-4" />
                  {saving ? "שומר..." : paymentStatus === "stripe" ? "יצירת לקוח ומעבר לתשלום" : "שמור לקוח ועסקה"}
                </button>
              </div>
            </section>
          </aside>
        </form>
      </main>
    </div>
  );
}
