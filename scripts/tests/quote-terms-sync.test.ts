import test from "node:test";
import assert from "node:assert/strict";

import {
  ACCOUNT_USAGE_AND_DELETION_SECTION,
  QUOTE_TERMS_VERSION,
  VENUE_SEATING_QUOTE_TERM_SECTIONS,
  agreementAccountDeletionTermsForDisplay,
  agreementSeatingLegalTermsForDisplay,
  buildAgreementDocumentTerms,
  buildAgreementTermsUpdate,
  buildQuoteTermsUpdate,
  ensureVenueSeatingServiceDetails,
  needsAgreementTermsRepair,
  splitAgreementAdditionalTerms,
  withCurrentQuoteTerms,
  withRepairedAgreementTerms,
} from "../../lib/quoteCustomerTerms";
import { VENUE_SEATING_SERVICE_CUSTOMER_DETAILS } from "../../lib/venueSeatingServiceDetails";
import { sanitizeSalesDocumentForCustomer } from "../../lib/salesDocumentTerms";
import {
  QUOTE_PAYMENT_CONFIRMED_LABEL,
  quoteCustomerStatusLabel,
  quoteShowsExpiredNotice,
} from "../../lib/quotePaymentStatus";

const oldEngagement = [
  {
    title: "תנאי התקשרות",
    items: ["נוסח ישן וקצר של תנאי ההתקשרות."],
  },
];

function titles(value: unknown) {
  return Array.isArray(value)
    ? value.map((section) => String((section as { title?: string }).title || ""))
    : [];
}

function itemsOf(value: unknown, title: string) {
  const section = (Array.isArray(value) ? value : []).find(
    (item) => (item as { title?: string }).title === title,
  ) as { items?: string[] } | undefined;
  return section?.items || [];
}

test("a current quote, a valid quote, and an expired quote stay commercial-only without legal terms", () => {
  const cases = [
    {
      name: "new",
      status: "draft",
      expiresAt: "2026-10-13",
    },
    {
      name: "valid",
      status: "sent",
      expiresAt: "2026-10-20",
    },
    {
      name: "expired",
      status: "expired",
      expiresAt: "2026-01-01",
    },
  ];

  for (const sample of cases) {
    const original = {
      type: "quote",
      token: `quote-${sample.name}`,
      status: sample.status,
      quote: { createdAt: "2026-01-01", expiresAt: sample.expiresAt, validityDays: 4 },
      totals: { grossAmount: 1800, stripeAmount: 900 },
      selectedPackage: { key: "smart", title: "מזמינים חכם", price: 1200 },
      client: { fullName: "נועה לוי" },
      engagementTerms: oldEngagement,
      paymentTerms: [
        { title: "תנאי תשלום", items: ["נוסח תשלום ישן."] },
        {
          title: "רשומות נוספות",
          items: ["כל רשומה נוספת תחויב לפי ₪12.00 לרשומה."],
        },
      ],
      cancellationTerms: [{ title: "תנאי ביטול", items: ["נוסח ביטול ישן."] }],
      additionalTerms: [{ title: "תנאים נוספים", items: ["נוסח נוסף ישן."] }],
      upsells: [
        {
          key: "venueSeating",
          price: 1600,
          customerDetails: [
            {
              title: "שירות הושבה באולם",
              items: [
                "תיאור שירות מקורי שנשמר.",
                "שירות ההושבה נמשך עד המנה הראשונה. במקרים בהם המנה הראשונה מוגשת לפני החופה — עד 4 שעות או עד שחרורם מהאירוע, לפי המוקדם מביניהם.",
                "השירות נמשך עד 4 שעות.",
              ],
            },
            ...VENUE_SEATING_QUOTE_TERM_SECTIONS,
          ],
        },
        {
          key: "digitalSeating",
          price: 100,
          customerDetails: [{ title: "הושבה דיגיטלית באתר", items: ["מערכת באתר בלבד."] }],
        },
      ],
    };

    const updated = withCurrentQuoteTerms(original);
    const visible = sanitizeSalesDocumentForCustomer(updated);

    assert.equal(updated.status, sample.status);
    assert.equal(updated.quote.expiresAt, sample.expiresAt);
    assert.equal(updated.quote.validityDays, 4);
    assert.equal(updated.token, original.token);
    assert.equal(updated.totals.grossAmount, 1800);
    assert.equal(updated.selectedPackage.price, 1200);
    assert.equal(updated.client.fullName, "נועה לוי");
    assert.equal(updated.upsells[0].price, 1600);
    assert.equal(updated.upsells[1].price, 100);

    assert.deepEqual(updated.engagementTerms, []);
    assert.deepEqual(updated.cancellationTerms, []);
    assert.deepEqual(updated.additionalTerms, []);
    assert.equal(titles(visible?.engagementTerms).includes("תנאי התקשרות"), false);
    assert.equal(
      titles(visible?.engagementTerms).includes(
        "אישור הצעת המחיר, תנאי ההתקשרות ותקנון האתר",
      ),
      false,
    );
    assert.equal(
      itemsOf(visible?.paymentTerms, "רשומות נוספות")[0],
      "כל רשומה נוספת תחויב לפי ₪12.00 לרשומה.",
    );
    assert.equal(itemsOf(visible?.paymentTerms, "תנאי תשלום").length, 0);

    const seating = updated.upsells[0].customerDetails as Array<{ title: string; items: string[] }>;
    const seatingText = JSON.stringify(seating);
    assert.equal(seating[0].items[0], "תיאור שירות מקורי שנשמר.");
    assert.equal(seatingText.includes("60 דקות"), false);
    assert.equal(seatingText.includes("דחייה קצרה מ"), false);
    assert.equal(seatingText.includes("30 דקות או יותר"), false);
    assert.equal(seatingText.includes("שיקול דעתה הבלעדי"), false);
    assert.equal(
      seating.some((section) => section.title === "שינויים ועיכובים בלוחות הזמנים ובשעת החופה"),
      false,
    );
    assert.equal(
      seating.some((section) => section.title === "אחריות למפת ההושבה"),
      false,
    );
    assert.equal(
      seating.some((section) => section.title === "תשלום יתרת שירות ההושבה"),
      false,
    );
    assert.equal(
      seating.some((section) => section.title === "מסירת אנשי קשר עד 24 שעות לפני האירוע"),
      false,
    );
    assert.equal(
      seating.some((section) => section.title === "הארכת שעות השירות"),
      false,
    );
    assert.equal(seating[0].items[1].includes("עד 3 שעות"), true);
    assert.equal(seating[0].items[1].includes("עד 4 שעות"), false);
    assert.equal(
      seating[0].items[1].split("המנה הראשונה מוגשת לפני החופה").length - 1,
      1,
    );
    assert.equal(seating[0].items[2].includes("ההושבה היא עד המנה הראשונה"), true);
    assert.equal(
      seating[0].items[2].includes("למקרים חריגים, אם המנה הראשונה מוגשת לפני החופה"),
      true,
    );
    assert.deepEqual(updated.upsells[1].customerDetails, original.upsells[1].customerDetails);
    assert.equal(updated.seatingSchedule, original.seatingSchedule);
  }
});

