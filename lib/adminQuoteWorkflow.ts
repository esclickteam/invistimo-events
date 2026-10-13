/**
 * Shared quote/agreement workflow used by the admin quote builder.
 * Create and edit both go through these rules so a later form change
 * cannot drift from versioning, SMS, or user-link behavior.
 */

export const QUOTE_PACKAGE_KEYS = ["messages", "voice", "personal", "hybrid"] as const;
export type QuotePackageKey = (typeof QUOTE_PACKAGE_KEYS)[number];

export const QUOTE_UPSELL_KEYS = [
  "digitalSeating",
  "creditGifts",
  "venueSeating",
  "eventDayManager",
  "personalRepresentative",
  "thirdRsvpRound",
  "preRsvpMessages",
  "suppliersBudgetSystem",
  "alcoholManagement",
  "transportationManagement",
] as const;
export type QuoteUpsellKey = (typeof QUOTE_UPSELL_KEYS)[number];

export type QuoteUserPlan = "basic" | "premium" | "plan1" | "plan2" | "plan3";

const COMMERCIAL_KEYS = [
  "client",
  "event",
  "seatingSchedule",
  "quote",
  "selectedPackage",
  "upsells",
  "totals",
  "customerDealSummary",
  "cancellationTerms",
  "paymentTerms",
  "additionalTerms",
  "engagementTerms",
  "notes",
  "builderState",
] as const;

const SMS_DEDUPE_WINDOW_MS = 45_000;

export function roundQuoteMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function asQuoteNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function isQuotePackageKey(value: unknown): value is QuotePackageKey {
  return QUOTE_PACKAGE_KEYS.includes(clean(value) as QuotePackageKey);
}

export function toUserPlan(plan: unknown): QuoteUserPlan {
  const normalized = clean(plan).toLowerCase();
  if (normalized === "messages" || normalized === "easy" || normalized === "plan1") {
    return "plan1";
  }
  if (
    normalized === "voice" ||
    normalized === "personal" ||
    normalized === "hybrid" ||
    normalized === "smart" ||
    normalized === "plan2"
  ) {
    return "plan2";
  }
  if (normalized === "seating" || normalized === "plan3") return "plan3";
  if (normalized === "basic") return "basic";
  return "premium";
}

export function isSignedAgreement(doc: Record<string, unknown> | null | undefined) {
  if (!doc || clean(doc.type) !== "agreement") return false;
  if (clean(doc.status) === "signed") return true;
  if (doc.signedAt) return true;
  const signature = record(doc.signature);
  const agreement = record(doc.agreement);
  return Boolean(signature.signedAt || agreement.signedAt || signature.signatureDataUrl);
}

export function quoteWasSent(status: unknown) {
  const value = clean(status);
  return value === "sent" || value === "viewed";
}

export function editorView<T extends Record<string, unknown>>(doc: T): T {
  const revision = record(doc.draftRevision);
  if (Object.keys(revision).length === 0) return doc;
  const next: Record<string, unknown> = { ...doc };
  for (const key of COMMERCIAL_KEYS) {
    if (revision[key] !== undefined) next[key] = revision[key];
  }
  return next as T;
}

export function commercialSnapshot(doc: Record<string, unknown>, actorId = "") {
  const snapshot: Record<string, unknown> = {
    versionId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    savedByUserId: actorId,
    status: clean(doc.status),
    type: clean(doc.type),
    token: clean(doc.token),
    sms: doc.sms || null,
  };
  for (const key of COMMERCIAL_KEYS) snapshot[key] = doc[key];
  return snapshot;
}

export function pickCommercialPatch(payload: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const key of COMMERCIAL_KEYS) {
    if (payload[key] !== undefined) patch[key] = payload[key];
  }
  return patch;
}

export function saveDocumentEdit(
  doc: Record<string, unknown>,
  payload: Record<string, unknown>,
  actorId = "",
) {
  if (clean(doc.status) === "signed" || isSignedAgreement(doc)) {
    return {
      ok: false as const,
      error: "SIGNED_IMMUTABLE",
      message: "הסכם חתום הוא מסמך קבוע. שינוי עתידי דורש מסמך חדש.",
    };
  }

  const patch = pickCommercialPatch(payload);
  patch.savedAt = new Date().toISOString();
  patch.savedByUserId = actorId;

  if (quoteWasSent(doc.status)) {
    return {
      ok: true as const,
      mode: "revision" as const,
      draftRevision: patch,
    };
  }

  return {
    ok: true as const,
    mode: "inplace" as const,
    apply: patch,
  };
}

