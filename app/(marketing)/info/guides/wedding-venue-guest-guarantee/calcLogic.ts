/** Pure planning math for the venue guest-guarantee calculator. */

export type GuaranteeInputs = {
  totalInvited: number;
  almostCertain: number;
  otherArrivalRatePct: number; // default 70
  confirmed: number;
  confirmedArrivalRatePct: number; // default 90
  pending: number;
  venueMinCommitment: number;
  reserveMeals: number;
  venueCapacity: number; // 0 = unknown
  mealPrice: number; // 0 = unknown
};

export type GuaranteeResult = {
  /** Guests counted as almost-certain (clamped) */
  certain: number;
  /** Remaining invited after certain (for 70% band) */
  othersForInitial: number;
  initialEstimate: number;
  /** Example negotiation floor: ~40% below total invited */
  negotiationExample: number;
  confirmed: number;
  confirmedExpected: number;
  pending: number;
  /** Updated planning figure: confirmed@90% + pending left as open band (mid shown) */
  updatedEstimateMid: number;
  updatedEstimateLow: number;
  updatedEstimateHigh: number;
  venueMin: number;
  withReserve: number;
  gapVenueVsInitial: number;
  gapVenueVsUpdated: number;
  unusedMealCostVsInitial: number | null;
  unusedMealCostVsUpdated: number | null;
  overCapacity: boolean;
  warnings: string[];
  assumptions: string[];
};

function clampNonNeg(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * Partition invited guests without double-counting:
 * certain → confirmed (excluding overlap) → pending → remainder.
 * User may enter overlapping intuition; we allocate in that priority order.
 */
export function computeGuarantee(raw: GuaranteeInputs): GuaranteeResult {
  const total = clampNonNeg(raw.totalInvited);
  const rate70 = clampPct(raw.otherArrivalRatePct) / 100;
  const rate90 = clampPct(raw.confirmedArrivalRatePct) / 100;
  const venueMin = clampNonNeg(raw.venueMinCommitment);
  const reserve = clampNonNeg(raw.reserveMeals);
  const capacity = clampNonNeg(raw.venueCapacity);
  const mealPrice = Number.isFinite(raw.mealPrice) && raw.mealPrice > 0 ? raw.mealPrice : 0;

  let remaining = total;
  const certain = Math.min(clampNonNeg(raw.almostCertain), remaining);
  remaining -= certain;

  const confirmed = Math.min(clampNonNeg(raw.confirmed), remaining);
  remaining -= confirmed;

  const pending = Math.min(clampNonNeg(raw.pending), remaining);
  remaining -= pending;

  const untouched = remaining; // invited not marked certain/confirmed/pending

  const warnings: string[] = [];
  const sumEntered =
    clampNonNeg(raw.almostCertain) + clampNonNeg(raw.confirmed) + clampNonNeg(raw.pending);
  if (sumEntered > total && total > 0) {
    warnings.push(
      "סכום האורחים הוודאיים, המאשרים והממתינים גדול ממספר המוזמנים — חישבנו בלי כפילויות לפי סדר עדיפות."
    );
  }

  // Initial estimate (before treating RSVP confirmed specially):
  // certain @ 100% + everyone else @ rate70 (includes confirmed/pending/untouched as "others" for pre-RSVP view)
  const othersForInitial = total - certain;
  const initialEstimate = Math.round(certain + othersForInitial * rate70);

  const negotiationExample = Math.round(total * 0.6); // ~40% below invited

  // Updated after RSVPs — apply 90% only to confirmed; do NOT re-apply 70% to them.
  // Pending are NOT treated as zero; show a range (0 … pending) with mid at 50% for planning illustration.
  const confirmedExpected = Math.round(confirmed * rate90);
  const pendingMid = Math.round(pending * 0.5);
  // Certain guests who weren't moved into confirmed still count at 100% if still "remaining certain"
  // After allocation, `certain` are those not in confirmed/pending buckets.
  const updatedEstimateLow = certain + confirmedExpected; // pending contribute 0 in low bound
  const updatedEstimateHigh = certain + confirmedExpected + pending; // all pending might come
  const updatedEstimateMid = certain + confirmedExpected + pendingMid;

  // Untouched invited (neither certain nor in RSVP fields): keep in initial only; for updated, note in assumptions
  if (untouched > 0) {
    warnings.push(
      `${untouched} מוזמנים עדיין לא סווגו כודאיים / מאשרים / ממתינים — הם משפיעים בעיקר על ההערכה הראשונית.`
    );
  }

  const withReserve = Math.max(venueMin, updatedEstimateMid) + reserve;
  const gapVenueVsInitial = venueMin - initialEstimate;
  const gapVenueVsUpdated = venueMin - updatedEstimateMid;

  const unusedMealCostVsInitial =
    mealPrice > 0 && gapVenueVsInitial > 0 ? Math.round(gapVenueVsInitial * mealPrice) : null;
  const unusedMealCostVsUpdated =
    mealPrice > 0 && gapVenueVsUpdated > 0 ? Math.round(gapVenueVsUpdated * mealPrice) : null;

  const planningPeak = Math.max(initialEstimate, updatedEstimateHigh, venueMin) + reserve;
  const overCapacity = capacity > 0 && planningPeak > capacity;
  if (overCapacity) {
    warnings.push("צפי התכנון או ההתחייבות עולים על קיבולת האולם שהוזנה.");
  }

  const assumptions = [
    `הערכת הגעה ראשונית: ${certain} אורחים ודאיים במלואם + ${othersForInitial} × ${Math.round(rate70 * 100)}%.`,
    `הערכת מאשרים: ${confirmed} × ${Math.round(rate90 * 100)}% (לא מוחל גם ${Math.round(rate70 * 100)}% על אותה קבוצה).`,
    `ממתינים לתשובה (${pending}) אינם נספרים כמי שלא יגיעו — מוצג טווח תכנון.`,
    `דוגמת פתיחה למשא ומתן: כ־60% ממספר המוזמנים (הפחתה של כ־40%) — לא המלצת התחייבות אוטומטית.`,
    "המחשבון מספק הערכת תכנון בלבד. ההתחייבות בפועל צריכה להתבסס על תנאי ההסכם, יכולת האולם ונתוני האירוע.",
  ];

  return {
    certain,
    othersForInitial,
    initialEstimate,
    negotiationExample,
    confirmed,
    confirmedExpected,
    pending,
    updatedEstimateMid,
    updatedEstimateLow,
    updatedEstimateHigh,
    venueMin,
    withReserve,
    gapVenueVsInitial,
    gapVenueVsUpdated,
    unusedMealCostVsInitial,
    unusedMealCostVsUpdated,
    overCapacity,
    warnings,
    assumptions,
  };
}
