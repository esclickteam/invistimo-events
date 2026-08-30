export type DetailSection = {
  title: string;
  items: string[];
};

const CUSTOMER_SPLIT_PAYMENT_TERM =
  "כאשר נבחר תשלום ראשוני ויתרה ביום האירוע, סכום התשלום הראשוני והיתרה ליום האירוע מוצגים בסיכום המחיר.";

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

export const CUSTOMER_PAYMENT_TERMS: DetailSection[] = [
  {
    title: "תנאי תשלום",
    items: [
      "שירותים דיגיטליים ושירותי הכנה לפני האירוע משולמים במלואם במועד ביצוע העסקה.",
      "שירותי יום האירוע, לרבות הושבה באולם וניהול אלכוהול באולם, משולמים לפי הבחירה בעסקה: תשלום מלא מראש או תשלום ראשוני ויתרה ביום האירוע.",
      CUSTOMER_SPLIT_PAYMENT_TERM,
      "המחיר הסופי בהצעת המחיר ובהסכם מוצג כולל מע״מ.",
    ],
  },
  {
    title: "יתרות ופיגורים",
    items: [
      "התשלום עבור השירות יבוצע בהתאם למועדים שנקבעו בהזמנה, בהצעת המחיר או בהסכם ההתקשרות. מועדי התשלום מהווים חלק מהותי מתנאי ההתקשרות, והלקוח מתחייב להסדיר את מלוא התשלום במועד שנקבע, ללא צורך בתזכורות או בפניות חוזרות מצד Invistimo.",
      "אי קבלת תזכורת, דרישת תשלום או הודעה נוספת מצד Invistimo אינה דוחה את מועד התשלום ואינה פוטרת את הלקוח מחובתו להסדיר את התשלום במועד.",
      "אי שביעות רצון, טענה, מחלוקת או תלונה בנוגע לשירות אינן פוטרות את הלקוח מחובתו להסדיר את התשלום במועד, ואינן מקנות לו זכות לעכב, לעצור, לקזז או להפחית תשלום באופן חד צדדי. ככל שללקוח קיימת טענה בנוגע לשירות, היא תיבדק ותטופל בנפרד, בהתאם לתנאי ההתקשרות ולדין.",
      "כל הפחתה, זיכוי, החזר או שינוי בסכום התשלום יבוצעו רק לאחר בדיקה ובאישור מפורש מטעם Invistimo. הלקוח אינו רשאי לקבוע על דעת עצמו כי חלק מהתשלום או כולו לא ישולם.",
      "מקום שבו ביצוע השירות הושפע, הוגבל, התעכב או לא ניתן היה להשלימו במלואו עקב חוסר שיתוף פעולה מצד הלקוח, מנהל האירוע, האולם או מי מאנשי הקשר מטעם הלקוח, לרבות אי זמינות, אי מסירת פרטים שנדרשו מראש, התעלמות מפניות הצוות, מתן הנחיות סותרות, הרמת קול או התנהלות שאינה מאפשרת עבודה תקינה ושיתוף פעולה, לא יהיה בכך כדי לגרוע מחובת התשלום בהתאם להזמנה ולתנאי ההתקשרות.",
      "במקרה של חוסר שיתוף פעולה או התנהלות שאינה הולמת כלפי צוות Invistimo, נותן השירות יהיה רשאי להפסיק את השירות או להורות לצוות לעזוב את המקום. הפסקת השירות בנסיבות שנגרמו עקב הלקוח או מי מטעמו לא תבטל ולא תפחית את חובת התשלום עבור השירות שהוזמן, בכפוף לדין.",
      "יתרה שלא שולמה במועד תיחשב לחוב בפיגור. Invistimo תהיה רשאית להעביר חוב שלא הוסדר להליכי גבייה ולטיפול משפטי ולדרוש, ככל שהדין מאפשר, ריבית, הצמדה, הוצאות גבייה סבירות והוצאות משפטיות שנגרמו לצורך גביית החוב.",
    ],
  },
];

export const CUSTOMER_CANCELLATION_TERMS: DetailSection[] = [
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

  const { paymentTerms, cancellationTerms, additionalTerms, upsells, ...rest } =
    summary;

  return {
    ...rest,
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
