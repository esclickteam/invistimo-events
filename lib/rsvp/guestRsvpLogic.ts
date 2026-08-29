export const RSVP_VALUES = ["yes", "no", "pending"] as const;

export type RsvpValue = (typeof RSVP_VALUES)[number];

export const MENU_LABELS: Record<string, string> = {
  vegetarian: "צמחוני",
  vegan: "טבעוני",
  glutenFree: "ללא גלוטן",
  childrenMeal: "מנת ילדים",
  kosher: "כשר",
  kosherGlatt: "כשר גלאט",
  kosherMahfoud: "כשר מחפוד",
  transportation: "הסעות",
};

export type GiftOptions = {
  creditEnabled?: boolean;
  creditUrl?: string;
  payboxEnabled?: boolean;
  payboxUrl?: string;
};

export type PublicEventNote = {
  enabled: boolean;
  text: string;
};

export type MenuOption = {
  key: string;
  label: string;
};

export type GuestRsvpFormState = {
  rsvp: RsvpValue;
  arrivedCount: number;
  notes: string[];
};

export const RSVP_COPY = {
  chooseRequired: "יש לבחור האם מגיעים או לא מגיעים",
  guestIdentityError: "שגיאה בזיהוי האורח",
  saveFailed: "לא הצלחנו לשמור את אישור ההגעה",
  sendFailed: "שגיאה בשליחת אישור ההגעה",
  staffBlocked: "זה מצב צפייה בלבד. לא ניתן לשלוח אישור הגעה מכאן.",
  yesLabel: "מגיע/ה",
  noLabel: "לא מגיע/ה",
  countLabel: "כמה מגיעים?",
  notesLabel: "בקשות מיוחדות:",
  submit: "שליחת אישור הגעה",
  submitting: "שולח אישור הגעה…",
  success: "✓ תודה! תשובתך התקבלה",
  heading: "נשמח לדעת אם תגיעו לחגוג איתנו",
} as const;

export function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function toBool(value: unknown) {
  const normalized = cleanStr(value).toLowerCase();

  return (
    value === true ||
    value === 1 ||
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "כן"
  );
}

export function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  return fallback;
}

export function normalizeRsvp(value: unknown): RsvpValue {
  return value === "yes" || value === "no" ? value : "pending";
}

export function normalizeNotes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => cleanStr(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function isStaffPreviewFromSearchParams(searchParams: URLSearchParams) {
  const preview = cleanStr(searchParams.get("preview")).toLowerCase();
  const mode = cleanStr(searchParams.get("mode")).toLowerCase();

  return (
    preview === "staff" ||
    mode === "staff" ||
    toBool(searchParams.get("staffPreview"))
  );
}

export function getActiveMenuOptions(menu: unknown): MenuOption[] {
  if (!menu || typeof menu !== "object") return [];

  return Object.entries(menu as Record<string, unknown>)
    .filter(([, value]) => value === true)
    .map(([key]) => ({
      key,
      label: MENU_LABELS[key],
    }))
    .filter((item) => Boolean(item.label));
}

export function formStateFromGuest(guest: {
  rsvp?: unknown;
  status?: unknown;
  arrivedCount?: unknown;
  amount?: unknown;
  notes?: unknown;
} | null): GuestRsvpFormState {
  if (!guest) {
    return { rsvp: "pending", arrivedCount: 1, notes: [] };
  }

  const existingRsvp = normalizeRsvp(guest.rsvp || guest.status);
  const existingArrivedCount = toNumber(
    guest.arrivedCount ?? guest.amount,
    existingRsvp === "yes" ? 1 : 0
  );

  return {
    rsvp: existingRsvp,
    arrivedCount:
      existingRsvp === "yes" ? Math.max(1, existingArrivedCount || 1) : 0,
    notes: normalizeNotes(guest.notes),
  };
}

export function nextArrivedCount(rsvp: RsvpValue, arrivedCount: unknown) {
  return rsvp === "yes" ? Math.max(1, toNumber(arrivedCount, 1)) : 0;
}

export function buildRespondByTokenPayload(form: GuestRsvpFormState) {
  const arrivedCount = nextArrivedCount(form.rsvp, form.arrivedCount);

  return {
    rsvp: form.rsvp,
    status: form.rsvp,
    arrivedCount,
    amount: arrivedCount,
    notes: form.notes,
  };
}

export function resolvePublicEventNote(invite: any, event: any): PublicEventNote {
  const publicEventPage = invite?.publicEventPage || event?.publicEventPage || {};
  const note = publicEventPage?.note || {};

  const enabled =
    note?.enabled === true ||
    publicEventPage?.noteEnabled === true ||
    invite?.publicEventPage?.note?.enabled === true ||
    event?.publicEventPage?.note?.enabled === true;

  const text = String(
    note?.text ||
      publicEventPage?.noteText ||
      invite?.publicEventPage?.noteText ||
      event?.publicEventPage?.noteText ||
      ""
  ).trim();

  return { enabled, text };
}