export function publishPendingRevision(
  doc: Record<string, unknown>,
  actorId = "",
) {
  const revision = record(doc.draftRevision);
  if (Object.keys(revision).length === 0) {
    return { changed: false as const, doc };
  }

  const history = Array.isArray(doc.versionHistory) ? [...doc.versionHistory] : [];
  history.push(commercialSnapshot(doc, actorId));
  const next: Record<string, unknown> = {
    ...doc,
    versionHistory: history.slice(-20),
    draftRevision: null,
  };
  for (const key of COMMERCIAL_KEYS) {
    if (revision[key] !== undefined) next[key] = revision[key];
  }
  return { changed: true as const, doc: next, publishedSnapshot: history[history.length - 1] };
}

export function normalizeSmsPhone(value: unknown) {
  let phone = clean(value).replace(/\D/g, "");
  if (!phone) return "";
  if (phone.startsWith("00")) phone = phone.slice(2);
  if (phone.startsWith("0")) phone = `972${phone.slice(1)}`;
  else if (!phone.startsWith("972")) phone = `972${phone}`;
  return phone;
}

export function shouldSkipDuplicateSms(input: {
  sms?: { sentAt?: unknown; message?: unknown; normalizedSentTo?: unknown; sentTo?: unknown } | null;
  sendHistory?: unknown[] | null;
  nextMessage: string;
  nextPhone: string;
  idempotencyKey?: string;
  now?: number;
  windowMs?: number;
}) {
  const key = clean(input.idempotencyKey);
  const history = Array.isArray(input.sendHistory) ? input.sendHistory : [];
  if (key) {
    const seen = history.some((entry) => clean(record(entry).idempotencyKey) === key);
    if (seen) return { skip: true as const, reason: "idempotency" as const };
  }

  const sms = input.sms || {};
  const sentAt = sms.sentAt ? new Date(String(sms.sentAt)).getTime() : NaN;
  if (!Number.isFinite(sentAt)) return { skip: false as const, reason: "none" as const };

  const now = input.now ?? Date.now();
  const windowMs = input.windowMs ?? SMS_DEDUPE_WINDOW_MS;
  if (now - sentAt > windowMs) return { skip: false as const, reason: "none" as const };

  const samePhone =
    normalizeSmsPhone(sms.normalizedSentTo || sms.sentTo) === normalizeSmsPhone(input.nextPhone);
  const sameMessage = clean(sms.message) === clean(input.nextMessage);
  if (samePhone && sameMessage) {
    return { skip: true as const, reason: "recent-duplicate" as const };
  }
  return { skip: false as const, reason: "none" as const };
}

export function appendSendHistory(
  doc: Record<string, unknown>,
  entry: Record<string, unknown>,
) {
  const history = Array.isArray(doc.sendHistory) ? [...doc.sendHistory] : [];
  history.push(entry);
  return history.slice(-40);
}

const PLACEHOLDERS = new Set(["אירוע", "לא הוגדרה", "לא הוגדר", "לא הוגדר"]);

function blankIfPlaceholder(value: unknown) {
  const text = clean(value);
  return PLACEHOLDERS.has(text) ? "" : text;
}

function emptyUpsells(): Record<QuoteUpsellKey, boolean> {
  return {
    digitalSeating: false,
    creditGifts: false,
    venueSeating: false,
    eventDayManager: false,
    personalRepresentative: false,
    thirdRsvpRound: false,
    preRsvpMessages: false,
    suppliersBudgetSystem: false,
    alcoholManagement: false,
    transportationManagement: false,
  };
}

function inferStaffCount(price: number | null, options: number[], fallback: number) {
  if (price === null) return fallback;
  const match = options.findIndex((option) => option === price);
  return match >= 0 ? match + 1 : fallback;
}

