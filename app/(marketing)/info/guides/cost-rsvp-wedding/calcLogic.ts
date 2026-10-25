/** Pure planning math for the billable-records illustration calculator. */

export type RecordsCalcInputs = {
  withPhoneRecords: number;
  withoutPhoneRecords: number;
  /** Optional total guests across the list; never used for quota. */
  totalGuests: number | null;
};

export type RecordsCalcResult = {
  totalRecords: number;
  billableRecords: number;
  nonBillableRecords: number;
  totalGuests: number | null;
  warnings: string[];
};

function clampNonNeg(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * Illustrates package quota counting:
 * billable = records with phone; guests total is display-only.
 */
export function computeRecordsQuota(raw: RecordsCalcInputs): RecordsCalcResult {
  const withPhoneRecords = clampNonNeg(raw.withPhoneRecords);
  const withoutPhoneRecords = clampNonNeg(raw.withoutPhoneRecords);
  const totalGuests =
    raw.totalGuests == null || !Number.isFinite(raw.totalGuests)
      ? null
      : clampNonNeg(raw.totalGuests);

  const totalRecords = withPhoneRecords + withoutPhoneRecords;
  const billableRecords = withPhoneRecords;
  const nonBillableRecords = withoutPhoneRecords;

  const warnings: string[] = [];
  if (totalGuests != null && totalRecords > 0 && totalGuests < totalRecords) {
    warnings.push(
      "מספר המוזמנים הכולל קטן מסך הרשומות ברשימה — בדקו שהזנתם נכון (כל רשומה כוללת לפחות מוזמן אחד)."
    );
  }

  return {
    totalRecords,
    billableRecords,
    nonBillableRecords,
    totalGuests,
    warnings,
  };
}
