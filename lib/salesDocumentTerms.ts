export type DetailSection = {
  title: string;
  items: string[];
};

const CUSTOMER_SPLIT_PAYMENT_TERM =
  "כאשר נבחר תשלום ראשוני ויתרה, סכום התשלום הראשוני, סכום היתרה ומועד התשלום יוצגו בסיכום המחיר או בהסכם.";

const EMPLOYEE_ONLY_SECTION_TITLE_PATTERNS = [
  /מה העובד/i,
  /דגשים לעובד/i,
  /סיכום לעובד/i,
  /דגשים להצגה בשיחה/i,
  /מתנות באשראי — דגשים לעובד/i,
];

const EMPLOYEE_ONLY_ITEM_PATTERNS = [
  /העובד יכול/i,
  /ניתן לעריכה על ידי העובד/i,
  /העובד רשאי/i,
  /שיקול העובד/i,
  /נקבע במערכת בזמן המכירה וניתן לעריכה/i,
];

export const CUSTOMER_ENGAGEMENT_TERMS: DetailSection[] = [
  {
    title: "תנאי התקשרות",
    items: [
      "הלקוח מאשר כי קרא, הבין והסכים לתנאי ההתקשרות, לתנאי השימוש ולתקנון Invistimo, וכי הם מהווים חלק בלתי נפרד מההתקשרות בין הצדדים.",
      "עצם ביצוע תשלום כלשהו בגין ההזמנה, לרבות מקדמה, דמי שריון, תשלום ראשוני, תשלום חלקי או תשלום מלא, מהווה אישור מצד הלקוח להזמנה ולהתקשרות עם Invistimo, וכן הסכמה למחיר, להיקף השירותים שנרכשו, למועדי התשלום, לתנאי השירות, לתנאי הביטול, לתנאי השימוש ולתקנון Invistimo.",
      "ביצוע התשלום מהווה גם אישור לכך שתנאי ההתקשרות הרלוונטיים הועמדו לרשות הלקוח לעיון טרם ביצוע התשלום וכי ניתנה לו האפשרות לעיין בהם.",
      "חתימת הלקוח על ההסכם מהווה אישור נוסף לתנאי ההתקשרות ואינה גורעת מתוקף ההסכמה שניתנה באמצעות ביצוע התשלום. ככל שבוצע תשלום לפני החתימה, עצם ביצוע התשלום מהווה אישור להתקשרות ולהסכמה לתנאיה.",
      "באחריות הלקוח למסור ל־Invistimo במועד את כל המידע, הרשימות, פרטי אנשי הקשר והעדכונים הנדרשים לצורך מתן השירות, וכן לוודא שיתוף פעולה מצד מנהל האירוע, האולם וכל גורם אחר מטעמו הנדרש לצורך ביצוע השירות.",
      "כל עיכוב, חוסר, טעות, אי מסירת מידע, אי זמינות או אי ביצוע פעולה הנדרשת מצד הלקוח או מי מטעמו, אשר השפיעו על ביצוע השירות, ייחשבו כנסיבות שאינן בשליטת Invistimo. במקרים אלה Invistimo לא תישא באחריות לעיכוב, שינוי בתזמון, אי ביצוע מלא או כל תוצאה שנגרמה עקב כך.",
      "במקרה של חוסר שיתוף פעולה, התעלמות מפניות הצוות, הרמת קול, התנהלות שאינה הולמת או כל נסיבה אחרת שאינה מאפשרת לצוות לבצע את עבודתו באופן תקין, Invistimo תהיה רשאית להפסיק את השירות או להורות לצוות לעזוב את המקום. ככל שהנסיבות נגרמו מצד הלקוח או מי מטעמו, הדבר לא יגרע מחובת התשלום בהתאם להזמנה ולתנאי ההתקשרות, בכפוף לדין.",
    ],
  },
];

