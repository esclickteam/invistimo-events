"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  | "venueSeating"
  | "personalRepresentative"
  | "thirdRsvpRound"
  | "suppliersBudgetSystem"
  | "alcoholManagement";

type VenueSeatingStaffCount = 1 | 2 | 3;
type AlcoholManagementStaffCount = 1 | 2;

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

type GeneratedDocumentType = "quote" | "agreement";

type GeneratedDocumentLink = {
  type: GeneratedDocumentType;
  url: string;
  createdAt: string;
  expiresAt: string;
} | null;

type PaymentSchedule = {
  immediateTotal: number;
  eventDayTotal: number;
  preEventServicesTotal: number;
  eventServicesTotal: number;
  eventServicesDeposit: number;
  eventServicesBalance: number;
};

const VENUE_SEATING_OPTIONS: {
  staffCount: VenueSeatingStaffCount;
  title: string;
  price: number;
  maxRecords?: number;
  description: string;
}[] = [
  {
    staffCount: 1,
    title: "איש צוות אחד",
    price: 1000,
    maxRecords: 200,
    description: "מתאים לאירועים קטנים עד 200 רשומות.",
  },
  {
    staffCount: 2,
    title: "2 אנשי צוות",
    price: 1600,
    description: "מתאים לאירועים בינוניים או לאירועים עם צורך ביותר עמדות שירות.",
  },
  {
    staffCount: 3,
    title: "3 אנשי צוות",
    price: 2100,
    description: "מתאים לאירועים גדולים או לאירועים עם צורך בניהול הושבה רחב יותר.",
  },
];

const ALCOHOL_MANAGEMENT_OPTIONS: {
  staffCount: AlcoholManagementStaffCount;
  title: string;
  price: number;
  maxRecords?: number;
  minRecords?: number;
  description: string;
}[] = [
  {
    staffCount: 1,
    title: "איש צוות אחד",
    price: 1200,
    maxRecords: 450,
    description: "מתאים לאירועים עד 450 רשומות.",
  },
  {
    staffCount: 2,
    title: "2 אנשי צוות",
    price: 2000,
    minRecords: 451,
    description: "חובה באירועים מעל 450 רשומות.",
  },
];

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
  return key === "venueSeating";
}

function getVenueSeatingOption(staffCount: VenueSeatingStaffCount) {
  return (
    VENUE_SEATING_OPTIONS.find((option) => option.staffCount === staffCount) ||
    VENUE_SEATING_OPTIONS[0]
  );
}

function getAlcoholManagementOption(staffCount: AlcoholManagementStaffCount) {
  return (
    ALCOHOL_MANAGEMENT_OPTIONS.find(
      (option) => option.staffCount === staffCount,
    ) || ALCOHOL_MANAGEMENT_OPTIONS[0]
  );
}

function isVenueStaffOptionDisabled(
  option: (typeof VENUE_SEATING_OPTIONS)[number],
  records: number,
) {
  return Boolean(option.maxRecords && records > option.maxRecords);
}

function isAlcoholStaffOptionDisabled(
  option: (typeof ALCOHOL_MANAGEMENT_OPTIONS)[number],
  records: number,
) {
  if (option.maxRecords && records > option.maxRecords) return true;
  if (option.minRecords && records < option.minRecords) return true;

  return false;
}

function getUpsellDynamicTitle(
  upsell: UpsellItem,
  venueSeatingStaffCount: VenueSeatingStaffCount,
  alcoholManagementStaffCount: AlcoholManagementStaffCount,
) {
  if (upsell.key === "venueSeating") {
    const option = getVenueSeatingOption(venueSeatingStaffCount);
    return `הושבה באולם — ${option.title}`;
  }

  if (upsell.key === "alcoholManagement") {
    const option = getAlcoholManagementOption(alcoholManagementStaffCount);
    return `ניהול אלכוהול באולם — ${option.title}`;
  }

  return upsell.title;
}

function getUpsellDynamicDescription(
  upsell: UpsellItem,
  venueSeatingStaffCount: VenueSeatingStaffCount,
  alcoholManagementStaffCount: AlcoholManagementStaffCount,
) {
  if (upsell.key === "venueSeating") {
    const option = getVenueSeatingOption(venueSeatingStaffCount);
    return `${upsell.description} ${option.description}`;
  }

  if (upsell.key === "alcoholManagement") {
    const option = getAlcoholManagementOption(alcoholManagementStaffCount);
    return `${upsell.description} ${option.description}`;
  }

  return upsell.description;
}