test("a quote without venue seating does not receive seating terms, and saved hours stay unchanged", () => {
  const original = {
    type: "quote",
    status: "paid",
    token: "quote-no-seating",
    quote: { expiresAt: "2025-12-01", validityDays: 4 },
    totals: { grossAmount: 1200 },
    seatingSchedule: {
      receptionStartTime: "18:30",
      plannedChuppahTime: "20:00",
    },
    engagementTerms: oldEngagement,
    upsells: [
      {
        key: "digitalSeating",
        title: "הושבה דיגיטלית באתר",
        price: 100,
        customerDetails: [{ title: "הושבה דיגיטלית באתר", items: ["מערכת באתר בלבד."] }],
      },
    ],
  };

  const updated = withCurrentQuoteTerms(original);
  const text = JSON.stringify(updated.upsells);
  assert.equal(text.includes("בהיעדר קביעה מפורשת אחרת"), false);
  assert.equal(text.includes("500 ₪"), false);
  assert.equal(text.includes("דחייה בתחילת שירות ההושבה"), false);
  assert.deepEqual(updated.engagementTerms, []);
  assert.deepEqual(updated.seatingSchedule, original.seatingSchedule);
  assert.equal(updated.quote.expiresAt, "2025-12-01");
  assert.equal(updated.status, "paid");
  assert.equal(updated.upsells[0].price, 100);
});