export type AdminQuoteBuilderState = {
  version: 1;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  customerIdNumber: string;
  clientAddress: string;
  eventName: string;
  eventDate: string;
  eventCity: string;
  venueName: string;
  seatingScheduleTimes: {
    receptionStartTime: string;
    plannedChuppahTime: string;
    plannedSeatingStartTime: string;
    teamArrivalTime: string;
  };
  rsvpSiteMode: "standard" | "personal";
  selectedPlanKey: QuotePackageKey;
  callsType: "" | "human" | "ivr";
  records: string;
  selectedUpsells: Record<QuoteUpsellKey, boolean>;
  preRsvpUpsellMode: "save_the_date_only" | "invitation_only" | "both";
  venueSeatingStaffCount: 1 | 2 | 3;
  alcoholManagementStaffCount: 1 | 2;
  suppliersBudgetFree: boolean;
  paymentMode: "full" | "split";
  customInitialPayment: string;
  adminPackagePriceOverride: number | "";
  adminUpsellPriceOverrides: Partial<Record<QuoteUpsellKey, number | "">>;
  adminDiscountType: "none" | "amount" | "percent";
  adminDiscountValue: number | "";
  adminCustomTotalEnabled: boolean;
  adminCustomTotal: number | "";
  adminSpecialOfferExpiresAt: string;
  quotePricingDisplay: "showUpsellPrices" | "packageTotalOnly";
  quoteCreatedAt: string;
  quoteExpiresAt: string;
  documentType: "quote" | "agreement";
};

function scheduleTimes(source: unknown) {
  const value = record(source);
  const changes = Array.isArray(value.changes) ? value.changes : [];
  const latest = changes.length > 0 ? record(changes[changes.length - 1]) : value;
  return {
    receptionStartTime: clean(latest.receptionStartTime),
    plannedChuppahTime: clean(latest.plannedChuppahTime),
    plannedSeatingStartTime: clean(latest.plannedSeatingStartTime),
    teamArrivalTime: clean(latest.teamArrivalTime),
  };
}

function isBuilderState(value: unknown): value is AdminQuoteBuilderState {
  const state = record(value);
  return state.version === 1 && typeof state.clientName === "string" && typeof state.records === "string";
}

