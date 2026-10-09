import test from "node:test";
import assert from "node:assert/strict";

import { withCurrentQuoteTerms } from "../../lib/quoteCustomerTerms";
import { sanitizeSalesDocumentForCustomer } from "../../lib/salesDocumentTerms";

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
    assert.equal(seating[0].items[0], "תיאור שירות מקורי שנשמר.");
    assert.equal(
      seating.some((section) => section.title === "הארכת שעות השירות"),
      true,
    );
    assert.deepEqual(updated.upsells[1].customerDetails, original.upsells[1].customerDetails);
  }
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
