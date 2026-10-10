/**
 * Public package calculator.
 *
 * Messages keep the existing plan1 rate table (same brackets and
 * Math.round(records * rate) as the previous pricing page).
 * Call packages use the flat per-record prices defined for this page.
 * Add-ons keep their original names and prices. Digital seating is 100 ₪ on every package.
 */

import { calculateBase, getRate } from "@/lib/adminPackages";

export const RECORD_MIN = 0;
export const RECORD_MAX = 1000;
export const SEATING_ADDON_ILS = 100;

/** Same business number used by the contact page, footer, and support bot. */
export const INVISTIMO_WHATSAPP_PHONE = "972555039072";

export type PackageId = "messages" | "voice" | "personal" | "hybrid";
export type ServiceMode = "messages" | "calls";

const CALL_RATE_TENTHS: Record<Exclude<PackageId, "messages">, number> = {
  voice: 16,
  personal: 22,
  hybrid: 19,
};

export type PackageDefinition = {
  id: PackageId;
  name: string;
  hebrewName: string;
  badge: string;
  description: string;
  /** Short label in the on-page summary. */
  summaryService: string;
  /** Detailed service line sent to WhatsApp. */
  serviceLabel: string;
  group: ServiceMode;
  /** One short call line. Empty for the messages package. */
  callLine: string;
  features: string[];
};

/** Original shared lines from the previous pricing page. */
const ORIGINAL_SHARED_FEATURES = [
  "הזמנה דיגיטלית מלאה",
  "שליחה ב-2 סבבי WhatsApp אוטומטיים לאישור הגעה",
  "תזכורת ב-SMS לקראת האירוע + מספר שולחן",
  "הודעת תודה לאחר האירוע ב-SMS",
];

/** Original call-package line that is not a call-type description. */
const ORIGINAL_STATUS_FEATURE = "תיעוד ועדכון סטטוסים בזמן אמת";

export const PACKAGES: Record<PackageId, PackageDefinition> = {
  messages: {
    id: "messages",
    name: "Invistimo Messages",
    hebrewName: "הודעות בלבד",
    badge: "מתאים לאירוע פשוט",
    description: "הבסיס המושלם להזמנה דיגיטלית ואישורי הגעה",
    summaryService: "הודעות בלבד",
    serviceLabel: "הודעות בלבד",
    group: "messages",
    callLine: "",
    features: [...ORIGINAL_SHARED_FEATURES],
  },
  voice: {
    id: "voice",
    name: "Invistimo Voice",
    hebrewName: "שיחות מוקלטות",
    badge: "שיחות מוקלטות",
    description: "3 סבבי שיחות מוקלטות.",
    summaryService: "שיחות מוקלטות",
    serviceLabel: "3 סבבי שיחות מוקלטות",
    group: "calls",
    callLine: "3 סבבי שיחות מוקלטות.",
    features: [
      ...ORIGINAL_SHARED_FEATURES,
      "3 סבבי שיחות מוקלטות.",
      ORIGINAL_STATUS_FEATURE,
    ],
  },
  personal: {
    id: "personal",
    name: "Invistimo Personal",
    hebrewName: "שיחות אנושיות",
    badge: "הבחירה הפופולרית",
    description: "3 סבבי שיחות במוקד אנושי.",
    summaryService: "שיחות אנושיות",
    serviceLabel: "3 סבבי שיחות במוקד אנושי",
    group: "calls",
    callLine: "3 סבבי שיחות במוקד אנושי.",
    features: [
      ...ORIGINAL_SHARED_FEATURES,
      "3 סבבי שיחות במוקד אנושי.",
      ORIGINAL_STATUS_FEATURE,
    ],
  },
  hybrid: {
    id: "hybrid",
    name: "Invistimo Hybrid",
    hebrewName: "שיחות משולבות",
    badge: "שיחות משולבות",
    description: "2 סבבי שיחות מוקלטות + סבב אחד אנושי.",
    summaryService: "שיחות משולבות",
    serviceLabel: "2 סבבי שיחות מוקלטות + סבב אחד אנושי",
    group: "calls",
    callLine: "2 סבבי שיחות מוקלטות + סבב אחד אנושי.",
    features: [
      ...ORIGINAL_SHARED_FEATURES,
      "2 סבבי שיחות מוקלטות + סבב אחד אנושי.",
      ORIGINAL_STATUS_FEATURE,
    ],
  },
};

export const CALL_PACKAGES: PackageId[] = ["voice", "personal", "hybrid"];

export type AddonKey = "credit" | "seating" | "system" | "design";

export type SelectedAddons = Record<AddonKey, boolean>;

export const ADDON_ORDER: AddonKey[] = ["credit", "seating", "system", "design"];

/** Original addon names from the previous pricing page. */
export const ADDON_LABELS: Record<AddonKey, string> = {
  credit: "מתנות באשראי דרך ספק חיצוני",
  seating: "הושבה דיגיטלית",
  system: "מערכת עצמאית לניהול ומעקב אירוע",
  design: "עיצוב הזמנה בהתאמה אישית",
};

export const EMPTY_ADDONS: SelectedAddons = {
  credit: false,
  seating: false,
  system: false,
  design: false,
};