test("an older venue-seating title keeps service wording and strips legal seating clauses on quotes", () => {
  const updated = withCurrentQuoteTerms({
    type: "quote",
    upsells: [
      {
        key: "legacy",
        title: "הושבה באולם",
        price: 2100,
        customerDetails: [
          { title: "שירות הושבה באולם", items: ["הצוות מגיע כחצי שעה לפני האירוע."] },
          ...VENUE_SEATING_QUOTE_TERM_SECTIONS,
        ],
      },
    ],
  });

  const seating = updated.upsells[0].customerDetails as Array<{ title: string; items: string[] }>;
  assert.equal(seating[0].items[0], "הצוות מגיע כחצי שעה לפני האירוע.");
  assert.equal(updated.upsells[0].price, 2100);
  assert.equal(
    seating.some((section) =>
      section.items.some((item) => item.startsWith("בהיעדר קביעה מפורשת אחרת")),
    ),
    false,
  );
  assert.equal(
    seating.some((section) => section.title === "אחריות למפת ההושבה"),
    false,
  );
});

test("an agreement keeps its stored terms", () => {
  const agreement = {
    type: "agreement",
    status: "signed",
    quote: { expiresAt: "2026-02-01" },
    engagementTerms: oldEngagement,
    totals: { grossAmount: 500 },
  };

  const updated = withCurrentQuoteTerms(agreement);
  assert.equal(updated, agreement);
  assert.equal(updated.quote.expiresAt, "2026-02-01");
  assert.equal(updated.totals.grossAmount, 500);
});

test("agreement terms include seating legal clauses and account deletion when venue seating is purchased", () => {
  const terms = buildAgreementDocumentTerms({
    upsells: [{ key: "venueSeating", title: "הושבה באולם" }],
    paymentTerms: [{ title: "רשומות נוספות", items: ["12 ₪ לרשומה."] }],
  });

  assert.equal(
    terms.engagementTerms.some((section) => section.title === "תנאי התקשרות"),
    true,
  );
  assert.equal(
    terms.engagementTerms.some((section) => section.title === "דיווח על תקלות, בעיות וטענות"),
    true,
  );
  assert.equal(
    terms.cancellationTerms.some((section) => section.title === "תנאי ביטול"),
    true,
  );
  assert.equal(
    terms.additionalTerms.some(
      (section) => section.title === ACCOUNT_USAGE_AND_DELETION_SECTION.title,
    ),
    true,
  );
  assert.equal(
    terms.additionalTerms.some((section) => section.title === "אחריות למפת ההושבה"),
    true,
  );
  assert.equal(
    terms.additionalTerms.some((section) => section.title === "הארכת שעות השירות"),
    true,
  );
  assert.equal(
    itemsOf(terms.additionalTerms, ACCOUNT_USAGE_AND_DELETION_SECTION.title).some((item) =>
      item.includes("7 ימים קלנדריים"),
    ),
    true,
  );
  assert.equal(
    itemsOf(terms.paymentTerms, "רשומות נוספות")[0],
    "12 ₪ לרשומה.",
  );
});

test("agreement terms omit seating legal clauses without venue seating but still include account deletion", () => {
  const terms = buildAgreementDocumentTerms({
    upsells: [{ key: "digitalSeating" }],
  });

  assert.equal(
    terms.additionalTerms.some((section) => section.title === "אחריות למפת ההושבה"),
    false,
  );
  assert.equal(
    terms.additionalTerms.some(
      (section) => section.title === ACCOUNT_USAGE_AND_DELETION_SECTION.title,
    ),
    true,
  );
});

test("an unsigned agreement that lost legal terms is repaired with seating clauses and account deletion", () => {
  const broken = {
    type: "agreement",
    status: "sent",
    engagementTerms: [],
    paymentTerms: [],
    cancellationTerms: [],
    additionalTerms: [],
    upsells: [
      {
        key: "venueSeating",
        title: "הושבה באולם",
        customerDetails: [{ title: "שירות הושבה באולם", items: ["תיאור שירות."] }],
      },
    ],
  };

  assert.equal(needsAgreementTermsRepair(broken), true);
  const repaired = withRepairedAgreementTerms(broken);
  assert.equal(
    repaired.additionalTerms.some(
      (section: { title: string }) =>
        section.title === ACCOUNT_USAGE_AND_DELETION_SECTION.title,
    ),
    true,
  );
  assert.equal(
    repaired.additionalTerms.some(
      (section: { title: string }) => section.title === "אחריות למפת ההושבה",
    ),
    true,
  );
  assert.equal(
    repaired.additionalTerms.some(
      (section: { title: string }) => section.title === "הארכת שעות השירות",
    ),
    true,
  );
  assert.equal(
    repaired.engagementTerms.some(
      (section: { title: string }) => section.title === "תנאי התקשרות",
    ),
    true,
  );
  assert.equal(
    JSON.stringify(repaired.upsells).includes("אחריות למפת ההושבה"),
    false,
  );

  const update = buildAgreementTermsUpdate(broken);
  assert.ok(update);
  assert.equal(
    (update?.additionalTerms as Array<{ title: string }>).some(
      (section) => section.title === ACCOUNT_USAGE_AND_DELETION_SECTION.title,
    ),
    true,
  );

  const signed = { ...broken, status: "signed" };
  assert.equal(needsAgreementTermsRepair(signed), false);
  // Display repair still fills missing legal terms for signed agreements;
  // persistence stays gated by needsAgreementTermsRepair / buildAgreementTermsUpdate.
  const signedRepaired = withRepairedAgreementTerms(signed);
  assert.equal(
    signedRepaired.additionalTerms.some(
      (section: { title: string }) =>
        section.title === ACCOUNT_USAGE_AND_DELETION_SECTION.title,
    ),
    true,
  );
  assert.equal(
    signedRepaired.additionalTerms.some(
      (section: { title: string }) => section.title === "אחריות למפת ההושבה",
    ),
    true,
  );
  assert.equal(buildAgreementTermsUpdate(signed), null);
});

