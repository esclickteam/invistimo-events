import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEditedQuoteTotals,
  quotePricesDiffer,
  storedQuoteDiscount,
} from "../../lib/quoteEditDraft";

const source = {
  selectedPackage: { price: 4000 },
  upsells: [{ price: 1000 }, { price: 0 }],
  totals: {
    discountAmount: 0,
    fullPaymentDiscount: 250,
    grossAmountAfterDiscount: 4750,
    grossAmountBeforeDiscount: 5000,
  },
};

test("a name-only edit does not count as a price change", () => {
  assert.equal(
    quotePricesDiffer(
      {
        packagePrice: "4000",
        discountAmount: String(storedQuoteDiscount(source.totals)),
        upsellPrices: ["1000", "0"],
      },
      source,
    ),
    false,
  );
});

test("changing the package price counts as a price change", () => {
  assert.equal(
    quotePricesDiffer(
      {
        packagePrice: "4500",
        discountAmount: "250",
        upsellPrices: ["1000", "0"],
      },
      source,
    ),
    true,
  );
});

test("full payment moves the whole new total to pay-now", () => {
  const totals = buildEditedQuoteTotals({
    packagePrice: 4500,
    upsellPrices: [1000, 0],
    discountAmount: 250,
    paymentMode: "full",
    previousGross: 4750,
    previousBefore: 5000,
    vatRate: 0.18,
    fullPaymentDiscount: 250,
    paymentSchedule: {
      immediateTotal: 4750,
      eventDayTotal: 0,
      stripeAmount: 4750,
      preEventServicesTotal: 4000,
      eventServicesTotal: 1000,
    },
  });

  assert.equal(totals.grossAfter, 5250);
  assert.equal(totals.stripeAmount, 5250);
  assert.equal(totals.paymentSchedule.eventDayTotal, 0);
  assert.equal(totals.fullPaymentDiscount, 250);
});

test("split payment keeps the previous pay-now ratio", () => {
  const totals = buildEditedQuoteTotals({
    packagePrice: 8000,
    upsellPrices: [2000],
    discountAmount: 0,
    paymentMode: "split",
    previousGross: 5000,
    previousBefore: 5000,
    vatRate: 0.18,
    fullPaymentDiscount: 0,
    paymentSchedule: {
      immediateTotal: 3000,
      eventDayTotal: 2000,
      stripeAmount: 3000,
      preEventServicesTotal: 4000,
      eventServicesTotal: 1000,
    },
  });

  assert.equal(totals.grossAfter, 10000);
  assert.equal(totals.stripeAmount, 6000);
  assert.equal(totals.paymentSchedule.eventDayTotal, 4000);
});