/**
 * Original addon prices.
 * Messages used plan1. Call packages used plan2.
 * Digital seating is 100 ₪ on every package.
 */
const ADDON_PRICES: Record<"messages" | "calls", Record<Exclude<AddonKey, "seating">, number>> = {
  messages: { credit: 150, system: 200, design: 200 },
  calls: { credit: 100, system: 150, design: 150 },
};

export function addonPrice(packageId: PackageId, key: AddonKey): number {
  if (key === "seating") return SEATING_ADDON_ILS;
  const table = packageId === "messages" ? ADDON_PRICES.messages : ADDON_PRICES.calls;
  return table[key];
}

export type AddonLine = {
  key: AddonKey;
  label: string;
  selected: boolean;
  price: number;
};

export type PackageQuote = {
  packageId: PackageId;
  packageName: string;
  hebrewName: string;
  summaryService: string;
  serviceLabel: string;
  records: number;
  rate: number;
  servicePrice: number;
  addons: AddonLine[];
  seating: boolean;
  seatingPrice: number;
  addonTotal: number;
  total: number;
  canOrder: boolean;
};

export function clampRecords(value: number): number {
  if (!Number.isFinite(value)) return RECORD_MIN;
  return Math.min(RECORD_MAX, Math.max(RECORD_MIN, Math.trunc(value)));
}

/**
 * Manual entry while the field is focused.
 * An empty draft does not commit a number, so the field is not forced back to 0 mid-edit.
 * Digits above the maximum are clamped. Anything that is not a digit is ignored.
 */
export function applyRecordDraft(raw: string): {
  text: string;
  records: number | null;
} {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return { text: "", records: null };

  const value = Number(digits);
  if (!Number.isFinite(value) || value > RECORD_MAX) {
    return { text: String(RECORD_MAX), records: RECORD_MAX };
  }

  return { text: digits, records: value };
}

export function commitRecordDraft(text: string): number {
  const parsed = applyRecordDraft(text);
  if (parsed.records === null) return RECORD_MIN;
  return parsed.records;
}

export function packageRate(packageId: PackageId, records: number): number {
  if (packageId === "messages") {
    return getRate("plan1", clampRecords(records));
  }

  return CALL_RATE_TENTHS[packageId] / 10;
}

export function servicePrice(packageId: PackageId, records: number): number {
  const safeRecords = clampRecords(records);

  if (packageId === "messages") {
    return calculateBase("plan1", safeRecords);
  }

  return Math.round((safeRecords * CALL_RATE_TENTHS[packageId]) / 10);
}

export function calculateQuote(input: {
  packageId: PackageId;
  records: number;
  addons: SelectedAddons;
}): PackageQuote {
  const records = clampRecords(input.records);
  const pkg = PACKAGES[input.packageId];
  const price = servicePrice(input.packageId, records);
  const addons = ADDON_ORDER.map((key) => {
    const selected = Boolean(input.addons[key]);
    const unit = addonPrice(pkg.id, key);
    return {
      key,
      label: ADDON_LABELS[key],
      selected,
      price: selected ? unit : 0,
    };
  });
  const addonTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
  const seating = addons.find((addon) => addon.key === "seating");

  return {
    packageId: pkg.id,
    packageName: pkg.name,
    hebrewName: pkg.hebrewName,
    summaryService: pkg.summaryService,
    serviceLabel: pkg.serviceLabel,
    records,
    rate: packageRate(pkg.id, records),
    servicePrice: price,
    addons,
    seating: Boolean(seating?.selected),
    seatingPrice: seating?.price ?? 0,
    addonTotal,
    total: price + addonTotal,
    canOrder: records > 0,
  };
}

export function formatIls(amount: number): string {
  return `${Math.round(amount)} ₪`;
}

export function formatRate(rate: number): string {
  const normalized = Math.round(rate * 100) / 100;
  return `${Number(normalized.toFixed(2))} ₪`;
}

export function buildWhatsappMessage(quote: PackageQuote): string {
  const lines = [
    "שלום, אני מעוניין/ת להזמין חבילה באינויסטימו.",
    "",
    `חבילה: ${quote.packageName}`,
    `כמות רשומות: ${quote.records}`,
    `סוג שירות: ${quote.serviceLabel}`,
  ];

  for (const addon of quote.addons) {
    lines.push(`${addon.label}: ${addon.selected ? "כן" : "לא"}`);
  }

  lines.push(`מחיר שירות: ${formatIls(quote.servicePrice)}`);

  for (const addon of quote.addons) {
    if (!addon.selected) continue;
    lines.push(
      addon.key === "seating"
        ? `תוספת הושבה: ${formatIls(addon.price)}`
        : `${addon.label}: ${formatIls(addon.price)}`
    );
  }

  lines.push(`סה"כ: ${formatIls(quote.total)}`, "", "אשמח לקבל פרטים ולהתקדם.");
  return lines.join("\n");
}

export function buildWhatsappUrl(quote: PackageQuote): string {
  const text = encodeURIComponent(buildWhatsappMessage(quote));
  return `https://wa.me/${INVISTIMO_WHATSAPP_PHONE}?text=${text}`;
}
