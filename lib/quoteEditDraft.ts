export type QuoteEditPriceDraft = {
  packagePrice: string;
  discountAmount: string;
  upsellPrices: string[];
};

type QuotePriceSource = {
  selectedPackage?: { price?: number | null } | null;
  upsells?: Array<{ price?: number | null }> | null;
  totals?: {
    discountAmount?: number | null;
    fullPaymentDiscount?: number | null;
    grossAmount?: number | null;
    grossAmountBeforeDiscount?: number | null;
    grossAmountAfterDiscount?: number | null;
    vatRate?: number | null;
    paymentMode?: string | null;
  } | null;
};

export function asEditNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundEditMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function storedQuoteDiscount(
  totals?: {
    discountAmount?: number | null;
    fullPaymentDiscount?: number | null;
  } | null,
) {
  return (
    asEditNumber(totals?.discountAmount) ||
    asEditNumber(totals?.fullPaymentDiscount)
  );
}

export function quotePricesDiffer(
  draft: QuoteEditPriceDraft,
  source: QuotePriceSource,
) {
  if (
    roundEditMoney(asEditNumber(draft.packagePrice)) !==
    roundEditMoney(asEditNumber(source.selectedPackage?.price))
  ) {
    return true;
  }

  if (
    roundEditMoney(asEditNumber(draft.discountAmount)) !==
    roundEditMoney(storedQuoteDiscount(source.totals))
  ) {
    return true;
  }

  const upsells = source.upsells || [];
  if (draft.upsellPrices.length !== upsells.length) return true;

  return draft.upsellPrices.some(
    (price, index) =>
      roundEditMoney(asEditNumber(price)) !==
      roundEditMoney(asEditNumber(upsells[index]?.price)),
  );
}

export function buildEditedQuoteTotals(input: {
  packagePrice: number;
  upsellPrices: number[];
  discountAmount: number;
  paymentMode: string;
  previousGross: number;
  previousBefore: number;
  vatRate: number;
  fullPaymentDiscount: number;
  paymentSchedule: Record<string, unknown>;
}) {
  const grossBefore = roundEditMoney(
    input.packagePrice +
      input.upsellPrices.reduce((sum, price) => sum + asEditNumber(price), 0),
  );
  const discount = roundEditMoney(
    Math.min(grossBefore, Math.max(0, input.discountAmount)),
  );
  const grossAfter = roundEditMoney(Math.max(0, grossBefore - discount));
  const schedule: Record<string, unknown> = { ...input.paymentSchedule };
  const beforeRatio =
    input.previousBefore > 0 ? grossBefore / input.previousBefore : 1;
  const scale = (value: unknown) =>
    roundEditMoney(asEditNumber(value) * beforeRatio);

  schedule.preEventServicesTotal = scale(schedule.preEventServicesTotal);
  schedule.eventServicesTotal = scale(schedule.eventServicesTotal);

  if (input.paymentMode === "full") {
    schedule.immediateTotal = grossAfter;
    schedule.eventDayTotal = 0;
    schedule.stripeAmount = grossAfter;
    schedule.eventServicesDeposit = schedule.eventServicesTotal;
    schedule.eventServicesBalance = 0;
    schedule.fullPaymentDiscount = discount;
  } else {
    const previousGross =
      input.previousGross > 0 ? input.previousGross : grossAfter;
    const immediate = asEditNumber(schedule.immediateTotal);
    const nextImmediate = roundEditMoney(
      Math.min(grossAfter, Math.max(0, (grossAfter * immediate) / previousGross)),
    );
    schedule.immediateTotal = nextImmediate;
    schedule.stripeAmount = nextImmediate;
    schedule.eventDayTotal = roundEditMoney(
      Math.max(0, grossAfter - nextImmediate),
    );
    const deposit = roundEditMoney(
      Math.max(0, nextImmediate - asEditNumber(schedule.preEventServicesTotal)),
    );
    schedule.eventServicesDeposit = deposit;
    schedule.eventServicesBalance = roundEditMoney(
      Math.max(0, asEditNumber(schedule.eventServicesTotal) - deposit),
    );
    schedule.fullPaymentDiscount = roundEditMoney(input.fullPaymentDiscount);
  }

  schedule.discountAmount = discount;
  schedule.grossAmountBeforeDiscount = grossBefore;
  schedule.grossAmountAfterDiscount = grossAfter;

  const vatRate = input.vatRate > 0 ? input.vatRate : 0.18;

  return {
    grossBefore,
    grossAfter,
    discount,
    fullPaymentDiscount:
      input.paymentMode === "full"
        ? discount
        : roundEditMoney(input.fullPaymentDiscount),
    stripeAmount: asEditNumber(schedule.stripeAmount),
    netAmount: roundEditMoney(grossAfter / (1 + vatRate)),
    paymentSchedule: schedule,
  };
}
