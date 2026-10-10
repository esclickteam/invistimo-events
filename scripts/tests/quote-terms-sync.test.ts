import test from "node:test";
import assert from "node:assert/strict";

import {
  QUOTE_TERMS_VERSION,
  buildQuoteTermsUpdate,
  withCurrentQuoteTerms,
} from "../../lib/quoteCustomerTerms";
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

test("a current quote, a valid quote, and an expired quote show the updated terms and approval section", () => {
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
            { title: "שירות הושבה באולם", items: ["תיאור שירות מקורי שנשמר."] },
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

    const engagementTitles = titles(visible?.engagementTerms);
    assert.equal(engagementTitles.includes("תנאי התקשרות"), true);
    assert.equal(
      engagementTitles.includes("אישור הצעת המחיר, תנאי ההתקשרות ותקנון האתר"),
      true,
    );
    assert.equal(
      itemsOf(visible?.engagementTerms, "תנאי התקשרות").includes(
        "נוסח ישן וקצר של תנאי ההתקשרות.",
      ),
      false,
    );
    assert.equal(
      itemsOf(
        visible?.engagementTerms,
        "אישור הצעת המחיר, תנאי ההתקשרות ותקנון האתר",
      ).some((item) => item.includes("הגדרת הסיסמה")),
      true,
    );
    assert.equal(
      itemsOf(visible?.paymentTerms, "רשומות נוספות")[0],
      "כל רשומה נוספת תחויב לפי ₪12.00 לרשומה.",
    );
    assert.equal(itemsOf(visible?.paymentTerms, "תנאי תשלום").includes("נוסח תשלום ישן."), false);

    const seating = updated.upsells[0].customerDetails as Array<{ title: string; items: string[] }>;
    const seatingText = JSON.stringify(seating);
    assert.equal(seating[0].items[0], "תיאור שירות מקורי שנשמר.");
    assert.equal(seatingText.includes("60 דקות"), false);
    assert.equal(seatingText.includes("דחייה קצרה מ"), false);
    assert.equal(seatingText.includes("נמסרה והוסכמה מראש"), false);
    assert.equal(seatingText.includes("כאשר נקבע בהזמנה כי יתרת התשלום"), false);
    assert.equal(seatingText.includes("30 דקות או יותר"), true);
    assert.equal(seatingText.includes("נדחתה ב־15 דקות"), false);
    assert.equal(seatingText.includes("שיקול דעתה הבלעדי"), true);
    assert.equal(
      seating.some((section) => section.title === "שינויים ועיכובים בלוחות הזמנים ובשעת החופה"),
      true,
    );
    const chuppah = seating.find(
      (section) => section.title === "שינויים ועיכובים בלוחות הזמנים ובשעת החופה",
    );
    assert.equal(JSON.stringify(chuppah).includes("אינו גורר חיוב אוטומטי"), true);
    assert.equal(JSON.stringify(chuppah).includes("15 דקות ומעלה"), true);
    assert.equal(JSON.stringify(chuppah).includes("30 דקות או יותר"), true);
    assert.equal(JSON.stringify(chuppah).includes("אין לגבות פעמיים תוספת של 500 ₪"), true);
    assert.equal(
      seating.some((section) => section.title === "תשלום יתרת שירות ההושבה"),
      true,
    );
    assert.equal(
      seating.some((section) =>
        section.items.some((item) =>
          item.includes("מיד עם סיום עבודת צוות Invistimo"),
        ),
      ),
      true,
    );
    assert.equal(
      seating.some((section) => section.title === "מסירת אנשי קשר עד 24 שעות לפני האירוע"),
      true,
    );
    assert.equal(
      seating.some((section) => section.title === "איש קשר המורשה לחתום על רזרבות"),
      true,
    );
    assert.equal(
      seating.some((section) =>
        section.items.some((item) => item.includes("לא ייגבה חיוב כפול")),
      ),
      true,
    );
    assert.equal(
      itemsOf(visible?.engagementTerms, "דיווח על תקלות, בעיות וטענות").length > 0,
      true,
    );
    assert.equal(
      itemsOf(visible?.engagementTerms, "תנאי התקשרות").some((item) =>
        item.includes("חל איסור על אלימות פיזית"),
      ),
      true,
    );
    assert.equal(
      itemsOf(visible?.additionalTerms, "תנאים נוספים").some((item) =>
        item.includes("תמונת ההזמנה"),
      ),
      true,
    );
    assert.equal(
      itemsOf(visible?.additionalTerms, "תנאים נוספים").some((item) =>
        item.includes("אינה מחויבת ליזום תזמון"),
      ),
      true,
    );
    assert.equal(
      seating.some((section) => section.title === "הארכת שעות השירות"),
      true,
    );
    assert.equal(
      seating.some((section) =>
        section.items.some((item) =>
          item.includes(
            "בהיעדר קביעה מפורשת אחרת בהצעת המחיר או בהסכמה בכתב בין הצדדים, שעת תחילת שירות ההושבה באולם תהיה שעת תחילת קבלת הפנים של האירוע.",
          ),
        ),
      ),
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
  const engagement = JSON.stringify(updated.engagementTerms);
  assert.equal(text.includes("בהיעדר קביעה מפורשת אחרת"), false);
  assert.equal(text.includes("500 ₪"), false);
  assert.equal(text.includes("דחייה בתחילת שירות ההושבה"), false);
  assert.equal(engagement.includes("דיווח על תקלות, בעיות וטענות"), true);
  assert.equal(engagement.includes("אישור הצעת המחיר, תנאי ההתקשרות ותקנון האתר"), true);
  assert.deepEqual(updated.seatingSchedule, original.seatingSchedule);
  assert.equal(updated.quote.expiresAt, "2025-12-01");
  assert.equal(updated.status, "paid");
  assert.equal(updated.upsells[0].price, 100);
});

test("an older venue-seating title still receives the current seating terms", () => {
  const updated = withCurrentQuoteTerms({
    type: "quote",
    upsells: [
      {
        key: "legacy",
        title: "הושבה באולם",
        price: 2100,
        customerDetails: [{ title: "שירות הושבה באולם", items: ["הצוות מגיע כחצי שעה לפני האירוע."] }],
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
    true,
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
  assert.equal(visibleText.includes("30 דקות או יותר"), true);
  assert.equal(visibleText.includes("נדחתה ב־15 דקות"), false);
  assert.equal(visibleText.includes("15 דקות ומעלה בשעת תחילת החופה"), true);
  assert.equal(visibleText.includes("מיד עם סיום עבודת צוות Invistimo"), true);

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