export function hydrateAdminQuoteForm(source: Record<string, unknown>): AdminQuoteBuilderState {
  const view = editorView(source);
  if (isBuilderState(view.builderState)) {
    const state = view.builderState;
    return {
      ...state,
      selectedPlanKey: isQuotePackageKey(state.selectedPlanKey)
        ? state.selectedPlanKey
        : "personal",
      records: String(state.records || "1"),
      selectedUpsells: { ...emptyUpsells(), ...(state.selectedUpsells || {}) },
      adminUpsellPriceOverrides: { ...(state.adminUpsellPriceOverrides || {}) },
      seatingScheduleTimes: {
        receptionStartTime: "",
        plannedChuppahTime: "",
        plannedSeatingStartTime: "",
        teamArrivalTime: "",
        ...(state.seatingScheduleTimes || {}),
      },
    };
  }

  const client = record(view.client);
  const event = record(view.event);
  const pkg = record(view.selectedPackage);
  const totals = record(view.totals);
  const quote = record(view.quote);
  const summary = record(view.customerDealSummary);
  const upsells = Array.isArray(view.upsells) ? view.upsells.map(record) : [];
  const selectedUpsells = emptyUpsells();
  const adminUpsellPriceOverrides: Partial<Record<QuoteUpsellKey, number | "">> = {};
  let preRsvpUpsellMode: AdminQuoteBuilderState["preRsvpUpsellMode"] = "save_the_date_only";
  let venueSeatingStaffCount: 1 | 2 | 3 = 2;
  let alcoholManagementStaffCount: 1 | 2 = 1;
  let suppliersBudgetFree = false;

  for (const upsell of upsells) {
    const key = clean(upsell.key) as QuoteUpsellKey;
    if (!QUOTE_UPSELL_KEYS.includes(key)) continue;
    selectedUpsells[key] = true;
    const price = firstNumber(upsell.actualPrice, upsell.price);
    adminUpsellPriceOverrides[key] = price ?? 0;
    if (key === "preRsvpMessages") {
      const mode = clean(upsell.preRsvpMode || upsell.mode);
      if (mode === "invitation_only" || mode === "both" || mode === "save_the_date_only") {
        preRsvpUpsellMode = mode;
      }
    }
    if (key === "venueSeating") {
      const staff = firstNumber(upsell.staffCount);
      venueSeatingStaffCount =
        staff === 1 || staff === 2 || staff === 3
          ? staff
          : (inferStaffCount(price, [1000, 1600, 2100], 2) as 1 | 2 | 3);
    }
    if (key === "alcoholManagement") {
      const staff = firstNumber(upsell.staffCount);
      alcoholManagementStaffCount =
        staff === 1 || staff === 2
          ? staff
          : (inferStaffCount(price, [1200, 2000], 1) as 1 | 2);
    }
    if (key === "suppliersBudgetSystem" && upsell.givenFree === true) {
      suppliersBudgetFree = true;
    }
  }

  const packageKey = isQuotePackageKey(pkg.key) ? pkg.key : "personal";
  const records = Math.max(1, Math.floor(firstNumber(pkg.records, summary.records) ?? 100));
  const packagePrice = firstNumber(pkg.actualPrice, pkg.price);
  const paymentMode = clean(totals.paymentMode) === "full" ? "full" : "split";
  const discount = firstNumber(totals.discountAmount) ?? 0;
  const fullDiscount = firstNumber(totals.fullPaymentDiscount) ?? 0;
  const manualDiscount = roundQuoteMoney(
    Math.max(0, discount - (paymentMode === "full" ? fullDiscount : 0)),
  );
  const schedule = record(totals.paymentSchedule);
  const immediate = firstNumber(schedule.immediateTotal, totals.stripeAmount);
  const pricing = clean(
    totals.quotePricingDisplay || summary.quotePricingDisplay || summary.pricingDisplayMode,
  );
  const callsType =
    packageKey === "voice"
      ? "ivr"
      : packageKey === "messages"
        ? ""
        : "human";

  return {
    version: 1,
    clientName: clean(client.fullName),
    clientEmail: clean(client.email),
    clientPhone: clean(client.phone),
    customerIdNumber: clean(client.idNumber),
    clientAddress: clean(client.address),
    eventName: blankIfPlaceholder(event.name),
    eventDate: clean(event.date),
    eventCity: blankIfPlaceholder(event.city),
    venueName: blankIfPlaceholder(event.venueName),
    seatingScheduleTimes: scheduleTimes(view.seatingSchedule),
    rsvpSiteMode: clean(event.rsvpSiteMode) === "personal" ? "personal" : "standard",
    selectedPlanKey: packageKey,
    callsType,
    records: String(records),
    selectedUpsells,
    preRsvpUpsellMode,
    venueSeatingStaffCount,
    alcoholManagementStaffCount,
    suppliersBudgetFree,
    paymentMode,
    customInitialPayment:
      paymentMode === "split" && immediate && immediate > 0 ? String(immediate) : "",
    adminPackagePriceOverride: packagePrice ?? "",
    adminUpsellPriceOverrides,
    adminDiscountType: manualDiscount > 0 ? "amount" : "none",
    adminDiscountValue: manualDiscount > 0 ? manualDiscount : "",
    adminCustomTotalEnabled: false,
    adminCustomTotal: "",
    adminSpecialOfferExpiresAt: "",
    quotePricingDisplay: pricing === "packageTotalOnly" ? "packageTotalOnly" : "showUpsellPrices",
    quoteCreatedAt: clean(quote.createdAt),
    quoteExpiresAt: clean(quote.expiresAt),
    documentType: "quote",
  };
}

export type QuoteUserCandidate = {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  totalDealAmount?: number;
  paidAmount?: number;
  paymentsCount?: number;
};

export function describeDealGap(quoteAmount: number, activeDealAmount: number) {
  const quote = roundQuoteMoney(Math.max(0, quoteAmount));
  const active = roundQuoteMoney(Math.max(0, activeDealAmount));
  if (active <= 0 || quote === active) return null;
  return {
    quoteAmount: quote,
    activeDealAmount: active,
    message: `סכום ההצעה (${quote}) שונה מסכום העסקה הפעילה (${active}). הנתונים הכספיים לא עודכנו.`,
  };
}

export function userLinkStatus(input: {
  convertedUserId?: unknown;
  userExists: boolean;
}) {
  const id = clean(input.convertedUserId);
  if (!id) return "none" as const;
  return input.userExists ? ("created" as const) : ("broken" as const);
}

