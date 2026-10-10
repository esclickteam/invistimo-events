/**
 * Public package calculator.
 *
 * Messages keep the existing plan1 rate table (same brackets and
 * Math.round(records * rate) as the previous pricing page).
 * Call packages use the flat per-record prices defined for this page.
 * Digital seating is a one-time add-on, not a per-record price.
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

export type PackageRound = {
  title: string;
  detail: string;
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
  rounds: PackageRound[];
  features: string[];
};

const SHARED_EVENT_FEATURES = [
  "הזמנה דיגיטלית מלאה לפי הקובץ שאתם מעלים",
  "דף הזמנה עם פרטי האירוע וקישור אישי לאישור הגעה",
  "ניהול רשימת מוזמנים ורשומות לפי הכמות שנבחרה",
  "דשבורד למעקב אחר אישורי ההגעה",
  "2 סבבי הודעות אוטומטיים ב-WhatsApp או ב-SMS",
  "אפשרות לפצל כל סבב בין WhatsApp ל-SMS",
  "מעקב אחר פתיחת הקישור האישי",
  "עדכון סטטוס ההגעה לפי תשובת האורח",
  "תזכורת ב-SMS לקראת האירוע, כולל מספר שולחן אם הוגדר",
  "הודעת תודה ב-SMS לאחר האירוע",
];

export const PACKAGES: Record<PackageId, PackageDefinition> = {
  messages: {
    id: "messages",
    name: "Invistimo Messages",
    hebrewName: "הודעות בלבד",
    badge: "קל להזמין",
    description:
      "אישורי הגעה בהודעות: הזמנה דיגיטלית, שני סבבי WhatsApp או SMS, מעקב בדשבורד, תזכורת לקראת האירוע והודעת תודה.",
    summaryService: "הודעות בלבד",
    serviceLabel: "הודעות בלבד",
    group: "messages",
    rounds: [],
    features: [...SHARED_EVENT_FEATURES],
  },
  voice: {
    id: "voice",
    name: "Invistimo Voice",
    hebrewName: "שיחות מוקלטות",
    badge: "מענה אוטומטי",
    description:
      "מערכת אישורי הגעה אוטומטית באמצעות שיחות קוליות מוקלטות, המאפשרת לאורחים לאשר הגעה בקלות ובמהירות.",
    summaryService: "שיחות מוקלטות",
    serviceLabel: "3 סבבי שיחות מוקלטות",
    group: "calls",
    rounds: [
      {
        title: "סבב ראשון: שיחות מוקלטות",
        detail: "אורחים שעדיין לא השיבו להזמנה",
      },
      {
        title: "סבב שני: שיחות מוקלטות",
        detail: "מי שלא ענה בסבב המוקלט הראשון",
      },
      {
        title: "סבב שלישי: שיחות מוקלטות",
        detail: "מי שלא ענה בסבבים הקודמים, וגם מתלבטים",
      },
    ],
    features: [
      "שלושה סבבי שיחות קוליות מוקלטות",
      "האורח מאשר בלחיצת מקש: מגיע, לא מגיע או מתלבט",
      "עדכון סטטוס ההגעה במערכת לפי התשובה בשיחה",
      ...SHARED_EVENT_FEATURES,
    ],
  },
  personal: {
    id: "personal",
    name: "Invistimo Personal",
    hebrewName: "שיחות אנושיות",
    badge: "הבחירה הפופולרית",
    description:
      "שירות אישורי הגעה אישי באמצעות נציגים אנושיים, ליצירת קשר ישיר עם האורחים וקבלת תשובות מדויקות.",
    summaryService: "שיחות אנושיות",
    serviceLabel: "3 סבבי שיחות אנושיות",
    group: "calls",
    rounds: [
      {
        title: "סבב ראשון: שיחה אנושית",
        detail: "ממתינים שעדיין לא נתנו תשובה",
      },
      {
        title: "סבב שני: שיחה אנושית",
        detail: "לא ענו בסבב הראשון או ביקשו חזרה",
      },
      {
        title: "סבב שלישי: שיחה אנושית",
        detail: "לא ענו בשני הסבבים, ביקשו חזרה, או מתלבטים",
      },
    ],
    features: [
      "מוקד טלפוני עם נציגים אנושיים",
      "שלושה סבבי שיחה למי שטרם התקבלה ממנו תשובה סופית",
      "תיעוד השיחה, הערות ועדכון סטטוס בזמן אמת",
      ...SHARED_EVENT_FEATURES,
    ],
  },
  hybrid: {
    id: "hybrid",
    name: "Invistimo Hybrid",
    hebrewName: "שיחות משולבות",
    badge: "אוטומציה ושירות אישי",
    description:
      "השילוב בין אוטומציה לשירות אישי: שני סבבים של שיחות מוקלטות ולאחריהם סבב שיחות אנושיות להשלמת אישורי ההגעה.",
    summaryService: "שיחות משולבות",
    serviceLabel: "2 סבבי שיחות מוקלטות + סבב שיחות אנושיות",
    group: "calls",
    rounds: [
      {
        title: "סבב ראשון: שיחות מוקלטות",
        detail: "אורחים שעדיין לא השיבו להזמנה",
      },
      {
        title: "סבב שני: שיחות מוקלטות",
        detail: "מי שלא ענה בסבב המוקלט הראשון",
      },
      {
        title: "סבב שלישי: שיחות אנושיות",
        detail: "נציג משלים את אישורי ההגעה ומתעד את התשובה",
      },
    ],
    features: [
      "שני סבבים של שיחות מוקלטות, ואחריהם סבב אחד של שיחות אנושיות",
      "בשיחה המוקלטת האורח מאשר בלחיצת מקש",
      "בסבב האנושי הנציג מתעד את השיחה ומעדכן סטטוס",
      ...SHARED_EVENT_FEATURES,
    ],
  },
};

export const CALL_PACKAGES: PackageId[] = ["voice", "personal", "hybrid"];

export const SEATING_FEATURES = [
  "ניהול שולחנות ומספרי כיסאות",
  "שיוך אורחים לשולחנות",
  "צפייה בכמות המקומות הפנויים",
  "תרשים אולם לסידור ההושבה",
  "חיבור בין אישורי ההגעה לבין סידור השולחנות",
];

export type PackageQuote = {
  packageId: PackageId;
  packageName: string;
  hebrewName: string;
  summaryService: string;
  serviceLabel: string;
  records: number;
  rate: number;
  servicePrice: number;
  seating: boolean;
  seatingPrice: number;
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
  seating: boolean;
}): PackageQuote {
  const records = clampRecords(input.records);
  const pkg = PACKAGES[input.packageId];
  const price = servicePrice(input.packageId, records);
  const seatingPrice = input.seating ? SEATING_ADDON_ILS : 0;

  return {
    packageId: pkg.id,
    packageName: pkg.name,
    hebrewName: pkg.hebrewName,
    summaryService: pkg.summaryService,
    serviceLabel: pkg.serviceLabel,
    records,
    rate: packageRate(pkg.id, records),
    servicePrice: price,
    seating: input.seating,
    seatingPrice,
    total: price + seatingPrice,
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
    `הושבה דיגיטלית: ${quote.seating ? "כן" : "לא"}`,
    `מחיר שירות: ${formatIls(quote.servicePrice)}`,
  ];

  if (quote.seating) {
    lines.push(`תוספת הושבה: ${formatIls(quote.seatingPrice)}`);
  }

  lines.push(`סה"כ: ${formatIls(quote.total)}`, "", "אשמח לקבל פרטים ולהתקדם.");
  return lines.join("\n");
}

export function buildWhatsappUrl(quote: PackageQuote): string {
  const text = encodeURIComponent(buildWhatsappMessage(quote));
  return `https://wa.me/${INVISTIMO_WHATSAPP_PHONE}?text=${text}`;
}