export const CUSTOMER_PAYMENT_TERMS: DetailSection[] = [
  {
    title: "תנאי תשלום",
    items: [
      "התשלום עבור השירות יבוצע בהתאם למועדים שנקבעו בהזמנה, בהצעת המחיר או בהסכם ההתקשרות. מועדי התשלום מהווים חלק מהותי מתנאי ההתקשרות.",
      "שירותים דיגיטליים ושירותי הכנה לפני האירוע ישולמו במלואם במועד ביצוע העסקה, אלא אם סוכם אחרת בכתב.",
      "שירותי יום האירוע, לרבות הושבה באולם וניהול אלכוהול באולם, ישולמו בהתאם למסלול התשלום שנבחר בהזמנה, לרבות תשלום מלא מראש או תשלום ראשוני ויתרה במועד שנקבע בהזמנה.",
      CUSTOMER_SPLIT_PAYMENT_TERM,
      "באחריות הלקוח להסדיר כל תשלום במועד שנקבע, ללא צורך בתזכורות, דרישות תשלום או פניות חוזרות מצד Invistimo. אי קבלת תזכורת אינה דוחה את מועד התשלום ואינה פוטרת את הלקוח מחובת התשלום.",
      "אי שביעות רצון, טענה, מחלוקת או תלונה בנוגע לשירות אינן דוחות את מועד התשלום ואינן מקנות ללקוח זכות לעכב, לעצור, לקזז או להפחית תשלום באופן חד צדדי. ככל שקיימת טענה בנוגע לשירות, היא תיבדק ותטופל בנפרד ובהתאם לתנאי ההתקשרות ולדין.",
      "כל הפחתה, זיכוי, החזר או שינוי בסכום התשלום יבוצעו רק לאחר בדיקה ובאישור מפורש מטעם Invistimo.",
      "מקום שבו ביצוע השירות הושפע, הוגבל, התעכב או לא ניתן היה להשלימו במלואו עקב נסיבות התלויות בלקוח או במי מטעמו, לרבות חוסר שיתוף פעולה מצד מנהל האירוע או האולם, לא יהיה בכך כדי לגרוע מחובת התשלום בהתאם להזמנה ולתנאי ההתקשרות.",
      "יתרה שלא שולמה במועד תיחשב לחוב בפיגור. Invistimo תהיה רשאית להעביר חוב שלא הוסדר להליכי גבייה ולטיפול משפטי ולדרוש, ככל שהדין מאפשר, ריבית, הצמדה, הוצאות גבייה סבירות והוצאות משפטיות שנגרמו לצורך גביית החוב.",
    ],
  },
];

export const CUSTOMER_CANCELLATION_TERMS: DetailSection[] = [
  {
    title: "תנאי ביטול",
    items: [
      "שירותים דיגיטליים ושירותי הכנה לפני האירוע אינם ניתנים לביטול לאחר פתיחת הגישה למערכת או לאחר תחילת ביצוע השירות, בכפוף להוראות הדין.",
      "שירותים הניתנים ביום האירוע, לרבות הושבה באולם וניהול אלכוהול באולם, ניתנים לביטול בהודעה מוקדמת של יותר מחודש לפני מועד האירוע.",
      "במקרה של ביטול שירות יום אירוע בהתראה של יותר מחודש, דמי השריון ששולמו מראש אינם מוחזרים, מאחר שהם מיועדים לשריון הצוות ותאריך האירוע מראש.",
      "ביטול שירות יום אירוע בהתראה של חודש או פחות ממועד האירוע אינו מזכה בהחזר ואינו מבטל את יתרת התשלום עבור השירות שהוזמן, אלא אם סוכם אחרת בכתב ובכפוף להוראות הדין.",
      "כאשר שירות יום האירוע נרכש כחלק מחבילה כוללת שנקבע עבורה מחיר כולל אחד, ביטול של אחד מרכיבי החבילה אינו מקנה באופן אוטומטי הפחתה יחסית במחיר החבילה.",
      "במקרה של ביטול רכיב מתוך חבילה כוללת, המחיר עבור יתר רכיבי החבילה שאינם מבוטלים יחושב מחדש בהתאם למחירם הנפרד או למחיר שנקבע עבורם במסגרת ההתקשרות. ככל שניתנה הנחה או הטבה בשל רכישת החבילה המלאה, Invistimo תהיה רשאית לבטל את ההנחה ביחס לרכיבים שנותרו, והלקוח יידרש להשלים כל הפרש תשלום שנוצר כתוצאה מכך.",
      "במקרה של ביטול או דחיית האירוע עקב כוח עליון, לרבות מלחמה, מצב ביטחוני חריג, הנחיית רשויות או נסיבות חיצוניות שאינן בשליטת הלקוח או Invistimo, ניתן יהיה לדחות את השירותים למועד האירוע החדש, בכפוף לזמינות ולתיאום מראש. שירותים דיגיטליים שטרם נוצלו בפועל יועברו למועד החדש ולא ייחשבו כמבוטלים.",
    ],
  },
];