export function planQuoteUserAction(input: {
  quoteEmail: string;
  quotePhone?: string;
  quoteGross: number;
  packageKey?: unknown;
  packageTitle?: string;
  records?: number;
  callsType?: unknown;
  rsvpSiteMode?: unknown;
  convertedUserId?: string | null;
  convertedUserExists: boolean;
  existingByEmail?: QuoteUserCandidate | null;
  linkExistingUser?: boolean;
  expectedUserId?: string;
  confirmIdentity?: boolean;
  acknowledgeDealGap?: boolean;
  repairBrokenLink?: boolean;
}) {
  const quoteEmail = clean(input.quoteEmail).toLowerCase();
  const convertedId = clean(input.convertedUserId);

  if (convertedId && input.convertedUserExists) {
    return {
      action: "reject" as const,
      code: "USER_ALREADY_CREATED",
      status: 409,
      userId: convertedId,
      message: "כבר נוצר משתמש מההצעה הזו",
    };
  }

  if (convertedId && !input.convertedUserExists && input.repairBrokenLink !== true) {
    return {
      action: "reject" as const,
      code: "BROKEN_LINK",
      status: 409,
      userId: convertedId,
      message: "הקישור למשתמש שבור. לא נוצר משתמש חדש. אפשר לתקן את הקישור באופן מבוקר.",
    };
  }

  const existing = input.existingByEmail || null;
  if (existing) {
    const emailMatches = clean(existing.email).toLowerCase() === quoteEmail && Boolean(quoteEmail);
    const confirmed =
      input.linkExistingUser === true &&
      input.confirmIdentity === true &&
      clean(input.expectedUserId) === existing.id &&
      emailMatches;

    if (!confirmed) {
      return {
        action: "reject" as const,
        code: "EMAIL_ALREADY_EXISTS",
        status: 409,
        userId: existing.id,
        email: existing.email,
        name: existing.name || "",
        message: "כבר קיים משתמש עם האימייל הזה. אפשר לקשר אותו רק אחרי אישור התאמה, בלי ליצור חשבון כפול.",
      };
    }

    const gap = describeDealGap(input.quoteGross, asQuoteNumber(existing.totalDealAmount));
    if (gap && input.acknowledgeDealGap !== true) {
      return {
        action: "reject" as const,
        code: "DEAL_GAP",
        status: 409,
        userId: existing.id,
        dealGap: gap,
        message: gap.message,
      };
    }

    return {
      action: "link" as const,
      userId: existing.id,
      updateDeal: !gap && asQuoteNumber(existing.totalDealAmount) <= 0,
      dealGap: gap,
      payments: [] as unknown[],
    };
  }

  return {
    action: "create" as const,
    payments: [] as unknown[],
    commercials: buildQuoteUserCommercials({
      packageKey: input.packageKey,
      packageTitle: input.packageTitle || "",
      records: input.records || 1,
      gross: input.quoteGross,
      callsType: input.callsType,
      rsvpSiteMode: input.rsvpSiteMode,
    }),
  };
}

export function buildQuoteUserCommercials(input: {
  packageKey: unknown;
  packageTitle: string;
  records: number;
  gross: number;
  callsType?: unknown;
  rsvpSiteMode?: unknown;
}) {
  const packageKey = isQuotePackageKey(input.packageKey) ? input.packageKey : "personal";
  const plan = toUserPlan(packageKey);
  const callsType =
    clean(input.callsType) === "ivr"
      ? "ivr"
      : clean(input.callsType) === "human"
        ? "human"
        : packageKey === "voice"
          ? "ivr"
          : "human";

  return {
    plan,
    priceKey: packageKey,
    packageName: clean(input.packageTitle) || packageKey,
    guests: Math.max(1, Math.floor(input.records || 1)),
    totalDealAmount: roundQuoteMoney(Math.max(0, input.gross)),
    paidAmount: 0,
    remainingAmount: roundQuoteMoney(Math.max(0, input.gross)),
    payments: [] as unknown[],
    hasPaid: false,
    callsType,
    includeCalls: false,
    rsvpSiteMode: clean(input.rsvpSiteMode) === "personal" ? "personal" : "standard",
  };
}
