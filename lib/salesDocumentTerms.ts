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

  const { paymentTerms, cancellationTerms, upsells, ...rest } = summary;

  return {
    ...rest,
    paymentTerms: sanitizePaymentTermsForCustomer(
      paymentTerms as DetailSection[] | undefined,
    ),
    cancellationTerms: sanitizeDetailSectionsForCustomer(
      cancellationTerms as DetailSection[] | undefined,
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
