import {
  ADDON_LABELS,
  ADDON_ORDER,
  addonPrice,
  servicePrice,
  type PackageId,
} from "@/lib/pricing/packageQuote";

type PriceTable = {
  caption: string;
  headers: string[];
  rows: string[][];
};

/** Record counts used by public comparison tables. Not an opening price. */
export const PRICE_EXAMPLE_RECORDS = [200, 350, 500] as const;

const PACKAGE_ROWS: { id: PackageId; label: string }[] = [
  { id: "messages", label: "הודעות" },
  { id: "voice", label: "שיחות מוקלטות" },
  { id: "hybrid", label: "שיחות משולבות" },
  { id: "personal", label: "שיחות אנושיות" },
];

export function shekel(amount: number): string {
  return `${amount.toLocaleString("he-IL")} ₪`;
}

export const PACKAGE_PRICE_EXAMPLES: PriceTable = {
  caption:
    "מחיר חבילת אישורי הגעה לפי רשומות, בלי תוספות. המחשבון הציבורי לא מציין אם הסכום כולל מע״מ.",
  headers: ["חבילה", "200 רשומות", "350 רשומות", "500 רשומות"],
  rows: PACKAGE_ROWS.map((pkg) => [
    pkg.label,
    ...PRICE_EXAMPLE_RECORDS.map((records) => shekel(servicePrice(pkg.id, records))),
  ]),
};

export const ADDON_PRICE_EXAMPLES: PriceTable = {
  caption: "תוספות שלא כלולות במחיר החבילה שבטבלה.",
  headers: ["תוספת", "חבילת הודעות", "חבילות שיחה"],
  rows: ADDON_ORDER.map((key) => [
    ADDON_LABELS[key],
    shekel(addonPrice("messages", key)),
    shekel(addonPrice("voice", key)),
  ]),
};

export function messagesPriceAnswer(): string {
  const at = (records: number) => shekel(servicePrice("messages", records));
  return `אין מחיר אחד לכל חתונה. חבילת ההודעות, בלי תוספות, היא ${at(200)} ל־200 רשומות, ${at(350)} ל־350, ו־${at(500)} ל־500. שיחות מוקלטות, משולבות ואנושיות מופיעות באותה טבלה. המחשבון לא מציין אם הסכום כולל מע״מ, והסכום למספר רשומות אחר נמצא במחשבון החבילות.`;
}
