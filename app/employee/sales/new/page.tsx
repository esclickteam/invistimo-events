"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const VAT_RATE = 0.18;
const COMMISSION_RATE = 0.05;

/**
 * חשוב:
 * כרגע המחירים מוגדרים כאן כדי שהעובד לא יוכל לערוך מחיר במסך.
 * אם יש לך קובץ מרכזי של חבילות מעמוד המכירות הציבורי,
 * עדיף להעביר את PACKAGE_PLANS לשם ולייבא אותו גם לכאן וגם לעמוד החבילות.
 */


type PackageKey = "easy" | "smart" | "seating";

type PackageTier = {
  maxRecords: number;
  price: number;
};

type DetailSection = {
  title: string;
  items: string[];
};

type PackagePlan = {
  key: PackageKey;
  title: string;
  badge: string;
  shortDescription: string;
  includes: string[];
  customerSummary: string;
  details: DetailSection[];
  tiers: PackageTier[];
};

type UpsellKey =
  | "venueSeatingSmall"
  | "venueSeatingTwoStaff"
  | "venueSeatingThreeStaff"
  | "personalRepresentative"
  | "thirdRsvpRound"
  | "suppliersBudgetSystem"
  | "alcoholManagement";

type UpsellItem = {
  key: UpsellKey;
  title: string;
  price: number;
  description: string;
  note?: string;
  details: DetailSection[];
};

type SelectedUpsells = Record<UpsellKey, boolean>;

type DetailsModalState = {
  title: string;
  subtitle?: string;
  price?: number;
  sections: DetailSection[];
  employeeSections?: DetailSection[];
  customerSections?: DetailSection[];
  defaultView?: "employee" | "customer";
} | null;

const MESSAGE_DETAILS: DetailSection = {
  title: "אישורי הגעה והודעות",
  items: [
    "החבילה כוללת 2 סבבים אוטומטיים של הודעות לאישורי הגעה.",
    "אפשר לבצע את הסבבים ב־SMS או ב־WhatsApp, ומומלץ לפצל בין הערוצים כדי לשפר את אחוזי המענה.",
    "ניתן להוסיף אורחים חדשים עד תחילת הסבב הבא.",
    "אורחים שנוספו לאחר שסבב מסוים כבר יצא לא יקבלו את הסבב הקודם, אלא רק סבבים עתידיים שעדיין לא נשלחו.",
    "החבילה כוללת הודעת תזכורת לקראת האירוע, כולל פרטי האירוע ומספר שולחן אם הוגדר.",
    "החבילה כוללת הודעת תודה לאחר האירוע ב־SMS.",
  ],
};