test("agreement UI helpers expose seating legal and account deletion even when additionalTerms are empty", () => {
  const seating = agreementSeatingLegalTermsForDisplay({
    upsells: [{ key: "venueSeating" }],
    additionalTerms: [],
  });
  assert.equal(seating.some((section) => section.title === "אחריות למפת ההושבה"), true);
  assert.equal(
    agreementSeatingLegalTermsForDisplay({
      upsells: [{ key: "digitalSeating" }],
      additionalTerms: [],
    }).length,
    0,
  );

  const deletion = agreementAccountDeletionTermsForDisplay([]);
  assert.equal(deletion[0]?.title, ACCOUNT_USAGE_AND_DELETION_SECTION.title);

  const split = splitAgreementAdditionalTerms([
    { title: "תנאים נוספים", items: ["כללי."] },
    { title: "אחריות למפת ההושבה", items: ["משפטי."] },
    ACCOUNT_USAGE_AND_DELETION_SECTION,
  ]);
  assert.deepEqual(
    split.general.map((section) => section.title),
    ["תנאים נוספים"],
  );
  assert.equal(split.seatingLegal[0]?.title, "אחריות למפת ההושבה");
  assert.equal(split.accountDeletion[0]?.title, ACCOUNT_USAGE_AND_DELETION_SECTION.title);
});

test("venue seating service details are restored when customerDetails were emptied", () => {
  const restored = ensureVenueSeatingServiceDetails([
    { key: "venueSeating", title: "הושבה באולם", customerDetails: [] },
    { key: "digitalSeating", title: "הושבה דיגיטלית", customerDetails: [] },
  ]) as Array<{ key: string; customerDetails: Array<{ title: string }> }>;

  assert.equal(
    restored[0].customerDetails[0]?.title,
    VENUE_SEATING_SERVICE_CUSTOMER_DETAILS[0].title,
  );
  assert.deepEqual(restored[1].customerDetails, []);
});

test("empty commercial quote terms still rebuild a full agreement payload", () => {
  const terms = buildAgreementDocumentTerms({
    upsells: [{ key: "venueSeating" }],
    engagementTerms: [],
    cancellationTerms: [],
    additionalTerms: [],
    paymentTerms: [{ title: "רשומות נוספות", items: ["10 ₪"] }],
  });

  assert.equal(terms.engagementTerms.length > 0, true);
  assert.equal(terms.cancellationTerms.length > 0, true);
  assert.equal(
    terms.additionalTerms.some(
      (section) => section.title === ACCOUNT_USAGE_AND_DELETION_SECTION.title,
    ),
    true,
  );
  assert.equal(
    terms.additionalTerms.some((section) => section.title === "דחייה בתחילת שירות ההושבה"),
    true,
  );
});

