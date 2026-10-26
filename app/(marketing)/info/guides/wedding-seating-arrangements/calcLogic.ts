/** Pure planning math for the wedding seating capacity calculator. */

export type SeatingCalcInputs = {
  confirmedGuests: number;
  tablesCount: number;
  seatsPerTable: number;
  approvedReserves: number;
  noShowPct: number;
};

export type SeatingCalcResult = {
  confirmed: number;
  tables: number;
  seatsPerTable: number;
  regularSeats: number;
  approvedReserves: number;
  totalWithReserves: number;
  /** Positive = spare seats vs confirmed; negative = shortfall */
  gapVsConfirmed: number;
  shortfall: number;
  spare: number;
  expectedArrivals: number;
  fullArrival: number;
  /** Seats needed if every confirmer arrives (always = confirmed) */
  seatsNeededIfAllArrive: number;
  canSeatAllConfirmers: boolean;
  /** True when expected-arrival scenario "fits" but full arrival does not */
  noShowMasksShortfall: boolean;
  warnings: string[];
  assumptions: string[];
};

function clampNonNegInt(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * Capacity vs confirmed guests.
 * No-show % is a planning scenario only — never used to justify seating
 * beyond approved capacity (regular + approved reserves).
 */
export function computeSeatingCapacity(raw: SeatingCalcInputs): SeatingCalcResult {
  const confirmed = clampNonNegInt(raw.confirmedGuests);
  const tables = clampNonNegInt(raw.tablesCount);
  const seatsPerTable = clampNonNegInt(raw.seatsPerTable);
  const approvedReserves = clampNonNegInt(raw.approvedReserves);
  const noShowPct = clampPct(raw.noShowPct);

  const regularSeats = tables * seatsPerTable;
  const totalWithReserves = regularSeats + approvedReserves;
  const gapVsConfirmed = totalWithReserves - confirmed;
  const shortfall = gapVsConfirmed < 0 ? Math.abs(gapVsConfirmed) : 0;
  const spare = gapVsConfirmed > 0 ? gapVsConfirmed : 0;

  const expectedArrivals = Math.round(confirmed * (1 - noShowPct / 100));
  const fullArrival = confirmed;
  const seatsNeededIfAllArrive = confirmed;
  const canSeatAllConfirmers = totalWithReserves >= confirmed;

  const expectedFits = totalWithReserves >= expectedArrivals;
  const noShowMasksShortfall = !canSeatAllConfirmers && expectedFits && noShowPct > 0;

  const warnings: string[] = [];
  if (tables === 0 || seatsPerTable === 0) {
    warnings.push("יש להזין מספר שולחנות וקיבולת לכל שולחן כדי לחשב מקומות רגילים.");
  }
  if (shortfall > 0) {
    warnings.push(
      `חסרים ${shortfall} מקומות מול מספר מאשרי ההגעה — גם אם מעריכים אי־הגעה. אין להסתמך על אחוז משוער כדי לסגור את הפער.`
    );
  }
  if (noShowMasksShortfall) {
    warnings.push(
      "תרחיש אי־ההגעה נראה «מתאים», אבל אם כל המאשרים יגיעו לא יהיה מספיק מקום בקיבולת המאושרת."
    );
  }
  if (seatsPerTable > 12) {
    warnings.push(
      "קיבולת גבוהה מאוד לשולחן — ודאו מול האולם שהמספר מאושר לנוחות ולמרווח בין כיסאות."
    );
  }

  const assumptions = [
    `מקומות רגילים: ${tables} שולחנות × ${seatsPerTable} = ${regularSeats}.`,
    `מקומות כולל רזרבות מאושרות: ${regularSeats} + ${approvedReserves} = ${totalWithReserves}.`,
    `תרחיש אי־הגעה משוער: ${noShowPct}% → כ־${expectedArrivals} מגיעים מתוך ${confirmed} מאשרים.`,
    "אחוז אי־ההגעה הוא תרחיש תכנון בלבד — לא שיעור מוכח לכלל החתונות.",
    "אין להשתמש באחוז המשוער כדי להצדיק שיבוץ מעבר לקיבולת המאושרת (כולל רזרבות שאושרו).",
    "המחשבון אינו שומר פרטי אורחים ואינו מחליף הסכם מול האולם.",
  ];

  return {
    confirmed,
    tables,
    seatsPerTable,
    regularSeats,
    approvedReserves,
    totalWithReserves,
    gapVsConfirmed,
    shortfall,
    spare,
    expectedArrivals,
    fullArrival,
    seatsNeededIfAllArrive,
    canSeatAllConfirmers,
    noShowMasksShortfall,
    warnings,
    assumptions,
  };
}