function getUpsellPrice(
  upsell: UpsellItem,
  venueSeatingStaffCount: VenueSeatingStaffCount,
  alcoholManagementStaffCount: AlcoholManagementStaffCount,
) {
  if (upsell.key === "venueSeating") {
    return getVenueSeatingOption(venueSeatingStaffCount).price;
  }

  if (upsell.key === "alcoholManagement") {
    return getAlcoholManagementOption(alcoholManagementStaffCount).price;
  }

  return upsell.price;
}

function getEmployeeDetailsForUpsell(upsell: UpsellItem) {
  if (isVenueSeatingUpsell(upsell.key)) {
    return VENUE_SEATING_EMPLOYEE_DETAILS;
  }

  if (upsell.key === "alcoholManagement") {
    return ALCOHOL_MANAGEMENT_EMPLOYEE_DETAILS;
  }

  if (upsell.key === "personalRepresentative") {
    return PERSONAL_REPRESENTATIVE_EMPLOYEE_DETAILS;
  }

  if (upsell.key === "suppliersBudgetSystem") {
    return SUPPLIERS_BUDGET_EMPLOYEE_DETAILS;
  }

  return upsell.details;
}

function getCustomerDetailsForUpsell(upsell: UpsellItem) {
  if (isVenueSeatingUpsell(upsell.key)) {
    return VENUE_SEATING_CUSTOMER_DETAILS;
  }

  if (upsell.key === "alcoholManagement") {
    return ALCOHOL_MANAGEMENT_CUSTOMER_DETAILS;
  }

  if (upsell.key === "personalRepresentative") {
    return PERSONAL_REPRESENTATIVE_CUSTOMER_DETAILS;
  }

  if (upsell.key === "suppliersBudgetSystem") {
    return SUPPLIERS_BUDGET_CUSTOMER_DETAILS;
  }

  return upsell.details;
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

const ALCOHOL_MANAGEMENT_CUSTOMER_DETAILS: DetailSection[] = [
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

const ALCOHOL_MANAGEMENT_EMPLOYEE_DETAILS: DetailSection[] = [
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

const PERSONAL_REPRESENTATIVE_CUSTOMER_DETAILS: DetailSection[] = [
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

const PERSONAL_REPRESENTATIVE_EMPLOYEE_DETAILS: DetailSection[] = [
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

const SUPPLIERS_BUDGET_CUSTOMER_DETAILS: DetailSection[] = [
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

const SUPPLIERS_BUDGET_EMPLOYEE_DETAILS: DetailSection[] = [
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

const QUOTE_VALIDITY_DAYS = 4;

const CANCELLATION_TERMS: DetailSection[] = [
  {
    title: "תנאי ביטול",
    items: [
      "מרגע ביצוע התשלום נפתח ללקוח משתמש במערכת ונפתחת גישה לשירותים הדיגיטליים שנרכשו, ולכן לא ניתן לבטל את השירותים הדיגיטליים לאחר פתיחת הגישה והשימוש במערכת.",
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
      "שירותים דיגיטליים ושירותי הכנה לפני האירוע, לרבות מערכת ההזמנה, אישורי ההגעה, מערכת ניהול ספקים ותקציב ונציג אישי לליווי, משולמים במלואם במועד ביצוע העסקה.",
      "שירותי יום האירוע, לרבות הושבה באולם וניהול אלכוהול באולם, משולמים כך: 50% במועד ביצוע העסקה לצורך שריון הצוות והתאריך, ו־50% יתרה ביום האירוע.",
      "הלקוח מאשר כי הוסבר לו ששירותי יום האירוע דורשים שריון כוח אדם מראש, ולכן התשלום הראשוני עבור שירותים אלו משמש כדמי שריון לצוות ולתאריך האירוע.",
    ],
  },
];

const UPSELLS: UpsellItem[] = [
  {
    key: "venueSeating",
    title: "הושבה באולם",
    price: 1000,
    description:
      "שירות הושבה באולם עם בחירת כמות אנשי צוות לפי גודל האירוע.",
    details: VENUE_SEATING_EMPLOYEE_DETAILS,
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
      "ניהול, פיזור ותיעוד אלכוהול באולם עד השעה 02:00 לכל המאוחר.",
    details: ALCOHOL_MANAGEMENT_EMPLOYEE_DETAILS,
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
    venueSeating: false,
    personalRepresentative: false,
    thirdRsvpRound: false,
    suppliersBudgetSystem: false,
    alcoholManagement: false,
  };
}

function calculateUpsellsTotal({
  selectedUpsells,
  suppliersBudgetFree,
  venueSeatingStaffCount,
  alcoholManagementStaffCount,
}: {
  selectedUpsells: SelectedUpsells;
  suppliersBudgetFree: boolean;
  venueSeatingStaffCount: VenueSeatingStaffCount;
  alcoholManagementStaffCount: AlcoholManagementStaffCount;
}) {
  return UPSELLS.reduce((sum, item) => {
    if (!selectedUpsells[item.key]) return sum;

    if (item.key === "suppliersBudgetSystem" && suppliersBudgetFree) {
      return sum;
    }

    return (
      sum +
      getUpsellPrice(
        item,
        venueSeatingStaffCount,
        alcoholManagementStaffCount,
      )
    );
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

function formatDate(value: string) {
  if (!value) return "לא הוגדר";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("he-IL");
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

function isEventDayService(key: UpsellKey) {
  return key === "venueSeating" || key === "alcoholManagement";
}

function createLocalDocumentUrl(type: GeneratedDocumentType) {
  if (typeof window === "undefined") return "";

  const token = `${type}-${Date.now().toString(36)}`;
  return `${window.location.origin}/employee/sales/documents/${token}`;
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
  const [eventCity, setEventCity] = useState("");
  const [venueName, setVenueName] = useState("");
  const [customerIdNumber, setCustomerIdNumber] = useState("");

  const [selectedPlanKey, setSelectedPlanKey] = useState<PackageKey>("smart");
  const [records, setRecords] = useState("300");

  const [selectedUpsells, setSelectedUpsells] = useState<SelectedUpsells>(() =>
    createEmptyUpsells(),
  );
  const [venueSeatingStaffCount, setVenueSeatingStaffCount] =
    useState<VenueSeatingStaffCount>(1);
  const [alcoholManagementStaffCount, setAlcoholManagementStaffCount] =
    useState<AlcoholManagementStaffCount>(1);
  const [suppliersBudgetFree, setSuppliersBudgetFree] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState<"stripe" | "paid">(
    "stripe",
  );

  const [generatedDocument, setGeneratedDocument] =
    useState<GeneratedDocumentLink>(null);
  const [documentSaving, setDocumentSaving] = useState(false);
  const [signatureFullName, setSignatureFullName] = useState("");
  const [signatureIdNumber, setSignatureIdNumber] = useState("");
  const [signatureDate, setSignatureDate] = useState(() =>
    toDateInputValue(new Date()),
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

  useEffect(() => {
    if (packageCalculation.records > 200 && venueSeatingStaffCount === 1) {
      setVenueSeatingStaffCount(2);
    }

    if (
      packageCalculation.records > 450 &&
      alcoholManagementStaffCount === 1
    ) {
      setAlcoholManagementStaffCount(2);
    }
  }, [
    alcoholManagementStaffCount,
    packageCalculation.records,
    venueSeatingStaffCount,
  ]);

  const canGiveSuppliersBudgetFree =
    packageCalculation.finalPrice +
      UPSELLS.reduce((sum, upsell) => {
        if (upsell.key === "suppliersBudgetSystem") return sum;
        if (!selectedUpsells[upsell.key]) return sum;

        return (
          sum +
          getUpsellPrice(
            upsell,
            venueSeatingStaffCount,
            alcoholManagementStaffCount,
          )
        );
      }, 0) >=
    1000;

  const selectedUpsellsList = useMemo(() => {
    return UPSELLS.filter((upsell) => selectedUpsells[upsell.key]);
  }, [selectedUpsells]);

  const upsellsTotal = useMemo(() => {
    return calculateUpsellsTotal({
      selectedUpsells,
      suppliersBudgetFree: suppliersBudgetFree && canGiveSuppliersBudgetFree,
      venueSeatingStaffCount,
      alcoholManagementStaffCount,
    });
  }, [
    alcoholManagementStaffCount,
    canGiveSuppliersBudgetFree,
    selectedUpsells,
    suppliersBudgetFree,
    venueSeatingStaffCount,
  ]);

  const finalGrossAmount = useMemo(() => {
    return roundMoney(packageCalculation.finalPrice + upsellsTotal);
  }, [packageCalculation.finalPrice, upsellsTotal]);

  const calculated = useMemo(() => {
    return calculate(finalGrossAmount);
  }, [finalGrossAmount]);

  const quoteCreatedAt = useMemo(() => toDateInputValue(new Date()), []);
  const quoteExpiresAt = useMemo(
    () => toDateInputValue(addDays(new Date(), QUOTE_VALIDITY_DAYS)),
    [],
  );

  const paymentSchedule = useMemo<PaymentSchedule>(() => {
    const preEventServicesTotal = packageCalculation.finalPrice;
    const eventServicesTotal = selectedUpsellsList.reduce((sum, upsell) => {
      if (!isEventDayService(upsell.key)) return sum;

      return (
        sum +
        getUpsellPrice(
          upsell,
          venueSeatingStaffCount,
          alcoholManagementStaffCount,
        )
      );
    }, 0);

    const nonEventUpsellsTotal = selectedUpsellsList.reduce((sum, upsell) => {
      if (isEventDayService(upsell.key)) return sum;

      if (
        upsell.key === "suppliersBudgetSystem" &&
        suppliersBudgetFree &&
        canGiveSuppliersBudgetFree
      ) {
        return sum;
      }

      return (
        sum +
        getUpsellPrice(
          upsell,
          venueSeatingStaffCount,
          alcoholManagementStaffCount,
        )
      );
    }, 0);

    const eventServicesDeposit = roundMoney(eventServicesTotal * 0.5);
    const eventServicesBalance = roundMoney(eventServicesTotal - eventServicesDeposit);

    return {
      preEventServicesTotal: roundMoney(preEventServicesTotal + nonEventUpsellsTotal),
      eventServicesTotal: roundMoney(eventServicesTotal),
      eventServicesDeposit,
      eventServicesBalance,
      immediateTotal: roundMoney(
        preEventServicesTotal + nonEventUpsellsTotal + eventServicesDeposit,
      ),
      eventDayTotal: eventServicesBalance,
    };
  }, [
    alcoholManagementStaffCount,
    canGiveSuppliersBudgetFree,
    packageCalculation.finalPrice,
    selectedUpsellsList,
    suppliersBudgetFree,
    venueSeatingStaffCount,
  ]);

  const customerDealSummary = useMemo(() => {
    return {
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
      paymentSchedule,
      cancellationTerms: CANCELLATION_TERMS,
      paymentTerms: PAYMENT_TERMS,
      includedItems: selectedPlan.includes,
      upsells: selectedUpsellsList.map((upsell) => {
        const givenFree =
          upsell.key === "suppliersBudgetSystem" &&
          suppliersBudgetFree &&
          canGiveSuppliersBudgetFree;

        return {
          title: getUpsellDynamicTitle(
            upsell,
            venueSeatingStaffCount,
            alcoholManagementStaffCount,
          ),
          description: getUpsellDynamicDescription(
            upsell,
            venueSeatingStaffCount,
            alcoholManagementStaffCount,
          ),
          customerDetails: getCustomerDetailsForUpsell(upsell),
          givenFree,
        };
      }),
    };
  }, [
    alcoholManagementStaffCount,
    canGiveSuppliersBudgetFree,
    eventCity,
    eventDate,
    eventName,
    finalGrossAmount,
    packageCalculation.records,
    paymentSchedule,
    quoteCreatedAt,
    quoteExpiresAt,
    selectedPlan.customerSummary,
    selectedPlan.includes,
    selectedPlan.title,
    selectedUpsellsList,
    venueName,
    suppliersBudgetFree,
    venueSeatingStaffCount,
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

  const isDocumentActionDisabled =
    documentSaving ||
    !clientName.trim() ||
    !clientEmail.trim() ||
    !clientPhone.trim() ||
    !eventDate ||
    !eventCity.trim() ||
    !venueName.trim() ||
    finalGrossAmount <= 0;

  async function createDocumentLink(type: GeneratedDocumentType) {
    if (isDocumentActionDisabled) return;

    try {
      setError("");
      setDocumentSaving(true);

      const payload = {
        type,
        client: {
          fullName: clientName.trim(),
          idNumber: customerIdNumber.trim(),
          email: clientEmail.trim(),
          phone: clientPhone.trim(),
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
        agreement: {
          signatureFullName: signatureFullName.trim(),
          signatureIdNumber: signatureIdNumber.trim(),
          signatureDate,
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
          const dynamicPrice = getUpsellPrice(
            upsell,
            venueSeatingStaffCount,
            alcoholManagementStaffCount,
          );
          const givenFree =
            upsell.key === "suppliersBudgetSystem" &&
            suppliersBudgetFree &&
            canGiveSuppliersBudgetFree;

          return {
            key: upsell.key,
            title: getUpsellDynamicTitle(
              upsell,
              venueSeatingStaffCount,
              alcoholManagementStaffCount,
            ),
            description: getUpsellDynamicDescription(
              upsell,
              venueSeatingStaffCount,
              alcoholManagementStaffCount,
            ),
            customerDetails: getCustomerDetailsForUpsell(upsell),
            staffCount:
              upsell.key === "venueSeating"
                ? venueSeatingStaffCount
                : upsell.key === "alcoholManagement"
                  ? alcoholManagementStaffCount
                  : null,
            price: givenFree ? 0 : dynamicPrice,
            givenFree,
            paymentType: isEventDayService(upsell.key)
              ? "event_day_service"
              : "pre_event_service",
          };
        }),
        totals: {
          grossAmount: finalGrossAmount,
          netAmount: calculated.net,
          vatRate: VAT_RATE,
          paymentSchedule,
        },
        customerDealSummary,
        cancellationTerms: CANCELLATION_TERMS,
        paymentTerms: PAYMENT_TERMS,
      };

      const response = await fetch("/api/employee/sales/documents", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).catch(() => null);

      const data = response ? await response.json().catch(() => null) : null;
      const url = data?.url || data?.documentUrl || createLocalDocumentUrl(type);

      setGeneratedDocument({
        type,
        url,
        createdAt: quoteCreatedAt,
        expiresAt: quoteExpiresAt,
      });

      setTimeout(() => {
        document.getElementById("document-preview")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    } catch (documentError) {
      console.error("CREATE DOCUMENT LINK FAILED:", documentError);
      setError(
        documentError instanceof Error
          ? documentError.message
          : "שגיאה ביצירת קישור למסמך",
      );
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          clientPhone: clientPhone.trim(),
          eventName: eventName.trim(),
          eventDate,
          eventCity: eventCity.trim(),
          venueName: venueName.trim(),
          customerIdNumber: customerIdNumber.trim(),

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

          upsells: selectedUpsellsList.map((upsell) => {
            const dynamicPrice = getUpsellPrice(
              upsell,
              venueSeatingStaffCount,
              alcoholManagementStaffCount,
            );
            const givenFree =
              upsell.key === "suppliersBudgetSystem" &&
              suppliersBudgetFree &&
              canGiveSuppliersBudgetFree;

            return {
              key: upsell.key,
              title: getUpsellDynamicTitle(
                upsell,
                venueSeatingStaffCount,
                alcoholManagementStaffCount,
              ),
              description: getUpsellDynamicDescription(
                upsell,
                venueSeatingStaffCount,
                alcoholManagementStaffCount,
              ),
              details: getEmployeeDetailsForUpsell(upsell),
              employeeDetails: getEmployeeDetailsForUpsell(upsell),
              customerDetails: getCustomerDetailsForUpsell(upsell),
              selectedStaffCount:
                upsell.key === "venueSeating"
                  ? venueSeatingStaffCount
                  : upsell.key === "alcoholManagement"
                    ? alcoholManagementStaffCount
                    : null,
              originalPrice: dynamicPrice,
              price: givenFree ? 0 : dynamicPrice,
              givenFree,
            };
          }),

          saleCompliance: {
            recordedCall: confirmRecordedCall,
            cardOwnerConfirmed: confirmCardOwner,
            cardHolderPresentAndApproved: confirmCardOwner,
            saleSummaryConfirmed: confirmSaleSummary,
            termsConfirmed: confirmTerms,
            summary: saleSummary.trim(),
          },

          customerDealSummary,

          quote: {
            createdAt: quoteCreatedAt,
            expiresAt: quoteExpiresAt,
            validityDays: QUOTE_VALIDITY_DAYS,
          },
          agreement: {
            signatureFullName: signatureFullName.trim(),
            signatureIdNumber: signatureIdNumber.trim(),
            signatureDate,
          },
          paymentSchedule,
          cancellationTerms: CANCELLATION_TERMS,
          paymentTerms: PAYMENT_TERMS,

          notes: saleSummary.trim(),

          payment: {
            method: paymentStatus,
            provider: paymentStatus === "stripe" ? "stripe" : "manual",
            amount: finalGrossAmount,
            immediateAmount: paymentSchedule.immediateTotal,
            eventDayAmount: paymentSchedule.eventDayTotal,
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

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    עיר האירוע *
                  </span>
                  <input
                    value={eventCity}
                    onChange={(e) => setEventCity(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="לדוגמה: אשדוד"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    שם האולם *
                  </span>
                  <input
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="לדוגמה: טרויה"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-black text-slate-700">
                    תעודת זהות לקוח לחתימה
                  </span>
                  <input
                    value={customerIdNumber}
                    onChange={(e) => setCustomerIdNumber(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="יופיע בהסכם החתימה"
                    dir="ltr"
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
                  const isVenueSeating = upsell.key === "venueSeating";
                  const isAlcoholManagement =
                    upsell.key === "alcoholManagement";
                  const dynamicPrice = getUpsellPrice(
                    upsell,
                    venueSeatingStaffCount,
                    alcoholManagementStaffCount,
                  );
                  const freeApplied =
                    isSuppliers &&
                    selected &&
                    suppliersBudgetFree &&
                    canGiveSuppliersBudgetFree;
                  const displayTitle = getUpsellDynamicTitle(
                    upsell,
                    venueSeatingStaffCount,
                    alcoholManagementStaffCount,
                  );
                  const displayDescription = getUpsellDynamicDescription(
                    upsell,
                    venueSeatingStaffCount,
                    alcoholManagementStaffCount,
                  );

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
                              {displayTitle}
                            </span>
                            <span className="mt-1 block text-xs font-semibold leading-5 text-[#7b6a58]">
                              {displayDescription}
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
                                  title: displayTitle,
                                  subtitle: displayDescription,
                                  price: dynamicPrice,
                                  sections: getEmployeeDetailsForUpsell(upsell),
                                  employeeSections:
                                    getEmployeeDetailsForUpsell(upsell),
                                  customerSections:
                                    getCustomerDetailsForUpsell(upsell),
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
                                {money(dynamicPrice)}
                              </p>
                              <p className="text-sm font-black text-emerald-700">
                                ללא עלות
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-black text-[#3f3327]">
                              {money(dynamicPrice)}
                            </p>
                          )}
                        </div>
                      </div>

                      {isVenueSeating && selected && (
                        <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-3">
                          <p className="text-xs font-black text-[#3f3327]">
                            בחירת כמות אנשי צוות להושבה באולם
                          </p>

                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {VENUE_SEATING_OPTIONS.map((option) => {
                              const disabled = isVenueStaffOptionDisabled(
                                option,
                                packageCalculation.records,
                              );

                              return (
                                <label
                                  key={option.staffCount}
                                  className={`rounded-2xl border p-3 text-xs font-bold leading-5 transition ${
                                    venueSeatingStaffCount ===
                                    option.staffCount
                                      ? "border-[#b47a3b] bg-[#fff7ec] text-[#3f3327]"
                                      : "border-[#eadfce] bg-[#fffdf9] text-[#7b6a58]"
                                  } ${
                                    disabled
                                      ? "cursor-not-allowed opacity-50"
                                      : "cursor-pointer hover:border-[#d5b98b]"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="venueSeatingStaffCount"
                                    checked={
                                      venueSeatingStaffCount ===
                                      option.staffCount
                                    }
                                    disabled={disabled}
                                    onChange={() =>
                                      setVenueSeatingStaffCount(
                                        option.staffCount,
                                      )
                                    }
                                    className="ml-2 accent-[#9b7a3c]"
                                  />
                                  <span className="font-black">
                                    {option.title}
                                  </span>
                                  <span className="mt-1 block">
                                    {money(option.price)}
                                  </span>
                                  <span className="mt-1 block">
                                    {option.description}
                                  </span>
                                  {disabled && (
                                    <span className="mt-1 block text-rose-600">
                                      לא זמין מעל 200 רשומות.
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {isAlcoholManagement && selected && (
                        <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-3">
                          <p className="text-xs font-black text-[#3f3327]">
                            בחירת כמות אנשי צוות לניהול אלכוהול
                          </p>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {ALCOHOL_MANAGEMENT_OPTIONS.map((option) => {
                              const disabled = isAlcoholStaffOptionDisabled(
                                option,
                                packageCalculation.records,
                              );

                              return (
                                <label
                                  key={option.staffCount}
                                  className={`rounded-2xl border p-3 text-xs font-bold leading-5 transition ${
                                    alcoholManagementStaffCount ===
                                    option.staffCount
                                      ? "border-[#b47a3b] bg-[#fff7ec] text-[#3f3327]"
                                      : "border-[#eadfce] bg-[#fffdf9] text-[#7b6a58]"
                                  } ${
                                    disabled
                                      ? "cursor-not-allowed opacity-50"
                                      : "cursor-pointer hover:border-[#d5b98b]"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="alcoholManagementStaffCount"
                                    checked={
                                      alcoholManagementStaffCount ===
                                      option.staffCount
                                    }
                                    disabled={disabled}
                                    onChange={() =>
                                      setAlcoholManagementStaffCount(
                                        option.staffCount,
                                      )
                                    }
                                    className="ml-2 accent-[#9b7a3c]"
                                  />
                                  <span className="font-black">
                                    {option.title}
                                  </span>
                                  <span className="mt-1 block">
                                    {money(option.price)}
                                  </span>
                                  <span className="mt-1 block">
                                    {option.description}
                                  </span>
                                  {disabled && option.staffCount === 1 && (
                                    <span className="mt-1 block text-rose-600">
                                      מעל 450 רשומות חובה לבחור 2 אנשי צוות.
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

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

            <section
              id="document-preview"
              className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    הצעת מחיר / הסכם לחתימה
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    זה העמוד שאפשר לשלוח ללקוח בתוך האתר. הצעת מחיר תקפה ל־4 ימים ממועד ההצעה. הסכם כולל פרטי חתימה.
                  </p>
                </div>

                {generatedDocument && (
                  <Pill className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {generatedDocument.type === "quote"
                      ? "קישור הצעת מחיר נוצר"
                      : "קישור הסכם נוצר"}
                  </Pill>
                )}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[26px] border border-[#eadfce] bg-[#fffdf9] p-4">
                  <p className="text-xs font-black text-[#8b7b68]">פרטי לקוח</p>
                  <p className="mt-2 text-lg font-black text-[#3f3327]">
                    {clientName || "שם לקוח"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#7b6a58]">
                    {clientEmail || "אימייל"} · {clientPhone || "טלפון"}
                  </p>
                  {customerIdNumber && (
                    <p className="mt-1 text-xs font-bold text-[#7b6a58]">
                      ת״ז: {customerIdNumber}
                    </p>
                  )}
                </div>

                <div className="rounded-[26px] border border-[#eadfce] bg-[#fffdf9] p-4">
                  <p className="text-xs font-black text-[#8b7b68]">פרטי אירוע</p>
                  <p className="mt-2 text-lg font-black text-[#3f3327]">
                    {eventName || "שם האירוע"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#7b6a58]">
                    {formatDate(eventDate)} · {eventCity || "עיר"} · {venueName || "שם אולם"}
                  </p>
                </div>

                <div className="rounded-[26px] border border-[#d8b777] bg-[#fff7ec] p-4">
                  <p className="text-xs font-black text-[#8a5c20]">תוקף הצעת מחיר</p>
                  <p className="mt-2 text-lg font-black text-[#3f3327]">
                    עד {formatDate(quoteExpiresAt)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#8b7b68]">
                    לאחר 4 ימים ההצעה תימחק אם לא בוצעה עסקה.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[28px] border border-[#eadfce] bg-[#fffdf9] p-5">
                <h3 className="text-xl font-black text-[#3f3327]">
                  פירוט העסקה ללקוח
                </h3>
                <p className="mt-2 text-sm font-semibold leading-7 text-[#5b4a3a]">
                  {customerDealSummary.packageSummary}
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                    <p className="text-xs font-black text-[#8b7b68]">סה״כ עסקה</p>
                    <p className="mt-1 text-2xl font-black text-[#3f3327]">
                      {money(finalGrossAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-black text-emerald-700">לתשלום מראש</p>
                    <p className="mt-1 text-2xl font-black text-emerald-900">
                      {money(paymentSchedule.immediateTotal)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-black text-amber-700">לתשלום ביום האירוע</p>
                    <p className="mt-1 text-2xl font-black text-amber-900">
                      {money(paymentSchedule.eventDayTotal)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-4 text-sm font-bold leading-7 text-[#5b4a3a]">
                  שירותים דיגיטליים ושירותי הכנה לפני האירוע משולמים במלואם במועד ביצוע העסקה, מאחר שמיד לאחר התשלום נפתח ללקוח משתמש וגישה לשירותים. שירותי יום האירוע, כגון הושבה באולם וניהול אלכוהול, משולמים 50% מראש לצורך שריון הצוות והתאריך ו־50% ביום האירוע.
                </div>

                <div className="mt-5 space-y-4">
                  <section className="rounded-[24px] border border-[#eadfce] bg-white p-4">
                    <h4 className="text-lg font-black text-[#3f3327]">
                      {selectedPlan.title}
                    </h4>
                    <ul className="mt-3 space-y-2">
                      {selectedPlan.includes.map((item) => (
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

                  {selectedUpsellsList.map((upsell) => (
                    <section
                      key={upsell.key}
                      className="rounded-[24px] border border-[#eadfce] bg-white p-4"
                    >
                      <h4 className="text-lg font-black text-[#3f3327]">
                        {getUpsellDynamicTitle(
                          upsell,
                          venueSeatingStaffCount,
                          alcoholManagementStaffCount,
                        )}
                      </h4>
                      <p className="mt-1 text-xs font-bold text-[#8b7b68]">
                        {getUpsellDynamicDescription(
                          upsell,
                          venueSeatingStaffCount,
                          alcoholManagementStaffCount,
                        )}
                      </p>

                      <div className="mt-4 space-y-3">
                        {getCustomerDetailsForUpsell(upsell).map((section) => (
                          <div key={section.title}>
                            <p className="text-sm font-black text-[#3f3327]">
                              {section.title}
                            </p>
                            <ul className="mt-2 space-y-1">
                              {section.items.map((item) => (
                                <li
                                  key={item}
                                  className="text-xs font-semibold leading-6 text-[#5b4a3a]"
                                >
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {PAYMENT_TERMS.map((section) => (
                    <section
                      key={section.title}
                      className="rounded-[24px] border border-[#eadfce] bg-white p-4"
                    >
                      <h4 className="text-lg font-black text-[#3f3327]">
                        {section.title}
                      </h4>
                      <ul className="mt-3 space-y-2">
                        {section.items.map((item) => (
                          <li key={item} className="text-xs font-semibold leading-6 text-[#5b4a3a]">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}

                  {CANCELLATION_TERMS.map((section) => (
                    <section
                      key={section.title}
                      className="rounded-[24px] border border-rose-100 bg-rose-50/50 p-4"
                    >
                      <h4 className="text-lg font-black text-[#3f3327]">
                        {section.title}
                      </h4>
                      <ul className="mt-3 space-y-2">
                        {section.items.map((item) => (
                          <li key={item} className="text-xs font-semibold leading-6 text-[#5b4a3a]">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>

                <div className="mt-5 rounded-[24px] border border-[#eadfce] bg-white p-4">
                  <h4 className="text-lg font-black text-[#3f3327]">
                    חתימה דיגיטלית להסכם
                  </h4>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="block">
                      <span className="text-xs font-black text-[#7b6a58]">שם מלא</span>
                      <input
                        value={signatureFullName}
                        onChange={(e) => setSignatureFullName(e.target.value)}
                        className="mt-2 h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-3 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                        placeholder={clientName || "שם מלא"}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-black text-[#7b6a58]">תעודת זהות</span>
                      <input
                        value={signatureIdNumber}
                        onChange={(e) => setSignatureIdNumber(e.target.value)}
                        className="mt-2 h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-3 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                        placeholder={customerIdNumber || "תעודת זהות"}
                        dir="ltr"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-black text-[#7b6a58]">תאריך חתימה</span>
                      <input
                        type="date"
                        value={signatureDate}
                        onChange={(e) => setSignatureDate(e.target.value)}
                        className="mt-2 h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-3 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                      />
                    </label>
                  </div>
                  <div className="mt-4 rounded-2xl border border-dashed border-[#d8b777] bg-[#fff7ec] p-4 text-center text-sm font-black text-[#8a5c20]">
                    אזור חתימה דיגיטלית יוצג ללקוח בעמוד ההסכם.
                  </div>
                </div>

                {generatedDocument && (
                  <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-black text-emerald-800">
                      קישור לשליחה ללקוח
                    </p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <input
                        value={generatedDocument.url}
                        readOnly
                        className="h-12 flex-1 rounded-2xl border border-emerald-200 bg-white px-4 text-left text-xs font-bold text-emerald-900"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(generatedDocument.url)}
                        className="h-12 rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white transition hover:bg-emerald-800"
                      >
                        העתק קישור
                      </button>
                    </div>
                  </div>
                )}
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
                        const dynamicPrice = getUpsellPrice(
                          upsell,
                          venueSeatingStaffCount,
                          alcoholManagementStaffCount,
                        );

                        return (
                          <div
                            key={upsell.key}
                            className="flex items-start justify-between gap-3 text-xs font-bold leading-5 text-[#8b7b68]"
                          >
                            <span>
                              {getUpsellDynamicTitle(
                                upsell,
                                venueSeatingStaffCount,
                                alcoholManagementStaffCount,
                              )}
                            </span>
                            <span className="shrink-0">
                              {free ? "ללא עלות" : money(dynamicPrice)}
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

                <div className="grid gap-3">
                  <button
                    type="button"
                    disabled={isDocumentActionDisabled}
                    onClick={() => createDocumentLink("quote")}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d8b777] bg-[#fff7ec] px-5 text-sm font-black text-[#8a5c20] transition hover:bg-[#ffefd8] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon name="card" className="h-4 w-4" />
                    שליחת הצעת מחיר
                  </button>

                  <button
                    type="button"
                    disabled={isDocumentActionDisabled}
                    onClick={() => createDocumentLink("agreement")}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon name="shield" className="h-4 w-4" />
                    יצירת קישור להסכם וחתימה
                  </button>
                </div>

                <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdf9] p-4">
                  <p className="text-sm font-black text-[#3f3327]">חלוקת תשלום</p>
                  <div className="mt-3 space-y-2 text-xs font-bold leading-5 text-[#7b6a58]">
                    <div className="flex items-center justify-between gap-3">
                      <span>לתשלום מראש</span>
                      <span>{money(paymentSchedule.immediateTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>לתשלום ביום האירוע</span>
                      <span>{money(paymentSchedule.eventDayTotal)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] font-bold leading-5 text-[#8b7b68]">
                    שירותים דיגיטליים והכנה לפני האירוע משולמים במלואם. שירותי יום האירוע משולמים 50% מראש ו־50% ביום האירוע.
                  </p>
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