test("stored legacy seating wording is replaced on the same quote and archived once", () => {
  const original = {
    type: "quote",
    token: "old-link",
    status: "expired",
    quote: { expiresAt: "2024-05-01", validityDays: 4 },
    totals: { grossAmount: 2500, stripeAmount: 800 },
    selectedPackage: { price: 1200 },
    client: { fullName: "דנה כהן" },
    seatingSchedule: { receptionStartTime: "19:00", plannedChuppahTime: "" },
    engagementTerms: oldEngagement,
    upsells: [
      {
        key: "venueSeating",
        title: "הושבה באולם",
        price: 1600,
        customerDetails: [
          { title: "שירות הושבה באולם", items: ["הצוות מגיע כחצי שעה לפני האירוע."] },
          {
            title: "תשלום בגין דחייה מהותית של תחילת ההושבה",
            items: [
              "כאשר צוות Invistimo התייצב במועד שסוכם, אך תחילת ההושבה נדחתה ב־60 דקות או יותר ביחס לשעה שנקבעה מראש, בשל נסיבות שאינן באחריות Invistimo, תחול תוספת תשלום בסך 500 ₪.",
              "דחייה קצרה מ־60 דקות לא תיצור חיוב מכוח הוראת דחייה זו בלבד.",
              "החיוב יחול רק כאשר שעת תחילת ההושבה המתוכננת נמסרה והוסכמה מראש וניתן לקבוע את משך הדחייה בפועל.",
            ],
          },
          {
            title: "חובת תשלום בסיום עבודת הצוות",
            items: [
              "כאשר נקבע בהזמנה כי יתרת התשלום תשולם ביום האירוע, הלקוח מתחייב להסדירה מיד עם סיום עבודתם של אנשי הצוות.",
            ],
          },
        ],
      },
    ],
  };

  const visible = withCurrentQuoteTerms(original);
  const visibleText = JSON.stringify(visible.upsells);
  assert.equal(visible.token, "old-link");
  assert.equal(visible.quote.expiresAt, "2024-05-01");
  assert.equal(visible.totals.grossAmount, 2500);
  assert.equal(visible.upsells[0].price, 1600);
  assert.equal(visible.seatingSchedule.plannedChuppahTime, "");
  assert.equal(visibleText.includes("60 דקות"), false);
  assert.equal(visibleText.includes("דחייה קצרה מ"), false);
  assert.equal(visibleText.includes("נמסרה והוסכמה מראש"), false);
  assert.equal(visibleText.includes("כאשר נקבע בהזמנה כי יתרת התשלום"), false);
  assert.equal(visibleText.includes("הצוות מגיע כחצי שעה לפני האירוע."), true);
  assert.equal(visibleText.includes("30 דקות או יותר"), false);
  assert.equal(visibleText.includes("מיד עם סיום עבודת צוות Invistimo"), false);
  assert.deepEqual(visible.engagementTerms, []);

  const first = buildQuoteTermsUpdate(original);
  assert.ok(first);
  assert.equal(first.quoteTermsVersion, QUOTE_TERMS_VERSION);
  assert.equal("quote" in first, false);
  assert.equal("totals" in first, false);
  assert.equal("client" in first, false);
  assert.equal("status" in first, false);
  assert.equal("token" in first, false);
  assert.equal("seatingSchedule" in first, false);
  const archive = first.customerTermsArchive as { upsells: Array<{ customerDetails: Array<{ items: string[] }> }> };
  assert.equal(JSON.stringify(archive.upsells).includes("60 דקות"), true);
  assert.equal(JSON.stringify(first.upsells).includes("60 דקות"), false);
  assert.equal(JSON.stringify(first.upsells).includes("אחריות למפת ההושבה"), false);

  const second = buildQuoteTermsUpdate({
    ...original,
    ...first,
    customerTermsArchive: archive,
    quoteTermsVersion: QUOTE_TERMS_VERSION,
  });
  assert.equal("customerTermsArchive" in (second || {}), false);

  const customerView = sanitizeSalesDocumentForCustomer({
    ...visible,
    customerTermsArchive: archive,
    quoteTermsVersion: QUOTE_TERMS_VERSION,
  });
  const customerText = JSON.stringify(customerView);
  assert.equal(customerText.includes("60 דקות"), false);
  assert.equal(customerText.includes("customerTermsArchive"), false);
  assert.equal(customerText.includes("quoteTermsVersion"), false);
});

test("an expired quote stays expired until an admin confirms payment, without showing a confirmation time", () => {
  assert.equal(quoteCustomerStatusLabel("expired", false), "פג תוקף");
  assert.equal(quoteShowsExpiredNotice({ status: "expired", expired: true }), true);
  assert.equal(
    quoteCustomerStatusLabel("expired", true),
    QUOTE_PAYMENT_CONFIRMED_LABEL,
  );
  assert.equal(
    quoteShowsExpiredNotice({ status: "expired", expired: true, paymentConfirmed: true }),
    false,
  );
  assert.equal(QUOTE_PAYMENT_CONFIRMED_LABEL.includes(":"), false);
  assert.equal(/\d{1,2}:\d{2}/.test(QUOTE_PAYMENT_CONFIRMED_LABEL), false);
});