const VENUE_SEATING_CUSTOMER_DETAILS: DetailSection[] = [
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

const VENUE_SEATING_EMPLOYEE_DETAILS: DetailSection[] = [
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

function isVenueSeatingUpsell(key?: UpsellKey) {
  return (
    key === "venueSeatingSmall" ||
    key === "venueSeatingTwoStaff" ||
    key === "venueSeatingThreeStaff"
  );
}

function getEmployeeDetailsForUpsell(upsell: UpsellItem) {
  return isVenueSeatingUpsell(upsell.key)
    ? VENUE_SEATING_EMPLOYEE_DETAILS
    : upsell.details;
}

function getCustomerDetailsForUpsell(upsell: UpsellItem) {
  return isVenueSeatingUpsell(upsell.key)
    ? VENUE_SEATING_CUSTOMER_DETAILS
    : upsell.details;
}

function getCustomerDetailsForPlan(plan: PackagePlan) {
  return [
    {
      title: "פירוט ללקוח",
      items: [plan.customerSummary, ...plan.includes],
    },
  ];
}

const PACKAGE_PLANS: PackagePlan[] = [
  {
    key: "easy",
    title: "קל להזמין",
    badge: "מתאים לאירוע פשוט",
    shortDescription: "הבסיס המושלם להזמנה דיגיטלית ואישורי הגעה",
    includes: [
      "הזמנה דיגיטלית מלאה",
      "2 סבבים אוטומטיים של הודעות לאישורי הגעה",
      "אפשרות לשליחה ב־SMS או WhatsApp",
      "הודעת תזכורת לקראת האירוע",
      "הודעת תודה לאחר האירוע ב־SMS",
    ],
    customerSummary:
      "חבילת קל להזמין כוללת הזמנה דיגיטלית, 2 סבבי הודעות אוטומטיים לאישורי הגעה, הודעת תזכורת לקראת האירוע והודעת תודה לאחר האירוע.",
    details: [
      {
        title: "מה כלול בחבילה",
        items: [
          "הקמת הזמנה דיגיטלית מלאה לאירוע.",
          "ניהול רשימת מוזמנים ורשומות לפי הכמות שנרכשה.",
          "אישורי הגעה באמצעות הודעות אוטומטיות.",
        ],
      },
      MESSAGE_DETAILS,
      {
        title: "דגשים שצריך לסכם עם הלקוח",
        items: [
          "המחיר מחושב לפי כמות הרשומות שנרכשה בפועל.",
          "אורחים שנוספו לאחר סבב שכבר נשלח לא יקבלו את הסבב הקודם.",
          "מומלץ לפצל בין SMS ו־WhatsApp כדי להגדיל סיכויי מענה.",
        ],
      },
    ],
    tiers: [
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
  },
  {
    key: "smart",
    title: "מזמינים חכם",
    badge: "הבחירה הפופולרית",
    shortDescription: "כולל מוקד טלפוני וניהול אישורי הגעה מלא",
    includes: [
      "כל מה שכלול בחבילת קל להזמין",
      "מוקד טלפוני מקצועי",
      "עד 3 סבבי שיחה של נציגים אנושיים למי שלא ענה",
      "עדכון סטטוסים ותיעוד בזמן אמת",
    ],
    customerSummary:
      "חבילת מזמינים חכם כוללת את כל חבילת קל להזמין, ובנוסף עד 3 סבבי שיחה של נציגים אנושיים לווידוא הגעה מול מי שלא ענה בהודעות.",
    details: [
      {
        title: "מה כלול מעבר לחבילה 1",
        items: [
          "כל מה שכלול בחבילת קל להזמין.",
          "מוקד טלפוני מקצועי לביצוע שיחות לאורחים שלא ענו.",
          "עד 3 סבבי שיחה של נציגים אנושיים לווידוא הגעה למי שלא ענה.",
          "תיעוד ועדכון סטטוסים בזמן אמת במערכת.",
        ],
      },
      MESSAGE_DETAILS,
      {
        title: "דגשים לשיחת המכירה",
        items: [
          "השיחות מתבצעות למי שלא ענה ולא לכל מי שכבר אישר או סימן שלא מגיע.",
          "יש להסביר שהשירות נועד לשפר את אחוזי המענה ולחסוך ללקוח מעקב ידני.",
        ],
      },
    ],
    tiers: [
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
  },
  {
    key: "seating",
    title: "מזמינים ומושיבים",
    badge: "הכי מקיף",
    shortDescription: "הפתרון המלא כולל הושבה דיגיטלית ושולחנות",
    includes: [
      "כל מה שכלול בחבילת מזמינים חכם",
      "מערכת הושבה דיגיטלית",
      "ניהול שולחנות וסידורי הושבה",
      "חיבור בין אישורי הגעה לבין ההושבה",
    ],
    customerSummary:
      "חבילת מזמינים ומושיבים כוללת את כל חבילת מזמינים חכם, ובנוסף מערכת הושבה דיגיטלית לניהול שולחנות וסידורי הושבה.",
    details: [
      {
        title: "מה כלול מעבר לחבילה 2",
        items: [
          "כל מה שכלול בחבילת מזמינים חכם.",
          "מערכת הושבה דיגיטלית לניהול שולחנות וסידורי הושבה.",
          "חיבור בין סטטוסי אישורי ההגעה לבין ההושבה בפועל.",
          "אפשרות לעדכון ושינוי הושבה עד האירוע בהתאם לנתוני המערכת.",
        ],
      },
      MESSAGE_DETAILS,
      {
        title: "דגשים לשיחת המכירה",
        items: [
          "יש להסביר שההושבה הדיגיטלית היא כלי מערכת, ולא בהכרח כוללת נציג פיזי באולם אלא אם נרכש אפסייל הושבה באולם.",
          "אם הלקוח רוצה צוות באולם — יש לבחור אפסייל הושבה באולם לפי כמות אנשי צוות.",
        ],
      },
    ],
    tiers: [
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
  },
];

const UPSELLS: UpsellItem[] = [
  {
    key: "venueSeatingSmall",
    title: "הושבה באולם — 2 אנשי צוות עד 200 מוזמנים",
    price: 1000,
    description: "שירות הושבה באולם לאירועים קטנים עד 200 מוזמנים.",
    details: [
      {
        title: "מה השירות נותן",
        items: [
          "2 אנשי צוות מגיעים לאולם עבור אירוע קטן עד 200 מוזמנים.",
          "הצוות מסייע בבדיקת הושבה, הכוונת אורחים ועדכון מצב בזמן אמת לפי הצורך.",
          "השירות מתאים ללקוחות שרוצים נוכחות אנושית באולם מעבר להושבה הדיגיטלית.",
        ],
      },
      {
        title: "דגשים לסיכום מול הלקוח",
        items: [
          "יש לסכם מראש שעות הגעה, נקודת מפגש ואיש קשר באולם.",
          "השירות אינו מחליף מנהל אירוע מטעם האולם אלא נותן תמיכה ייעודית בהושבה.",
        ],
      },
    ],
  },
  {
    key: "venueSeatingTwoStaff",
    title: "הושבה באולם — 2 אנשי צוות",
    price: 1600,
    description: "שירות הושבה באולם עם 2 אנשי צוות.",
    details: [
      {
        title: "מה השירות נותן",
        items: [
          "2 אנשי צוות מגיעים לאולם ומסייעים בניהול ההושבה בפועל.",
          "הצוות בודק את רשימות ההושבה ומסייע בהכוונת אורחים לפי השולחנות.",
          "השירות מתאים לאירועים שבהם נדרשת נוכחות אנושית באולם ביום האירוע.",
        ],
      },
      {
        title: "דגשים לסיכום מול הלקוח",
        items: [
          "יש לוודא שהלקוח מבין שמדובר באפסייל נפרד מההושבה הדיגיטלית.",
          "יש לסכם מראש את זמני הנוכחות והציפיות מהצוות.",
        ],
      },
    ],
  },
  {
    key: "venueSeatingThreeStaff",
    title: "הושבה באולם — 3 אנשי צוות",
    price: 2100,
    description: "שירות הושבה באולם עם 3 אנשי צוות.",
    details: [
      {
        title: "מה השירות נותן",
        items: [
          "3 אנשי צוות מגיעים לאולם ומסייעים בניהול ההושבה בפועל.",
          "מתאים לאירועים גדולים יותר או לאירועים שבהם יש צורך ביותר נקודות שירות והכוונה.",
          "הצוות מסייע בהכוונה לשולחנות ובעדכונים בזמן אמת לפי הצורך.",
        ],
      },
      {
        title: "דגשים לסיכום מול הלקוח",
        items: [
          "יש לוודא מראש את מבנה האולם, כניסות, נקודות קבלת פנים ואיש קשר במקום.",
          "השירות הוא תמיכת הושבה ולא ניהול אירוע מלא, אלא אם נרכש שירות נוסף לכך.",
        ],
      },
    ],
  },
  {
    key: "personalRepresentative",
    title: "נציג אישי לליווי",
    price: 450,
    description:
      "ליווי כולל מעבר ועדכון פעמיים בשבוע, עזרה בהושבה דיגיטלית מרחוק ובניית ההושבה לפי סקיצת האולם.",
    details: [
      {
        title: "מה השירות נותן",
        items: [
          "נציג אישי שמלווה את הלקוח בתהליך ההכנות במערכת.",
          "מעבר ועדכון עם הלקוח פעמיים בשבוע.",
          "עזרה בהושבה דיגיטלית מרחוק.",
          "סיוע בבניית ההושבה לפי סקיצת האולם שהלקוח מספק.",
        ],
      },
      {
        title: "דגשים לסיכום מול הלקוח",
        items: [
          "הליווי מתבצע מרחוק, אלא אם נרכש שירות נוכחות באולם בנפרד.",
          "הלקוח צריך להעביר סקיצה/פריסת שולחנות כדי שניתן יהיה לסייע בבניית ההושבה.",
        ],
      },
    ],
  },
  {
    key: "thirdRsvpRound",
    title: "תוספת סבב 3 לאישורי הגעה",
    price: 90,
    description: "פתיחת סבב שלישי לאישורי הגעה.",
    details: [
      {
        title: "מה השירות נותן",
        items: [
          "פתיחת סבב שלישי נוסף לאישורי הגעה מעבר ל־2 הסבבים הכלולים בחבילות.",
          "הסבב מיועד לשיפור אחוזי המענה מול מוזמנים שעדיין לא הגיבו.",
          "אפשר להשתמש בסבב הנוסף בהתאם לערוצי ההודעות הפעילים במערכת.",
        ],
      },
      {
        title: "דגשים לסיכום מול הלקוח",
        items: [
          "יש להסביר שסבב שנשלח לא נשלח רטרואקטיבית לאורחים שנוספו אחריו.",
          "אורחים שנוספו אחרי סבב מסוים יקבלו רק סבבים עתידיים שעדיין לא יצאו.",
        ],
      },
    ],
  },
  {
    key: "suppliersBudgetSystem",
    title: "מערכת עצמאית לניהול ספקים ותקציב",
    price: 200,
    description: "פתיחת אזור ניהול ספקים ותקציב ללקוח.",
    note: "ברכישות מעל 1,000 ₪ העובד רשאי לתת ללא עלות.",
    details: [
      {
        title: "מה השירות נותן",
        items: [
          "פתיחת מערכת עצמאית לניהול ספקים ותקציב האירוע.",
          "הלקוח יכול לרכז ספקים, מחירים, מקדמות, יתרות ותמונת מצב תקציבית.",
          "מיועד ללקוחות שרוצים לנהל את ההוצאות והספקים במקום אחד.",
        ],
      },
      {
        title: "הטבה ברכישה מעל 1,000 ₪",
        items: [
          "ברכישות מעל 1,000 ₪ יש הרשאה לעובד לתת את המודול ללא עלות.",
          "אם ההטבה ניתנת ללא עלות, היא תופיע בסיכום העסקה כ'ללא עלות'.",
        ],
      },
    ],
  },
  {
    key: "alcoholManagement",
    title: "ניהול אלכוהול באולם",
    price: 1200,
    description:
      "איש צוות אחד נשאר באולם עד השעה 02:00 לכל המאוחר לניהול ותיעוד אלכוהול.",
    details: [
      {
        title: "מה השירות נותן",
        items: [
          "איש צוות אחד מתוך הצוות שמגיע לאירוע נשאר עד השעה 02:00 לכל המאוחר.",
          "איש הצוות ידאג לשים בקבוקים על השולחנות לפי מה שסוכם מראש עם בעל האירוע.",
          "איש הצוות יבדוק בשולחנות אם יש בקבוקים ריקים ויחליף בקבוק רק במידת הצורך.",
          "כל בקבוק מתועד במערכת: איפה נפתח, מתי נפתח ומתי הוקצה בקבוק נוסף.",
          "בסוף הערב בעל האירוע מקבל דוח מלא וממוחשב על ניהול האלכוהול.",
        ],
      },
      {
        title: "דגשים לסיכום מול הלקוח",
        items: [
          "יש לסכם מראש עם בעל האירוע את כמות הבקבוקים, סוגי האלכוהול והאופן שבו רוצים לפזר אותם בשולחנות.",
          "השירות כולל ניהול ותיעוד, לא רכישת אלכוהול ולא אספקת בקבוקים מטעם Invistimo.",
          "יש לוודא שיש איש קשר באולם למקרה של שינוי או צורך בתיאום בזמן האירוע.",
        ],
      },
    ],
  },
];

function asNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function money(value: unknown) {
  const amount = asNumber(value);

  return amount.toLocaleString("he-IL", {
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

  return (
    plan.tiers.find((tier) => safeRecords <= tier.maxRecords) ||
    plan.tiers[plan.tiers.length - 1]
  );
}

/**
 * דוגמה:
 * אם הלקוח בחר 530 רשומות — נבחרת מדרגת 550.
 * מחיר ממוצע לרשומה = מחיר מדרגת 550 / 550.
 * מחיר בפועל = מחיר ממוצע * 530.
 */
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

function createEmptyUpsells(): SelectedUpsells {
  return {
    venueSeatingSmall: false,
    venueSeatingTwoStaff: false,
    venueSeatingThreeStaff: false,
    personalRepresentative: false,
    thirdRsvpRound: false,
    suppliersBudgetSystem: false,
    alcoholManagement: false,
  };
}

function calculateUpsellsTotal(
  selectedUpsells: SelectedUpsells,
  basePrice: number,
  suppliersBudgetFree: boolean,
) {
  return UPSELLS.reduce((sum, item) => {
    if (!selectedUpsells[item.key]) return sum;

    if (item.key === "suppliersBudgetSystem" && suppliersBudgetFree) {
      return sum;
    }

    return sum + item.price;
  }, 0);
}

function calculate(grossAmount: number) {
  const gross = Math.max(0, asNumber(grossAmount));
  const net = roundMoney(gross / (1 + VAT_RATE));
  const commission = roundMoney(net * COMMISSION_RATE);

  return {
    gross,
    net,
    commission,
  };
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "arrow"
    | "save"
    | "check"
    | "shield"
    | "spark"
    | "card"
    | "phone"
    | "lock"
    | "info";
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "save") {
    return (
      <svg {...common}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h8" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg {...common}>
        <path d="M12 3 9.8 9.8 3 12l6.8 2.2L12 21l2.2-6.8L21 12l-6.8-2.2L12 3z" />
      </svg>
    );
  }

  if (name === "card") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.1 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.62a2 2 0 0 1-.45 2.11L9 10.7a16 16 0 0 0 4.3 4.3l1.25-1.25a2 2 0 0 1 2.11-.45c.84.29 1.72.5 2.62.62A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="4" y="11" width="16" height="10" rx="3" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }

  if (name === "info") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function Pill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
      {children}
    </span>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[#eadfce] bg-white/80 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff3df] text-[#9b6a30]">
          {icon}
        </div>
        <div>
          <p className="text-sm font-black text-[#3f3327]">{title}</p>
          <div className="mt-1 text-xs font-semibold leading-6 text-[#7b6a58]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({
  details,
  onClose,
}: {
  details: DetailsModalState;
  onClose: () => void;
}) {
  const [activeView, setActiveView] = useState<"employee" | "customer">(
    details?.defaultView || "employee",
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
            <Pill className="border-[#d6b47c] bg-white text-[#8a5c20]">
              פירוט מלא
            </Pill>
            <h3 className="mt-3 text-2xl font-black text-[#3f3327]">
              {details.title}
            </h3>
            {details.subtitle && (
              <p className="mt-2 text-sm font-semibold leading-6 text-[#7b6a58]">
                {details.subtitle}
              </p>
            )}
            {typeof details.price === "number" && (
              <p className="mt-3 text-lg font-black text-[#3f3327]">
                מחיר: {money(details.price)}
              </p>
            )}

            <div className="mt-4 inline-flex rounded-2xl border border-[#eadfce] bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveView("employee")}
                className={`h-9 rounded-xl px-4 text-xs font-black transition ${
                  activeView === "employee"
                    ? "bg-[#3f3327] text-white shadow-sm"
                    : "text-[#7b6a58] hover:bg-[#fff7ec]"
                }`}
              >
                לעובד
              </button>

              <button
                type="button"
                onClick={() => setActiveView("customer")}
                className={`h-9 rounded-xl px-4 text-xs font-black transition ${
                  activeView === "customer"
                    ? "bg-[#3f3327] text-white shadow-sm"
                    : "text-[#7b6a58] hover:bg-[#fff7ec]"
                }`}
              >
                ללקוח
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#eadfce] bg-white text-lg font-black text-[#7b6a58] transition hover:bg-[#fffdf9] hover:text-[#3f3327]"
          >
            ×
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-5 sm:p-6">
          <div className="mb-4 rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3 text-xs font-bold leading-5 text-[#7b6a58]">
            {activeView === "employee"
              ? "פירוט פנימי לעובד: מה להסביר בשיחה, מה לוודא ומה לסכם לפני העברת הלקוח לתשלום."
              : "פירוט ללקוח: זה הנוסח שניתן לשמור בפרטי העסקה ובעמוד סיכום/חתימה."}
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

export default function NewEmployeeSalePage() {
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");

  const [selectedPlanKey, setSelectedPlanKey] = useState<PackageKey>("smart");
  const [records, setRecords] = useState("300");

  const [selectedUpsells, setSelectedUpsells] = useState<SelectedUpsells>(() =>
    createEmptyUpsells(),
  );
  const [suppliersBudgetFree, setSuppliersBudgetFree] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState<"stripe" | "paid">(
    "stripe",
  );

  const [detailsModal, setDetailsModal] = useState<DetailsModalState>(null);

  const [saleSummary, setSaleSummary] = useState("");

  const [confirmRecordedCall, setConfirmRecordedCall] = useState(false);
  const [confirmCardOwner, setConfirmCardOwner] = useState(false);
  const [confirmSaleSummary, setConfirmSaleSummary] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedPlan = useMemo(
    () => getSelectedPlan(selectedPlanKey),
    [selectedPlanKey],
  );

  const packageCalculation = useMemo(() => {
    return calculatePackagePrice(selectedPlan, clampRecords(records));
  }, [records, selectedPlan]);

  const canGiveSuppliersBudgetFree =
    packageCalculation.finalPrice +
      UPSELLS.reduce((sum, upsell) => {
        if (upsell.key === "suppliersBudgetSystem") return sum;
        return selectedUpsells[upsell.key] ? sum + upsell.price : sum;
      }, 0) >=
    1000;

  const selectedUpsellsList = useMemo(() => {
    return UPSELLS.filter((upsell) => selectedUpsells[upsell.key]);
  }, [selectedUpsells]);

  const upsellsTotal = useMemo(() => {
    return calculateUpsellsTotal(
      selectedUpsells,
      packageCalculation.finalPrice,
      suppliersBudgetFree && canGiveSuppliersBudgetFree,
    );
  }, [
    canGiveSuppliersBudgetFree,
    packageCalculation.finalPrice,
    selectedUpsells,
    suppliersBudgetFree,
  ]);

  const finalGrossAmount = useMemo(() => {
    return roundMoney(packageCalculation.finalPrice + upsellsTotal);
  }, [packageCalculation.finalPrice, upsellsTotal]);

  const calculated = useMemo(() => {
    return calculate(finalGrossAmount);
  }, [finalGrossAmount]);

  const customerDealSummary = useMemo(() => {
    return {
      packageTitle: selectedPlan.title,
      packageSummary: selectedPlan.customerSummary,
      records: packageCalculation.records,
      totalPrice: finalGrossAmount,
      includedItems: selectedPlan.includes,
      upsells: selectedUpsellsList.map((upsell) => {
        const givenFree =
          upsell.key === "suppliersBudgetSystem" &&
          suppliersBudgetFree &&
          canGiveSuppliersBudgetFree;

        return {
          title: upsell.title,
          description: upsell.description,
          customerDetails: getCustomerDetailsForUpsell(upsell),
          givenFree,
        };
      }),
    };
  }, [
    canGiveSuppliersBudgetFree,
    finalGrossAmount,
    packageCalculation.records,
    selectedPlan.customerSummary,
    selectedPlan.includes,
    selectedPlan.title,
    selectedUpsellsList,
    suppliersBudgetFree,
  ]);

  const isSubmitDisabled =
    saving ||
    !clientName.trim() ||
    !clientEmail.trim() ||
    !clientPhone.trim() ||
    !saleSummary.trim() ||
    !confirmRecordedCall ||
    !confirmCardOwner ||
    !confirmSaleSummary ||
    !confirmTerms ||
    finalGrossAmount <= 0;

  function toggleUpsell(key: UpsellKey) {
    setSelectedUpsells((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      };

      if (key === "suppliersBudgetSystem" && !next[key]) {
        setSuppliersBudgetFree(false);
      }

      return next;
    });
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          clientPhone: clientPhone.trim(),
          eventName: eventName.trim(),
          eventDate,

          plan: selectedPlan.key,
          packageName: selectedPlan.title,
          guests: packageCalculation.records,
          records: packageCalculation.records,

          grossAmount: finalGrossAmount,
          status: paymentStatus === "paid" ? "paid" : "pending",

          selectedPackage: {
            key: selectedPlan.key,
            title: selectedPlan.title,
            badge: selectedPlan.badge,
            includes: selectedPlan.includes,
            customerSummary: selectedPlan.customerSummary,
            details: selectedPlan.details,
            records: packageCalculation.records,
            tierMaxRecords: packageCalculation.tierMaxRecords,
            tierPrice: packageCalculation.tierPrice,
            pricePerRecord: packageCalculation.pricePerRecord,
            finalPrice: packageCalculation.finalPrice,
          },

          upsells: selectedUpsellsList.map((upsell) => ({
            key: upsell.key,
            title: upsell.title,
            description: upsell.description,
            details: getEmployeeDetailsForUpsell(upsell),
            employeeDetails: getEmployeeDetailsForUpsell(upsell),
            customerDetails: getCustomerDetailsForUpsell(upsell),
            originalPrice: upsell.price,
            price:
              upsell.key === "suppliersBudgetSystem" &&
              suppliersBudgetFree &&
              canGiveSuppliersBudgetFree
                ? 0
                : upsell.price,
            givenFree:
              upsell.key === "suppliersBudgetSystem" &&
              suppliersBudgetFree &&
              canGiveSuppliersBudgetFree,
          })),

          saleCompliance: {
            recordedCall: confirmRecordedCall,
            cardOwnerConfirmed: confirmCardOwner,
            cardHolderPresentAndApproved: confirmCardOwner,
            saleSummaryConfirmed: confirmSaleSummary,
            termsConfirmed: confirmTerms,
            summary: saleSummary.trim(),
          },

          customerDealSummary,

          notes: saleSummary.trim(),

          payment: {
            method: paymentStatus,
            provider: paymentStatus === "stripe" ? "stripe" : "manual",
            amount: finalGrossAmount,
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || data?.error || "שגיאה ביצירת הלקוח והמכירה",
        );
      }

      if (paymentStatus === "stripe") {
        if (data?.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }

        if (data?.userId) {
          const checkoutResponse = await fetch(
            `/api/admin/users/${data.userId}/checkout`,
            {
              method: "POST",
              credentials: "include",
            },
          );

          const checkoutData = await checkoutResponse
            .json()
            .catch(() => null);

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
    <div
      dir="rtl"
      className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f8fafc_38%,#eef2f7_100%)] text-slate-950"
    >
      <DetailsModal details={detailsModal} onClose={() => setDetailsModal(null)} />
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] border border-[#eadfce] bg-white/90 p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#ffe7bd] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-emerald-100 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <button
                type="button"
                onClick={() => router.push("/employee/sales")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#5b4a3a] transition hover:bg-[#fff7ec]"
              >
                <Icon name="arrow" className="h-4 w-4" />
                חזרה למכירות
              </button>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-[#fff7ec] px-4 py-2 text-sm font-black text-[#8a5c20]">
                <Icon name="spark" className="h-4 w-4" />
                מכירת חבילה לעובד
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                יצירת לקוח חדש ותשלום
              </h1>

              <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-slate-600">
                העובד בוחר חבילה וכמות רשומות בלבד. המחיר מחושב אוטומטית לפי
                מדרגת החבילה ואין אפשרות לערוך מחיר ידנית.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:w-[560px]">
              <InfoCard icon={<Icon name="card" />} title="שימוש בכרטיס אשראי">
                רק הלקוח או הגורם המשלם רשאים להשתמש בכרטיס אשראי. חובה לוודא
                שהכרטיס שייך לאדם שאיתו מדברים או לגורם המשלם שאישר את העסקה.
              </InfoCard>

              <InfoCard icon={<Icon name="phone" />} title="שיחה מוקלטת בלבד">
                מכירה מתבצעת בשיחה מוקלטת בלבד, כולל סיכום החבילה, מה מקבלים,
                מחיר, אופן תשלום ותנאי תשלום.
              </InfoCard>
            </div>
          </div>
        </section>

        <form
          onSubmit={submitSale}
          className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]"
        >
          <div className="space-y-6">
            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    פרטי לקוח
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    פרטי הלקוח שיקבל את הקישור לתשלום וייפתח לו משתמש במערכת.
                  </p>
                </div>

                <Pill className="border-amber-200 bg-amber-50 text-amber-700">
                  Stripe checkout
                </Pill>
              </div>

              {error && (
                <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
                  {error}
                </div>
              )}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    שם לקוח *
                  </span>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="לדוגמה: הדר כהן"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    אימייל לקוח *
                  </span>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="client@email.com"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    טלפון לקוח *
                  </span>
                  <input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="0500000000"
                    dir="ltr"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    שם אירוע
                  </span>
                  <input
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="לדוגמה: חתונה הדר ויוסי"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-black text-slate-700">
                    תאריך אירוע
                  </span>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  בחירת חבילה
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  המחיר נמשך ממדרגות החבילה. העובד יכול לערוך רק את כמות
                  הרשומות, לא את המחיר.
                </p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {PACKAGE_PLANS.map((plan) => {
                  const isSelected = selectedPlanKey === plan.key;
                  const calc = calculatePackagePrice(plan, clampRecords(records));

                  return (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() => setSelectedPlanKey(plan.key)}
                      className={`rounded-[30px] border p-5 text-right shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                        isSelected
                          ? "border-[#b47a3b] bg-[#fff7ec] ring-4 ring-[#b47a3b]/10"
                          : "border-[#eadfce] bg-white hover:border-[#d5b98b]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Pill
                            className={
                              isSelected
                                ? "border-[#d6b47c] bg-white text-[#8a5c20]"
                                : "border-[#eadfce] bg-[#fffdf9] text-[#8b7b68]"
                            }
                          >
                            {plan.badge}
                          </Pill>

                          <h3 className="mt-4 text-2xl font-black text-[#3f3327]">
                            {plan.title}
                          </h3>

                          <p className="mt-2 min-h-[48px] text-sm font-semibold leading-6 text-[#7b6a58]">
                            {plan.shortDescription}
                          </p>

                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              setDetailsModal({
                                title: plan.title,
                                subtitle: plan.customerSummary,
                                sections: plan.details,
                                employeeSections: plan.details,
                                customerSections: getCustomerDetailsForPlan(plan),
                                defaultView: "employee",
                              });
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                setDetailsModal({
                                  title: plan.title,
                                  subtitle: plan.customerSummary,
                                  sections: plan.details,
                                });
                              }
                            }}
                            className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3 text-xs font-black text-[#7b6a58] transition hover:bg-[#fffdf9]"
                          >
                            <Icon name="info" className="h-4 w-4" />
                            פירוט
                          </span>
                        </div>

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                            isSelected
                              ? "bg-[#b47a3b] text-white"
                              : "bg-[#fff3df] text-[#b47a3b]"
                          }`}
                        >
                          <Icon name="check" className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-5 rounded-3xl border border-[#eadfce] bg-white p-4">
                        <p className="text-xs font-black text-[#8b7b68]">
                          מחיר לפי {calc.records} רשומות
                        </p>
                        <p className="mt-1 text-3xl font-black text-[#3f3327]">
                          {money(calc.finalPrice)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#9a8976]">
                          מדרגת עד {calc.tierMaxRecords} רשומות · ממוצע{" "}
                          {money(calc.pricePerRecord)} לרשומה
                        </p>
                      </div>

                      <ul className="mt-5 space-y-2">
                        {plan.includes.slice(0, 5).map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2 text-sm font-semibold leading-6 text-[#5b4a3a]"
                          >
                            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff3df] text-[#b47a3b]">
                              <Icon name="check" className="h-3.5 w-3.5" />
                            </span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-[28px] border border-[#eadfce] bg-[#fffdf9] p-5">
                <label className="block">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <span className="text-sm font-black text-slate-700">
                        כמות רשומות למכירה *
                      </span>
                      <p className="mt-1 text-xs font-bold text-[#8b7b68]">
                        ניתן להכניס כל מספר עד 1,000. המערכת תבחר אוטומטית את
                        מדרגת ה־50 הקרובה מעל הכמות ותחשב מחיר ממוצע לפי רשומה.
                      </p>
                    </div>

                    <Pill className="border-[#eadfce] bg-white text-[#7b6a58]">
                      מדרגה פעילה: עד {packageCalculation.tierMaxRecords}
                    </Pill>
                  </div>

                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={records}
                    onChange={(e) => setRecords(e.target.value)}
                    className="mt-4 h-14 w-full rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-lg font-black text-[#3f3327] outline-none transition focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="לדוגמה: 530"
                    required
                  />
                </label>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                    <p className="text-xs font-black text-[#8b7b68]">
                      כמות רשומות
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#3f3327]">
                      {packageCalculation.records}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                    <p className="text-xs font-black text-[#8b7b68]">
                      מדרגת תמחור
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#3f3327]">
                      עד {packageCalculation.tierMaxRecords}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                    <p className="text-xs font-black text-[#8b7b68]">
                      מחיר ממוצע לרשומה
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#3f3327]">
                      {money(packageCalculation.pricePerRecord)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                    <p className="text-xs font-black text-[#8b7b68]">
                      מחיר חבילה
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#3f3327]">
                      {money(packageCalculation.finalPrice)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  אפסיילים
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  מחיר האפסיילים קבוע. העובד יכול לבחור שירותים בלבד, לא לערוך
                  מחיר.
                </p>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {UPSELLS.map((upsell) => {
                  const selected = selectedUpsells[upsell.key];
                  const isSuppliers = upsell.key === "suppliersBudgetSystem";
                  const freeApplied =
                    isSuppliers &&
                    selected &&
                    suppliersBudgetFree &&
                    canGiveSuppliersBudgetFree;

                  return (
                    <div
                      key={upsell.key}
                      className={`rounded-[26px] border p-4 transition ${
                        selected
                          ? "border-[#b47a3b] bg-[#fff7ec]"
                          : "border-[#eadfce] bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleUpsell(upsell.key)}
                            className="mt-1 h-4 w-4 accent-[#9b7a3c]"
                          />

                          <span>
                            <span className="block text-sm font-black text-[#3f3327]">
                              {upsell.title}
                            </span>
                            <span className="mt-1 block text-xs font-semibold leading-5 text-[#7b6a58]">
                              {upsell.description}
                            </span>
                            {upsell.note && (
                              <span className="mt-2 block text-xs font-black leading-5 text-[#9b6a30]">
                                {upsell.note}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setDetailsModal({
                                  title: upsell.title,
                                  subtitle: upsell.description,
                                  price: upsell.price,
                                  sections: getEmployeeDetailsForUpsell(upsell),
                                  employeeSections: getEmployeeDetailsForUpsell(upsell),
                                  customerSections: getCustomerDetailsForUpsell(upsell),
                                  defaultView: "employee",
                                });
                              }}
                              className="mt-3 inline-flex h-8 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3 text-xs font-black text-[#7b6a58] transition hover:bg-[#fffdf9]"
                            >
                              <Icon name="info" className="h-3.5 w-3.5" />
                              פירוט
                            </button>
                          </span>
                        </label>

                        <div className="shrink-0 text-left">
                          {freeApplied ? (
                            <>
                              <p className="text-xs font-black text-[#8b7b68] line-through">
                                {money(upsell.price)}
                              </p>
                              <p className="text-sm font-black text-emerald-700">
                                ללא עלות
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-black text-[#3f3327]">
                              {money(upsell.price)}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSuppliers && selected && (
                        <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-3">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(
                                suppliersBudgetFree &&
                                  canGiveSuppliersBudgetFree,
                              )}
                              disabled={!canGiveSuppliersBudgetFree}
                              onChange={(e) =>
                                setSuppliersBudgetFree(e.target.checked)
                              }
                              className="mt-1 h-4 w-4 accent-[#9b7a3c] disabled:cursor-not-allowed"
                            />

                            <span className="text-xs font-bold leading-5 text-[#7b6a58]">
                              לתת ללא עלות בגלל רכישה מעל 1,000 ₪.
                              {!canGiveSuppliersBudgetFree && (
                                <b className="block text-rose-600">
                                  זמין רק כאשר סכום הרכישה לפני ההטבה הוא מעל
                                  1,000 ₪.
                                </b>
                              )}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>



            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  סיכום פרטי העסקה ללקוח
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  זה הסיכום שיישמר בפרטי העסקה: חבילה, כמות רשומות, מה כלול
                  והמחיר הכולל. ללקוח לא יוצג פירוק מחיר של כל רכיב בנפרד.
                </p>
              </div>

              <div className="mt-5 rounded-[28px] border border-[#eadfce] bg-[#fffdf9] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Pill className="border-[#d6b47c] bg-white text-[#8a5c20]">
                      פרטי עסקה
                    </Pill>
                    <h3 className="mt-3 text-2xl font-black text-[#3f3327]">
                      {customerDealSummary.packageTitle}
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-[#5b4a3a]">
                      {customerDealSummary.packageSummary}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-[#d8b777] bg-white p-4 text-center sm:min-w-[180px]">
                    <p className="text-xs font-black text-[#8a5c20]">
                      מחיר כולל לתשלום
                    </p>
                    <p className="mt-1 text-3xl font-black text-[#3f3327]">
                      {money(customerDealSummary.totalPrice)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#8b7b68]">
                      כולל מע״מ
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                    <p className="text-xs font-black text-[#8b7b68]">
                      כמות רשומות שנרכשה
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#3f3327]">
                      {customerDealSummary.records}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                    <p className="text-xs font-black text-[#8b7b68]">
                      סך הכל לתשלום על כל העסקה
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#3f3327]">
                      {money(customerDealSummary.totalPrice)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-black text-[#3f3327]">
                      מה כלול בחבילה
                    </p>
                    <ul className="mt-3 space-y-2">
                      {customerDealSummary.includedItems.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-sm font-semibold leading-6 text-[#5b4a3a]"
                        >
                          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff3df] text-[#b47a3b]">
                            <Icon name="check" className="h-3.5 w-3.5" />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-black text-[#3f3327]">
                      תוספות שנבחרו
                    </p>
                    {customerDealSummary.upsells.length === 0 ? (
                      <p className="mt-3 rounded-2xl border border-[#eadfce] bg-white p-4 text-sm font-bold text-[#8b7b68]">
                        לא נבחרו תוספות לעסקה.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {customerDealSummary.upsells.map((upsell) => (
                          <li
                            key={upsell.title}
                            className="rounded-2xl border border-[#eadfce] bg-white p-3 text-sm font-semibold leading-6 text-[#5b4a3a]"
                          >
                            <p className="font-black text-[#3f3327]">
                              {upsell.title}
                              {upsell.givenFree ? " — ללא עלות" : ""}
                            </p>
                            <p className="mt-1 text-xs font-bold text-[#8b7b68]">
                              {upsell.description}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  אישורי מכירה חובה
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  בלי סימון כל הסעיפים אי אפשר להעביר את העסקה לתשלום.
                </p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
                  <div className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={confirmRecordedCall}
                      onChange={(e) => setConfirmRecordedCall(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#9b7a3c]"
                    />
                    <span className="text-sm font-bold leading-6 text-[#5b4a3a]">
                      אני מאשר/ת שהמכירה בוצעה בשיחה מוקלטת בלבד.
                    </span>
                  </div>
                </label>

                <label className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
                  <div className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={confirmCardOwner}
                      onChange={(e) => setConfirmCardOwner(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#9b7a3c]"
                    />
                    <span className="text-sm font-bold leading-6 text-[#5b4a3a]">
                      וידאתי שרק הלקוח או הגורם המשלם משתמשים בכרטיס האשראי, ושבעל הכרטיס היה נוכח בעסקה ואישר את התשלום.
                    </span>
                  </div>
                </label>

                <label className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
                  <div className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={confirmSaleSummary}
                      onChange={(e) => setConfirmSaleSummary(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#9b7a3c]"
                    />
                    <span className="text-sm font-bold leading-6 text-[#5b4a3a]">
                      סיכמתי בשיחה מה החבילה כוללת, מה מקבלים והמחיר הכולל.
                    </span>
                  </div>
                </label>

                <label className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
                  <div className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={confirmTerms}
                      onChange={(e) => setConfirmTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#9b7a3c]"
                    />
                    <span className="text-sm font-bold leading-6 text-[#5b4a3a]">
                      סיכמתי בשיחה את אופן התשלום ותנאי התשלום.
                    </span>
                  </div>
                </label>
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-black text-slate-700">
                  סיכום שיחת המכירה *
                </span>
                <textarea
                  value={saleSummary}
                  onChange={(e) => setSaleSummary(e.target.value)}
                  className="mt-2 min-h-[150px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3 text-sm font-bold leading-7 outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                  placeholder="לדוגמה: הוסבר ללקוח שחבילת מזמינים חכם כוללת הזמנה דיגיטלית, 2 סבבי וואטסאפ, תזכורת SMS, מוקד טלפוני ועד 3 ניסיונות חיוג לכל רשומה. המחיר הכולל הוא... התשלום דרך Stripe..."
                  required
                />
              </label>
            </section>
          </div>

          <aside className="h-fit space-y-4 xl:sticky xl:top-6">
            <section className="overflow-hidden rounded-[34px] border border-[#eadfce] bg-white shadow-sm">
              <div className="border-b border-[#eadfce] bg-[#fff7ec] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-[#3f3327]">
                      סיכום עסקה
                    </h2>
                    <p className="mt-1 text-xs font-bold text-[#8b7b68]">
                      אין אפשרות לערוך מחיר ידנית
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#9b6a30]">
                    <Icon name="lock" className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdf9] p-4">
                  <p className="text-xs font-black text-[#8b7b68]">
                    חבילה נבחרת
                  </p>
                  <p className="mt-1 text-lg font-black text-[#3f3327]">
                    {selectedPlan.title}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#9a8976]">
                    {packageCalculation.records} רשומות · מדרגת עד{" "}
                    {packageCalculation.tierMaxRecords}
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#eadfce] bg-white p-4">
                  <div className="flex items-center justify-between gap-3 text-sm font-bold text-[#5b4a3a]">
                    <span>מחיר חבילה</span>
                    <span>{money(packageCalculation.finalPrice)}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-sm font-bold text-[#5b4a3a]">
                    <span>אפסיילים</span>
                    <span>{money(upsellsTotal)}</span>
                  </div>

                  {selectedUpsellsList.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-[#eadfce] pt-3">
                      {selectedUpsellsList.map((upsell) => {
                        const free =
                          upsell.key === "suppliersBudgetSystem" &&
                          suppliersBudgetFree &&
                          canGiveSuppliersBudgetFree;

                        return (
                          <div
                            key={upsell.key}
                            className="flex items-start justify-between gap-3 text-xs font-bold leading-5 text-[#8b7b68]"
                          >
                            <span>{upsell.title}</span>
                            <span className="shrink-0">
                              {free ? "ללא עלות" : money(upsell.price)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-[#d8b777] bg-[#fff7ec] p-4">
                  <p className="text-xs font-black text-[#8a5c20]">
                    סה״כ לתשלום כולל מע״מ
                  </p>
                  <p className="mt-2 text-4xl font-black tracking-tight text-[#3f3327]">
                    {money(finalGrossAmount)}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black text-slate-500">
                      סכום לפני מע״מ
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {money(calculated.net)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      חישוב: סכום כולל / {1 + VAT_RATE}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-black text-emerald-700">
                      עמלה לעובד
                    </p>
                    <p className="mt-2 text-3xl font-black text-emerald-900">
                      {money(calculated.commission)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-emerald-700/70">
                      {percent(COMMISSION_RATE)} מהסכום לפני מע״מ
                    </p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#eadfce] bg-white p-4">
                  <p className="text-sm font-black text-[#3f3327]">
                    אופן תשלום
                  </p>

                  <select
                    value={paymentStatus}
                    onChange={(e) =>
                      setPaymentStatus(e.target.value as "stripe" | "paid")
                    }
                    className="mt-3 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                  >
                    <option value="stripe">לתשלום דרך Stripe</option>
                    <option value="paid">שולם ידנית</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="inline-flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#3f3327] px-5 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:bg-[#2f251d] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="save" className="h-4 w-4" />
                  {saving
                    ? "מעביר לתשלום..."
                    : paymentStatus === "stripe"
                      ? "יצירת לקוח ומעבר לתשלום"
                      : "שמור לקוח ועסקה"}
                </button>

                <p className="text-center text-xs font-bold leading-5 text-[#8b7b68]">
                  בלחיצה על הכפתור תישמר המכירה על העובד המחובר, תחושב עמלה
                  וייפתח תשלום דרך Stripe כשהסטטוס הוא Stripe.
                </p>
              </div>
            </section>
          </aside>
        </form>
      </main>
    </div>
  );
}
