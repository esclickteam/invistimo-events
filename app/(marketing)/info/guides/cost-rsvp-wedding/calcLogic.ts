/** Pure planning math for the billable-records illustration calculator. */

export type RecordsCalcInputs = {
  withPhoneRecords: number;
  withoutPhoneRecords: number;
  peopleWithPhone: number;
  peopleWithoutPhone: number;
};

export type RecordsCalcResult = {
  totalRecords: number;
  billableRecords: number;
  nonBillableRecords: number;
  totalPeople: number;
  warnings: string[];
  assumptions: string[];
};

function clampNonNeg(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * Illustrates package quota counting:
 * billable = records with phone digits; people counts are independent.
 */
export function computeRecordsQuota(raw: RecordsCalcInputs): RecordsCalcResult {
  const withPhoneRecords = clampNonNeg(raw.withPhoneRecords);
  const withoutPhoneRecords = clampNonNeg(raw.withoutPhoneRecords);
  const peopleWithPhone = clampNonNeg(raw.peopleWithPhone);
  const peopleWithoutPhone = clampNonNeg(raw.peopleWithoutPhone);

  const warnings: string[] = [];

  if (withPhoneRecords > 0 && peopleWithPhone < withPhoneRecords) {
    warnings.push(
      "מספר האנשים ברשומות עם טלפון נמוך ממספר הרשומות — בדקו שהזנתם נכון (כל רשומה כוללת לפחות אדם אחד)."
    );
  }
  if (withoutPhoneRecords > 0 && peopleWithoutPhone < withoutPhoneRecords) {
    warnings.push(
      "מספר האנשים ברשומות בלי טלפון נמוך ממספר הרשומות — בדקו שהזנתם נכון."
    );
  }

  const totalRecords = withPhoneRecords + withoutPhoneRecords;
  const billableRecords = withPhoneRecords;
  const nonBillableRecords = withoutPhoneRecords;
  const totalPeople = peopleWithPhone + peopleWithoutPhone;

  const assumptions = [
    "רשומה עם מספר טלפון נגרעת ממכסת החבילה.",
    "רשומה ללא מספר טלפון נשארת ברשימה ואינה נגרעת מהמכסה.",
    "מספר האנשים אינו הופך אוטומטית למספר רשומות.",
    "המחשבון ממחיש ספירה בלבד ואינו מחשב מחיר כספי.",
  ];

  return {
    totalRecords,
    billableRecords,
    nonBillableRecords,
    totalPeople,
    warnings,
    assumptions,
  };
}
