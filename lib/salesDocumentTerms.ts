export type DetailSection = {
  title: string;
  items: string[];
};

const CUSTOMER_SPLIT_PAYMENT_TERM =
  "כאשר נבחר תשלום ראשוני ויתרה ביום האירוע, סכום התשלום הראשוני והיתרה ליום האירוע מוצגים בסיכום המחיר.";

const EMPLOYEE_ONLY_PAYMENT_TERM_PATTERNS = [
  /העובד יכול לערוך/,
  /ניתן לעריכה על ידי העובד/,
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

export function sanitizePaymentTermsForCustomer(
  sections: DetailSection[] | undefined | null,
): DetailSection[] {
  if (!sections?.length) {
    return [];
  }

  return sections.map((section) => ({
    ...section,
    items: section.items.flatMap((item) => {
      if (EMPLOYEE_ONLY_PAYMENT_TERM_PATTERNS.some((pattern) => pattern.test(item))) {
        return [CUSTOMER_SPLIT_PAYMENT_TERM];
      }

      return [item];
    }),
  }));
}