export const CUSTOMER_ADDITIONAL_TERMS: DetailSection[] = [
  {
    title: "תנאים נוספים",
    items: [
      "באחריות הלקוח להעלות את רשימת המוזמנים למערכת במועד הנדרש, לעדכן את Invistimo לאחר השלמת העלאת הרשימה לצורך תזמון הסבבים, ולוודא כי רשימת המוזמנים וסידורי ההושבה מעודכנים ומושלמים לפני שליחת ההודעות.",
      "כל פעולה שלא בוצעה במועד על ידי הלקוח או מי מטעמו, ואשר השפיעה על ביצוע השירות, תיחשב כנסיבה שאינה בשליטת Invistimo. במקרה כזה Invistimo לא תישא באחריות לעיכוב, אי ביצוע מלא, שינוי בתזמון, אי שליחת הודעות או כל תוצאה אחרת שנגרמה עקב כך.",
      "סבב הודעות שכבר בוצע אינו נשלח מחדש באופן פרטני לרשומות בודדות שנוספו לאחר מכן. רשומות שיתווספו לאחר ביצוע סבב ייכללו בסבב הבא, ככל שקיים ובהתאם לתזמון שנקבע.",
      "שליחת הודעות WhatsApp כפופה למדיניות, לאישורים ולמנגנוני המסירה של Meta, וכן להגדרות פרטיות, חסימות או מגבלות הקיימות אצל הנמען. Invistimo אינה יכולה להבטיח מסירה בפועל במקרים שבהם ההודעה נחסמת, נדחית או אינה נמסרת מסיבות שאינן בשליטתה.",
    ],
  },
];

function isEmployeeOnlySection(section: DetailSection) {
  const title = section.title || "";

  return EMPLOYEE_ONLY_SECTION_TITLE_PATTERNS.some((pattern) =>
    pattern.test(title),
  );
}

function sanitizeDetailItemForCustomer(item: string) {
  if (EMPLOYEE_ONLY_ITEM_PATTERNS.some((pattern) => pattern.test(item))) {
    if (/תשלום ראשוני|יתרה ביום האירוע|יתרה ליום האירוע/i.test(item)) {
      return CUSTOMER_SPLIT_PAYMENT_TERM;
    }

    return null;
  }

  return item;
}

export function sanitizeDetailSectionsForCustomer(
  sections: DetailSection[] | undefined | null,
): DetailSection[] {
  if (!sections?.length) {
    return [];
  }

  return sections
    .filter((section) => !isEmployeeOnlySection(section))
    .map((section) => ({
      ...section,
      items: section.items.flatMap((item) => {
        const sanitizedItem = sanitizeDetailItemForCustomer(item);
        return sanitizedItem ? [sanitizedItem] : [];
      }),
    }))
    .filter((section) => section.items.length > 0);
}

export function sanitizePaymentTermsForCustomer(
  sections: DetailSection[] | undefined | null,
): DetailSection[] {
  return sanitizeDetailSectionsForCustomer(sections);
}

function sanitizeUpsellForCustomer(upsell: Record<string, unknown>) {
  const { employeeDetails: _employeeDetails, ...rest } = upsell;

  return {
    ...rest,
    customerDetails: sanitizeDetailSectionsForCustomer(
      upsell.customerDetails as DetailSection[] | undefined,
    ),
  };
}

function sanitizeCustomerDealSummary(
  summary: Record<string, unknown> | undefined | null,
) {
  if (!summary || typeof summary !== "object") {
    return summary;
  }

  const { paymentTerms, cancellationTerms, additionalTerms, engagementTerms, upsells, ...rest } =
    summary;

  return {
    ...rest,
    engagementTerms: sanitizeDetailSectionsForCustomer(
      engagementTerms as DetailSection[] | undefined,
    ),
    paymentTerms: sanitizePaymentTermsForCustomer(
      paymentTerms as DetailSection[] | undefined,
    ),
    cancellationTerms: sanitizeDetailSectionsForCustomer(
      cancellationTerms as DetailSection[] | undefined,
    ),
    additionalTerms: sanitizeDetailSectionsForCustomer(
      additionalTerms as DetailSection[] | undefined,
    ),
    upsells: Array.isArray(upsells)
      ? upsells.map((upsell) =>
          sanitizeUpsellForCustomer(
            (upsell || {}) as Record<string, unknown>,
          ),
        )
      : upsells,
  };
}

export function sanitizeSalesDocumentForCustomer(
  document: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!document) {
    return null;
  }

  const {
    createdByUserId: _createdByUserId,
    audit: _audit,
    sms: _sms,
    ...rest
  } = document;

  return {
    ...rest,
    engagementTerms: sanitizeDetailSectionsForCustomer(
      document.engagementTerms as DetailSection[] | undefined,
    ),
    paymentTerms: sanitizePaymentTermsForCustomer(
      document.paymentTerms as DetailSection[] | undefined,
    ),
    cancellationTerms: sanitizeDetailSectionsForCustomer(
      document.cancellationTerms as DetailSection[] | undefined,
    ),
    additionalTerms: sanitizeDetailSectionsForCustomer(
      document.additionalTerms as DetailSection[] | undefined,
    ),
    upsells: Array.isArray(document.upsells)
      ? document.upsells.map((upsell) =>
          sanitizeUpsellForCustomer((upsell || {}) as Record<string, unknown>),
        )
      : document.upsells,
    customerDealSummary: sanitizeCustomerDealSummary(
      document.customerDealSummary as Record<string, unknown> | undefined,
    ),
  };
}
