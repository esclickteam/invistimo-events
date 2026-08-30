import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import EmployeeSale from "@/models/EmployeeSale";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";
import {
  featuresForExperience,
  guestExperienceFromRsvpSiteMode,
  normalizeRsvpSiteMode,
} from "@/types/rsvpSite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VAT_RATE = 0.18;
const COMMISSION_RATE = 0.05;
const DEFAULT_CURRENCY = "ils";

type PaymentMode = "full" | "split";
type PreRsvpUpsellMode =
  | "none"
  | "save_the_date_only"
  | "invitation_only"
  | "both";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return cleanString(value).toLowerCase();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function normalizeObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function getBaseUrl(req: NextRequest) {
  const fromEnv =
    cleanString(process.env.NEXT_PUBLIC_APP_URL) ||
    cleanString(process.env.NEXT_PUBLIC_SITE_URL) ||
    cleanString(process.env.NEXTAUTH_URL) ||
    cleanString(process.env.APP_URL);

  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  return req.nextUrl.origin.replace(/\/+$/, "");
}

function calculateSale(grossAmount: number) {
  const safeGross = Math.max(0, toNumber(grossAmount));
  const netAmount = roundMoney(safeGross / (1 + VAT_RATE));
  const commissionAmount = roundMoney(netAmount * COMMISSION_RATE);

  return {
    grossAmount: roundMoney(safeGross),
    vatRate: VAT_RATE,
    netAmount,
    commissionRate: COMMISSION_RATE,
    commissionAmount,
  };
}

function calculateAdminSale(grossAmount: number) {
  const safeGross = Math.max(0, toNumber(grossAmount));
  const netAmount = roundMoney(safeGross / (1 + VAT_RATE));

  return {
    grossAmount: roundMoney(safeGross),
    vatRate: VAT_RATE,
    netAmount,
    commissionRate: 0,
    commissionAmount: 0,
  };
}

function isEmployeeAllowed(user: any, auth: any) {
  const role = cleanString(user?.role || auth?.role).toLowerCase();
  const staffType = cleanString(
    user?.staffType || auth?.staffType,
  ).toLowerCase();

  return (
    role === "staff" ||
    role === "employee" ||
    role === "admin" ||
    staffType === "producer_staff" ||
    staffType === "general_staff"
  );
}

function normalizePaymentMode(value: unknown): PaymentMode {
  return cleanString(value) === "full" ? "full" : "split";
}

function normalizePreRsvpUpsellMode(value: unknown): PreRsvpUpsellMode {
  const mode = cleanString(value);

  if (
    mode === "save_the_date_only" ||
    mode === "invitation_only" ||
    mode === "both"
  ) {
    return mode;
  }

  return "none";
}

function getPreRsvpUpsellModeFromUpsell(
  upsell: NormalizedUpsell | null,
): PreRsvpUpsellMode {
  if (!upsell) return "none";

  return normalizePreRsvpUpsellMode(
    upsell.mode || upsell.preRsvpMode || upsell.selectedMode,
  );
}

function getPreRsvpUpsellDefaultPrice(mode: PreRsvpUpsellMode) {
  if (mode === "both") return 230;
  if (mode === "save_the_date_only" || mode === "invitation_only") return 150;
  return 0;
}

function getPreRsvpUpsellPrice(upsell: NormalizedUpsell | null) {
  if (!upsell) return 0;
  if (Boolean(upsell.givenFree)) return 0;

  const explicitPrice = getUpsellPrice(upsell);

  if (explicitPrice > 0) {
    return explicitPrice;
  }

  return getPreRsvpUpsellDefaultPrice(getPreRsvpUpsellModeFromUpsell(upsell));
}



type NormalizedUpsell = Record<string, unknown>;

function getUpsellsArray(body: any): NormalizedUpsell[] {
  return Array.isArray(body?.upsells) ? body.upsells : [];
}

function getUpsellKey(upsell: NormalizedUpsell) {
  return cleanString(upsell?.key);
}

function findUpsell(upsells: NormalizedUpsell[], key: string) {
  return upsells.find((upsell) => getUpsellKey(upsell) === key) || null;
}

function hasUpsell(upsells: NormalizedUpsell[], key: string) {
  return Boolean(findUpsell(upsells, key));
}

function getUpsellPrice(upsell: NormalizedUpsell | null) {
  if (!upsell) return 0;
  if (Boolean(upsell.givenFree)) return 0;
  return roundMoney(toNumber(upsell.price) || toNumber(upsell.totalPrice));
}

function getUpsellStaffCount(
  upsell: NormalizedUpsell | null,
  fallback: number,
) {
  const staffCount = Math.floor(
    toNumber(upsell?.staffCount) ||
      toNumber(upsell?.selectedStaffCount) ||
      toNumber(upsell?.count) ||
      fallback,
  );

  return staffCount > 0 ? staffCount : fallback;
}

function planHasCalls(plan: string) {
  return plan === "smart" || plan === "seating" || plan === "plan2" || plan === "plan3";
}

function planHasDigitalSeating(plan: string) {
  return plan === "seating" || plan === "plan3";
}

function planHasCreditGifts(plan: string) {
  return plan === "seating" || plan === "plan3";
}

function toUserPlan(plan: string): "basic" | "premium" | "plan1" | "plan2" | "plan3" {
  const normalized = cleanString(plan).toLowerCase();

  if (normalized === "easy" || normalized === "plan1") return "plan1";
  if (normalized === "smart" || normalized === "plan2") return "plan2";
  if (normalized === "seating" || normalized === "plan3") return "plan3";
  if (normalized === "basic") return "basic";

  return "premium";
}

function getAllowedMessageRoundsFromUpsells(upsells: NormalizedUpsell[]) {
  return hasUpsell(upsells, "thirdRsvpRound") ? 3 : 2;
}

function buildSalesUpsells(plan: string, upsells: NormalizedUpsell[]) {
  const digitalSeating = findUpsell(upsells, "digitalSeating");
  const venueSeating = findUpsell(upsells, "venueSeating");
  const personalRepresentative = findUpsell(
    upsells,
    "personalRepresentative",
  );
  const thirdRsvpRound = findUpsell(upsells, "thirdRsvpRound");
  const preRsvpMessages = findUpsell(upsells, "preRsvpMessages");
  const suppliersBudgetSystem = findUpsell(upsells, "suppliersBudgetSystem");
  const alcoholManagement = findUpsell(upsells, "alcoholManagement");
  const transportationManagement = findUpsell(
    upsells,
    "transportationManagement"
  );
  const creditGifts = findUpsell(upsells, "creditGifts");

  const venueSeatingPrice = getUpsellPrice(venueSeating);
  const alcoholManagementPrice = getUpsellPrice(alcoholManagement);
  const creditGiftsPrice = planHasCreditGifts(plan) ? 0 : getUpsellPrice(creditGifts);
  const preRsvpMessagesMode = getPreRsvpUpsellModeFromUpsell(preRsvpMessages);
  const preRsvpMessagesPrice = getPreRsvpUpsellPrice(preRsvpMessages);

  return {
    digitalSeating: {
      enabled: planHasDigitalSeating(plan) || Boolean(digitalSeating),
      price: getUpsellPrice(digitalSeating),
    },

    creditGifts: {
      enabled: planHasCreditGifts(plan) || Boolean(creditGifts),
      price: creditGiftsPrice,
      totalPrice: creditGiftsPrice,
      givenFree: planHasCreditGifts(plan) || Boolean(creditGifts?.givenFree),
      title: "מתנות באשראי באמצעות ספק חיצוני RSVP",
      description: planHasCreditGifts(plan)
        ? "כלול בחבילת מזמינים ומושיבים"
        : "תוספת מתנות באשראי באמצעות ספק חיצוני RSVP",
    },

    venueSeating: {
      enabled: Boolean(venueSeating),
      staffCount: getUpsellStaffCount(venueSeating, 1),
      totalPrice: venueSeatingPrice,
    },

    personalRepresentative: {
      enabled: Boolean(personalRepresentative),
      price: getUpsellPrice(personalRepresentative),
    },

    thirdRsvpRound: {
      enabled: Boolean(thirdRsvpRound),
      price: getUpsellPrice(thirdRsvpRound),
    },

    preRsvpMessages: {
      enabled: Boolean(preRsvpMessages),
      mode: preRsvpMessagesMode,
      price: preRsvpMessagesPrice,
      givenFree: Boolean(preRsvpMessages?.givenFree),
      notes: cleanString(preRsvpMessages?.notes),
      saveTheDateEnabled:
        preRsvpMessagesMode === "save_the_date_only" ||
        preRsvpMessagesMode === "both",
      invitationOnlyEnabled:
        preRsvpMessagesMode === "invitation_only" ||
        preRsvpMessagesMode === "both",
      saveTheDateSentCount: 0,
      saveTheDateSentAt: null,
      invitationOnlySentCount: 0,
      invitationOnlySentAt: null,
      sentCount: 0,
      sentAt: null,
    },

    suppliersBudgetSystem: {
      enabled: Boolean(suppliersBudgetSystem),
      price: getUpsellPrice(suppliersBudgetSystem),
      givenFree: Boolean(suppliersBudgetSystem?.givenFree),
    },

    alcoholManagement: {
      enabled: Boolean(alcoholManagement),
      staffCount: getUpsellStaffCount(alcoholManagement, 1),
      totalPrice: alcoholManagementPrice,
    },

    transportationManagement: {
      enabled: Boolean(transportationManagement),
      price: getUpsellPrice(transportationManagement),
      givenFree: Boolean(transportationManagement?.givenFree),
    },
  };
}

function buildPendingAccessModules() {
  return {
    rsvpSeating: true,
    eventProduction: false,
    venues: false,
    venueDashboard: false,
    venueCrm: false,
    venueCalendar: false,
    venueMenus: false,
    venueStaff: false,
  };
}

function getStripeAmountFromBody(body: any) {
  const payment = normalizeObject(body?.payment);
  const totals = normalizeObject(body?.totals);
  const paymentSchedule = normalizeObject(
    body?.paymentSchedule || totals?.paymentSchedule,
  );

  const fromPaymentStripe = toNumber(payment.stripeAmount);
  const fromPaymentImmediate = toNumber(payment.immediateAmount);
  const fromTotalsStripe = toNumber(totals.stripeAmount);
  const fromScheduleStripe = toNumber(
    (paymentSchedule as Record<string, unknown>)?.stripeAmount,
  );
  const fromScheduleImmediate = toNumber(
    (paymentSchedule as Record<string, unknown>)?.immediateTotal,
  );
  const fromAmount = toNumber(body?.amount);

  const amount =
    fromPaymentStripe ||
    fromTotalsStripe ||
    fromScheduleStripe ||
    fromPaymentImmediate ||
    fromScheduleImmediate ||
    fromAmount;

  return roundMoney(amount);
}

function getFinalGrossAmountFromBody(body: any) {
  const payment = normalizeObject(body?.payment);
  const totals = normalizeObject(body?.totals);

  const fromTotalsAfterDiscount =
    toNumber(totals.grossAmountAfterDiscount) ||
    toNumber(totals.grossAmount);

  const fromBodyGross = toNumber(body?.grossAmount);
  const fromPaymentTotal = toNumber(payment.totalAmount);
  const fromPaymentAmount = toNumber(payment.amount);

  return roundMoney(
    fromTotalsAfterDiscount ||
      fromBodyGross ||
      fromPaymentTotal ||
      fromPaymentAmount,
  );
}

function getOriginalGrossAmountFromBody(body: any, fallback: number) {
  const payment = normalizeObject(body?.payment);
  const totals = normalizeObject(body?.totals);
  const schedule = normalizeObject(totals?.paymentSchedule);

  return roundMoney(
    toNumber(body?.originalGrossAmount) ||
      toNumber(payment.originalAmount) ||
      toNumber(totals.originalGrossAmount) ||
      toNumber(totals.grossAmountBeforeDiscount) ||
      toNumber(schedule.originalGrossAmount) ||
      toNumber(schedule.grossAmountBeforeDiscount) ||
      fallback,
  );
}

function getDiscountAmountFromBody(body: any) {
  const payment = normalizeObject(body?.payment);
  const totals = normalizeObject(body?.totals);
  const schedule = normalizeObject(totals?.paymentSchedule);

  return roundMoney(
    toNumber(body?.discountAmount) ||
      toNumber(payment.discountAmount) ||
      toNumber(totals.discountAmount) ||
      toNumber(totals.fullPaymentDiscount) ||
      toNumber(schedule.discountAmount) ||
      toNumber(schedule.fullPaymentDiscount),
  );
}

function getEventDayAmountFromBody(body: any) {
  const payment = normalizeObject(body?.payment);
  const schedule =
    normalizeObject(body?.paymentSchedule) ||
    normalizeObject(normalizeObject(body?.totals)?.paymentSchedule);

  return roundMoney(
    toNumber(payment.eventDayAmount) ||
      toNumber((schedule as Record<string, unknown>)?.eventDayTotal),
  );
}

function getActualPaidAmountFromBody({
  body,
  finalGrossAmount,
  stripeAmount,
  eventDayAmount,
  paymentMode,
}: {
  body: any;
  finalGrossAmount: number;
  stripeAmount: number;
  eventDayAmount: number;
  paymentMode: PaymentMode;
}) {
  const payment = normalizeObject(body?.payment);
  const totals = normalizeObject(body?.totals);
  const schedule = normalizeObject(
    body?.paymentSchedule || (totals as Record<string, unknown>)?.paymentSchedule,
  );

  const explicitPaidAmount =
    toNumber(body?.paidAmount) ||
    toNumber((payment as Record<string, unknown>)?.paidAmount) ||
    toNumber((payment as Record<string, unknown>)?.actualPaidAmount) ||
    toNumber((payment as Record<string, unknown>)?.amount) ||
    toNumber((payment as Record<string, unknown>)?.stripeAmount) ||
    toNumber((payment as Record<string, unknown>)?.immediateAmount) ||
    toNumber((totals as Record<string, unknown>)?.paidAmount) ||
    toNumber((totals as Record<string, unknown>)?.actualPaidAmount) ||
    toNumber((totals as Record<string, unknown>)?.stripeAmount) ||
    toNumber((schedule as Record<string, unknown>)?.paidAmount) ||
    toNumber((schedule as Record<string, unknown>)?.actualPaidAmount) ||
    toNumber((schedule as Record<string, unknown>)?.stripeAmount) ||
    toNumber((schedule as Record<string, unknown>)?.immediateTotal) ||
    stripeAmount;

  const fallbackPaidAmount =
    paymentMode === "split" && eventDayAmount > 0
      ? Math.max(0, finalGrossAmount - eventDayAmount)
      : finalGrossAmount;

  const paidAmount = roundMoney(explicitPaidAmount || fallbackPaidAmount);

  return Math.min(Math.max(0, paidAmount), finalGrossAmount);
}

function getPaymentActualMode({
  paidAmount,
  finalGrossAmount,
}: {
  paidAmount: number;
  finalGrossAmount: number;
}) {
  if (paidAmount <= 0) return "none";
  if (paidAmount >= finalGrossAmount) return "full";
  return "deposit";
}

function getRemainingAmount({
  paidAmount,
  finalGrossAmount,
}: {
  paidAmount: number;
  finalGrossAmount: number;
}) {
  return roundMoney(Math.max(0, finalGrossAmount - paidAmount));
}

function serializeSale(sale: any) {
  return {
    id: String(sale._id),
    _id: String(sale._id),

    employeeId: sale.employeeId ? String(sale.employeeId) : "",
    employeeName: sale.employeeName || "",
    employeeEmail: sale.employeeEmail || "",

    clientUserId: sale.clientUserId ? String(sale.clientUserId) : "",
    clientName: sale.clientName || "",
    clientEmail: sale.clientEmail || "",
    clientPhone: sale.clientPhone || "",

    eventName: sale.eventName || "",
    eventDate: sale.eventDate || null,

    packageName: sale.packageName || "",
    plan: sale.plan || "",

    guests: Number(sale.guests || sale.records || 0),
    records: Number(sale.records || sale.guests || 0),

    grossAmount: Number(sale.grossAmount || 0),
    originalGrossAmount: Number(sale.originalGrossAmount || sale.grossAmount || 0),
    discountAmount: Number(sale.discountAmount || 0),
    stripeAmount: Number(sale.stripeAmount || 0),
    eventDayAmount: Number(sale.eventDayAmount || 0),

    vatRate: Number(sale.vatRate || VAT_RATE),
    netAmount: Number(sale.netAmount || 0),
    commissionRate: Number(sale.commissionRate ?? COMMISSION_RATE),
    commissionAmount: Number(sale.commissionAmount || 0),

    status: sale.status || "pending",
    paymentMode: sale.paymentMode || "split",
    paymentProvider: sale.paymentProvider || "stripe",

    stripeCheckoutSessionId:
      sale.stripeCheckoutSessionId || sale.payment?.checkoutSessionId || "",
    stripeCheckoutUrl: sale.stripeCheckoutUrl || sale.payment?.checkoutUrl || "",
    stripePaymentIntentId:
      sale.stripePaymentIntentId || sale.payment?.paymentIntentId || "",
    stripePaidAt: sale.stripePaidAt || sale.payment?.paidAt || null,

    payment: sale.payment || null,
    salesUpsells: sale.salesUpsells || null,

    signedAgreementToken: sale.signedAgreementToken || "",
    agreementToken: sale.agreementToken || "",
    agreementDocumentId: sale.agreementDocumentId
      ? String(sale.agreementDocumentId)
      : "",
    salesDocumentId: sale.salesDocumentId ? String(sale.salesDocumentId) : "",
    agreementStatus: sale.agreementStatus || "",
    agreementSignedAt: sale.agreementSignedAt || null,

    source: sale.source || "employee_sales_page",
    notes: sale.notes || "",

    createdAt: sale.createdAt || null,
    updatedAt: sale.updatedAt || null,
  };
}

async function requireAdmin(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);

  if (!auth?.userId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      ),
    };
  }

  const adminObjectId = toObjectId(auth.userId);

  if (!adminObjectId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "INVALID_ADMIN_ID" },
        { status: 400 },
      ),
    };
  }

  const currentUser = await User.findById(adminObjectId)
    .select("_id name email role staffType")
    .lean();

  if (!currentUser) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "ADMIN_NOT_FOUND" },
        { status: 404 },
      ),
    };
  }

  if (cleanString((currentUser as any).role).toLowerCase() !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    auth,
    adminObjectId,
    employeeObjectId: adminObjectId,
    currentUser,
  };
}

async function createStripeCheckoutSession({
  req,
  userId,
  saleId,
  clientEmail,
  clientName,
  packageName,
  plan,
  stripeAmount,
  finalGrossAmount,
  originalGrossAmount,
  discountAmount,
  eventDayAmount,
  paymentMode,
}: {
  req: NextRequest;
  userId: string;
  saleId: string;
  clientEmail: string;
  clientName: string;
  packageName: string;
  plan: string;
  stripeAmount: number;
  finalGrossAmount: number;
  originalGrossAmount: number;
  discountAmount: number;
  eventDayAmount: number;
  paymentMode: PaymentMode;
}) {
  const secretKey = cleanString(process.env.STRIPE_SECRET_KEY);

  if (!secretKey) {
    throw new Error("חסר STRIPE_SECRET_KEY במשתני הסביבה");
  }

  const baseUrl = getBaseUrl(req);
  const amountInAgorot = Math.round(stripeAmount * 100);

  if (amountInAgorot < 50) {
    throw new Error("סכום Stripe נמוך מדי או לא תקין");
  }

  const successUrl = `${baseUrl}/admin/sales/new?payment=success&saleId=${encodeURIComponent(

    saleId,
  )}&userId=${encodeURIComponent(userId)}`;

  const cancelUrl = `${baseUrl}/admin/sales/new?payment=cancelled&saleId=${encodeURIComponent(
    saleId,
  )}&userId=${encodeURIComponent(userId)}`;

  const descriptionParts = [
    `לקוח: ${clientName}`,
    `סכום עסקה כולל: ${finalGrossAmount} ₪`,
  ];

  if (paymentMode === "full" && discountAmount > 0) {
    descriptionParts.push(`הנחת תשלום מלא: ${discountAmount} ₪`);
  }

  if (paymentMode === "split" && eventDayAmount > 0) {
    descriptionParts.push(`יתרה ביום האירוע: ${eventDayAmount} ₪`);
  }

  const body = new URLSearchParams();

  body.set("mode", "payment");
  body.set("success_url", successUrl);
  body.set("cancel_url", cancelUrl);
  body.set("customer_email", clientEmail);
  body.set("client_reference_id", userId);

  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", DEFAULT_CURRENCY);
  body.set(
    "line_items[0][price_data][unit_amount]",
    String(amountInAgorot),
  );
  body.set(
    "line_items[0][price_data][product_data][name]",
    `Invistimo - ${packageName || plan}`,
  );
  body.set(
    "line_items[0][price_data][product_data][description]",
    descriptionParts.join(" | "),
  );

  body.set("metadata[userId]", userId);
  body.set("metadata[saleId]", saleId);
  body.set("metadata[source]", "employee_sales_page");
  body.set("metadata[paymentMode]", paymentMode);
  body.set("metadata[stripeAmount]", String(stripeAmount));
  body.set("metadata[finalGrossAmount]", String(finalGrossAmount));
  body.set("metadata[originalGrossAmount]", String(originalGrossAmount));
  body.set("metadata[discountAmount]", String(discountAmount));
  body.set("metadata[eventDayAmount]", String(eventDayAmount));
  body.set("metadata[paidAmount]", String(stripeAmount));
  body.set("metadata[totalDealAmount]", String(finalGrossAmount));
  body.set("metadata[remainingAmount]", String(Math.max(0, finalGrossAmount - stripeAmount)));
  body.set("metadata[paymentActualMode]", stripeAmount >= finalGrossAmount ? "full" : "deposit");
  body.set("metadata[requiresWebhookActivation]", "true");

  body.set("payment_intent_data[metadata][userId]", userId);
  body.set("payment_intent_data[metadata][saleId]", saleId);
  body.set("payment_intent_data[metadata][source]", "employee_sales_page");
  body.set("payment_intent_data[metadata][paymentMode]", paymentMode);
  body.set("payment_intent_data[metadata][stripeAmount]", String(stripeAmount));
  body.set(
    "payment_intent_data[metadata][finalGrossAmount]",
    String(finalGrossAmount),
  );
  body.set(
    "payment_intent_data[metadata][eventDayAmount]",
    String(eventDayAmount),
  );
  body.set("payment_intent_data[metadata][paidAmount]", String(stripeAmount));
  body.set(
    "payment_intent_data[metadata][totalDealAmount]",
    String(finalGrossAmount),
  );
  body.set(
    "payment_intent_data[metadata][remainingAmount]",
    String(Math.max(0, finalGrossAmount - stripeAmount)),
  );
  body.set(
    "payment_intent_data[metadata][paymentActualMode]",
    stripeAmount >= finalGrossAmount ? "full" : "deposit",
  );
  body.set("payment_intent_data[metadata][requiresWebhookActivation]", "true");

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    cache: "no-store",
    body,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.url) {
    console.error("CREATE STRIPE CHECKOUT FAILED:", {
      status: response.status,
      data,
    });

    throw new Error(
      data?.error?.message || "שגיאה ביצירת קישור תשלום Stripe",
    );
  }

  return {
    checkoutSessionId: cleanString(data.id),
    checkoutUrl: cleanString(data.url),
  };
}

/* =========================================================
   GET /api/admin/sales
   מחזיר לעובד רק את המכירות שלו
========================================================= */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const required = await requireAdmin(req);

    if (!required.ok) {
      return required.response;
    }

    const salesRaw = await EmployeeSale.find({})
      .sort({ createdAt: -1 })
      .lean();

    const sales = salesRaw.map(serializeSale);

    const summary = sales.reduce(
      (
        acc: {
          totalSales: number;
          paidSales: number;
          pendingSales: number;
          cancelledSales: number;
          refundedSales: number;

          grossTotal: number;
          netTotal: number;
          commissionTotal: number;

          paidGrossTotal: number;
          paidNetTotal: number;
          paidCommissionTotal: number;

          pendingGrossTotal: number;
          pendingNetTotal: number;
          pendingCommissionTotal: number;
        },
        sale,
      ) => {
        const status = String(sale.status || "").toLowerCase();

        if (status === "cancelled") {
          acc.cancelledSales += 1;
          return acc;
        }

        if (status === "refunded") {
          acc.refundedSales += 1;
          return acc;
        }

        acc.totalSales += 1;

        const grossAmount = Number(sale.grossAmount || 0);
        const netAmount = Number(sale.netAmount || 0);
        const commissionAmount = Number(sale.commissionAmount || 0);

        if (status === "paid") {
          acc.paidSales += 1;
          acc.paidGrossTotal += grossAmount;
          acc.paidNetTotal += netAmount;
          acc.paidCommissionTotal += commissionAmount;

          // תאימות לאחור: הכרטיסים הראשיים מציגים רק עסקאות ששולמו בפועל.
          acc.grossTotal += grossAmount;
          acc.netTotal += netAmount;
          acc.commissionTotal += commissionAmount;
        } else {
          acc.pendingSales += 1;
          acc.pendingGrossTotal += grossAmount;
          acc.pendingNetTotal += netAmount;
          acc.pendingCommissionTotal += commissionAmount;
        }

        return acc;
      },
      {
        totalSales: 0,
        paidSales: 0,
        pendingSales: 0,
        cancelledSales: 0,
        refundedSales: 0,

        grossTotal: 0,
        netTotal: 0,
        commissionTotal: 0,

        paidGrossTotal: 0,
        paidNetTotal: 0,
        paidCommissionTotal: 0,

        pendingGrossTotal: 0,
        pendingNetTotal: 0,
        pendingCommissionTotal: 0,
      },
    );

    return NextResponse.json(
      {
        success: true,
        summary: {
          ...summary,

          grossTotal: roundMoney(summary.grossTotal),
          netTotal: roundMoney(summary.netTotal),
          commissionTotal: roundMoney(summary.commissionTotal),

          paidGrossTotal: roundMoney(summary.paidGrossTotal),
          paidNetTotal: roundMoney(summary.paidNetTotal),
          paidCommissionTotal: roundMoney(summary.paidCommissionTotal),

          pendingGrossTotal: roundMoney(summary.pendingGrossTotal),
          pendingNetTotal: roundMoney(summary.pendingNetTotal),
          pendingCommissionTotal: roundMoney(summary.pendingCommissionTotal),

          vatRate: VAT_RATE,
          commissionRate: COMMISSION_RATE,
        },
        sales,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("ADMIN SALES GET FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "שגיאת שרת",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   POST /api/admin/sales
   יוצר לקוח חדש + שומר מכירה לעובד המחובר + יוצר Stripe Checkout
========================================================= */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const required = await requireAdmin(req);

    if (!required.ok) {
      return required.response;
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_BODY",
          message: "בקשה לא תקינה",
        },
        { status: 400 },
      );
    }

    const clientName = cleanString(body?.clientName || body?.name);
    const clientEmail = normalizeEmail(body?.clientEmail || body?.email);
    const clientPhone = cleanString(body?.clientPhone || body?.phone);

    const customerIdNumber = cleanString(body?.customerIdNumber);
    const clientAddress = cleanString(body?.clientAddress);

    const eventName = cleanString(body?.eventName);
    const eventDateRaw = cleanString(body?.eventDate);
    const eventCity = cleanString(body?.eventCity);
    const venueName = cleanString(body?.venueName);
    const rsvpSiteMode = normalizeRsvpSiteMode(body?.rsvpSiteMode);
    const guestExperienceType = guestExperienceFromRsvpSiteMode(rsvpSiteMode);
    const customerFeatures = featuresForExperience(guestExperienceType);

    const requireAgreementBeforePassword = Boolean(
      body?.requireAgreementBeforePassword,
    );
    const onboardingAgreementToken = cleanString(
      body?.onboardingAgreementToken ||
        body?.agreementToken ||
        body?.signedAgreementToken,
    );

    const packageName = cleanString(body?.packageName);
    const plan = cleanString(body?.plan) || "premium";
    const userPlan = toUserPlan(plan);
    const guests = Math.max(0, Math.floor(toNumber(body?.guests || body?.records)));

    const payment = normalizeObject(body?.payment);
    const totals = normalizeObject(body?.totals);

    const paymentMode = normalizePaymentMode(
      body?.paymentMode || payment.mode || totals.paymentMode,
    );

    const adminPaymentStatus =
      cleanString(body?.adminPaymentStatus) === "manual_paid"
        ? "manual_paid"
        : "stripe";
    const isManualPaid = adminPaymentStatus === "manual_paid";
    const manualPaymentReference = cleanString(body?.manualPaymentReference);
    const manualPaymentNote = cleanString(body?.manualPaymentNote);
    const adminPricingOverride = normalizeObject(body?.adminPricingOverride);

    const finalGrossAmount = getFinalGrossAmountFromBody(body);
    const originalGrossAmount = getOriginalGrossAmountFromBody(
      body,
      finalGrossAmount,
    );
    const discountAmount = getDiscountAmountFromBody(body);
    const stripeAmount = getStripeAmountFromBody(body);
    const eventDayAmount = getEventDayAmountFromBody(body);

    /**
     * paidAmount = רק כסף שנכנס בפועל עכשיו.
     * finalGrossAmount / totalDealAmount = כל שווי העסקה.
     *
     * לדוגמה:
     * עסקה 2,299 ₪ עם מקדמה 500 ₪:
     * totalDealAmount = 2299
     * paidAmount = 500
     * remainingAmount = 1799
     */
    const actualPaidAmount = getActualPaidAmountFromBody({
      body,
      finalGrossAmount,
      stripeAmount,
      eventDayAmount,
      paymentMode,
    });

    const remainingAmount = getRemainingAmount({
      paidAmount: actualPaidAmount,
      finalGrossAmount,
    });

    const paymentActualMode = getPaymentActualMode({
      paidAmount: actualPaidAmount,
      finalGrossAmount,
    });

    const notes = cleanString(body?.notes);
    const upsells = getUpsellsArray(body);
    const allowedMessageRounds = getAllowedMessageRoundsFromUpsells(upsells);
    const salesUpsells = buildSalesUpsells(plan, upsells);
    const hasCallsPackage = planHasCalls(plan);
    const hasDigitalSeatingPackage = planHasDigitalSeating(plan);
    const hasSuppliersBudgetSystem = salesUpsells.suppliersBudgetSystem.enabled;
    const hasDigitalSeating = salesUpsells.digitalSeating.enabled;
    const hasCreditGifts = salesUpsells.creditGifts.enabled;
    const hasVenueSeating = salesUpsells.venueSeating.enabled;
    const hasPreRsvpMessages = salesUpsells.preRsvpMessages.enabled;
    const preRsvpMessagesMode = salesUpsells.preRsvpMessages.mode;
    const hasAlcoholManagement = salesUpsells.alcoholManagement.enabled;
    const hasTransportationManagement = Boolean(
      salesUpsells.transportationManagement?.enabled
    );

    if (!clientName || !clientEmail || !clientPhone || finalGrossAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_REQUIRED_FIELDS",
          message: "חובה למלא שם לקוח, מייל, טלפון וסכום עסקה",
        },
        { status: 400 },
      );
    }

    if (!isManualPaid && stripeAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_STRIPE_AMOUNT",
          message: "סכום Stripe לתשלום עכשיו לא תקין",
        },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_EMAIL",
          message: "אימייל לקוח לא תקין",
        },
        { status: 400 },
      );
    }

    if (requireAgreementBeforePassword && !onboardingAgreementToken) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_AGREEMENT_TOKEN",
          message: "כדי לחייב חתימה לפני סיסמה יש ליצור הסכם לחתימה",
        },
        { status: 400 },
      );
    }

    const existingUser = await User.findOne({ email: clientEmail })
      .select("_id name email phone")
      .lean();

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "EMAIL_ALREADY_EXISTS",
          message: "כבר קיים לקוח עם המייל הזה במערכת",
        },
        { status: 409 },
      );
    }

    const calculated = calculateAdminSale(finalGrossAmount);

    const eventDate =
      eventDateRaw && !Number.isNaN(new Date(eventDateRaw).getTime())
        ? new Date(eventDateRaw)
        : null;

    const createdUser = await User.create({
      name: clientName,
      email: clientEmail,
      phone: clientPhone,

      role: "user",

      plan: userPlan,
      priceKey: userPlan,
      packageName: packageName || plan,

      guests,
      maxGuests: guests,

      // תשלום רק Stripe — עד שה-webhook חוזר כ-paid, הלקוח לא פעיל ולא נפתחות הרשאות.
      // חשוב: paidAmount נשאר 0 עד תשלום בפועל.
      // totalDealAmount שומר את כל שווי העסקה.
      totalDealAmount: finalGrossAmount,
      paidAmount: 0,
      remainingAmount: finalGrossAmount,
      paymentMode,
      paymentActualMode: "none",
      hasPaid: false,
      isActive: false,
      paidAt: null,
      lastPaymentAt: null,
      payments: [],

      eventDate,

      rsvpSiteMode,
      guestExperienceType,
      features: customerFeatures,

      // נשמרים במכירה ונפתחים בפועל רק אחרי checkout.session.completed ב-webhook.
      includeCalls: false,
      callsRounds: 0,
      callsAddonPrice: 0,

      includeCreditGifts: false,
      creditGiftsAddonPrice: salesUpsells.creditGifts.price,

      includeDigitalSeating: false,
      includeEventManagement: false,
      includeCustomDesign: false,

      selfManageEnabled: false,
      customDesignEnabled: false,

      smsPerRecord: 1,
      smsLimit: guests,
      maxMessages: guests,

      smsBalance: 0,
      smsUsed: 0,
      testSmsUsed: 0,

      whatsappBalance: 0,
      whatsappUsed: 0,

      allowedMessageRounds: 2,

      salesUpsells: {
        digitalSeating: {
          enabled: false,
          price: salesUpsells.digitalSeating.price,
        },
        creditGifts: {
          enabled: false,
          price: salesUpsells.creditGifts.price,
          totalPrice: salesUpsells.creditGifts.totalPrice,
          givenFree: salesUpsells.creditGifts.givenFree,
          title: salesUpsells.creditGifts.title,
          description: salesUpsells.creditGifts.description,
        },
        venueSeating: {
          enabled: false,
          staffCount: salesUpsells.venueSeating.staffCount,
          totalPrice: salesUpsells.venueSeating.totalPrice,
        },
        personalRepresentative: {
          enabled: false,
          price: salesUpsells.personalRepresentative.price,
        },
        thirdRsvpRound: {
          enabled: false,
          price: salesUpsells.thirdRsvpRound.price,
        },
        preRsvpMessages: {
          enabled: false,
          mode: salesUpsells.preRsvpMessages.mode,
          price: salesUpsells.preRsvpMessages.price,
          givenFree: salesUpsells.preRsvpMessages.givenFree,
          notes: salesUpsells.preRsvpMessages.notes,
          saveTheDateEnabled: false,
          invitationOnlyEnabled: false,
          saveTheDateSentCount: 0,
          saveTheDateSentAt: null,
          invitationOnlySentCount: 0,
          invitationOnlySentAt: null,
          sentCount: 0,
          sentAt: null,
        },
        suppliersBudgetSystem: {
          enabled: false,
          price: salesUpsells.suppliersBudgetSystem.price,
          givenFree: salesUpsells.suppliersBudgetSystem.givenFree,
        },
        alcoholManagement: {
          enabled: false,
          staffCount: salesUpsells.alcoholManagement.staffCount,
          totalPrice: salesUpsells.alcoholManagement.totalPrice,
        },
        transportationManagement: {
          enabled: false,
          price: salesUpsells.transportationManagement?.price || 0,
          givenFree: Boolean(salesUpsells.transportationManagement?.givenFree),
        },
      },

      accessModules: buildPendingAccessModules(),

      planLimits: {
        maxGuests: guests,
        allowedMessageRounds: 2,
        smsEnabled: true,
        smsLimit: guests,
        seatingEnabled: false,
        remindersEnabled: true,
        callsEnabled: false,
      },

      isTrial: false,
      needsPasswordSetup: true,
      requireAgreementBeforePassword,
      onboardingAgreementToken: requireAgreementBeforePassword
        ? onboardingAgreementToken
        : "",
      onboardingAgreementSignedAt: null,

      createdByAdmin: true,
      billingSource: isManualPaid ? "admin" : "pricing",
    });

    const sale = await EmployeeSale.create({
      employeeId: required.employeeObjectId,
      employeeName: cleanString((required.currentUser as any).name),
      employeeEmail: normalizeEmail((required.currentUser as any).email),

      clientUserId: createdUser._id,
      clientName,
      clientEmail,
      clientPhone,

      customerIdNumber,
      clientAddress,

      eventName,
      eventDate,
      eventCity,
      venueName,

      packageName: packageName || plan,
      plan,
      guests,

      ...calculated,

      originalGrossAmount,
      discountAmount,
      stripeAmount,
      eventDayAmount,
      paymentMode,
      paymentProvider: isManualPaid ? "manual" : "stripe",

      selectedPackage: body?.selectedPackage || null,
      upsells,
      salesUpsells,
      activationSnapshot: {
        plan,
        userPlan,
        packageName: packageName || plan,
        guests,
        allowedMessageRounds,
        hasCallsPackage,
        hasDigitalSeatingPackage,
        hasDigitalSeating,
        hasCreditGifts,
        hasVenueSeating,
        hasPreRsvpMessages,
        preRsvpMessagesMode,
        hasSuppliersBudgetSystem,
        hasAlcoholManagement,
        hasTransportationManagement,
        salesUpsells,
        adminPricingOverride,
        adminPaymentStatus,
      },
      quote: body?.quote || null,
      totals: body?.totals || null,
      customerDealSummary: body?.customerDealSummary || null,
      cancellationTerms: Array.isArray(body?.cancellationTerms)
        ? body.cancellationTerms
        : [],
      paymentTerms: Array.isArray(body?.paymentTerms) ? body.paymentTerms : [],
      additionalTerms: Array.isArray(body?.additionalTerms)
        ? body.additionalTerms
        : [],
      paymentSchedule: body?.paymentSchedule || null,

      saleCompliance: body?.saleCompliance || null,

      agreementToken: requireAgreementBeforePassword
        ? onboardingAgreementToken
        : cleanString(body?.signedAgreementToken),
      signedAgreementToken: "",
      agreementStatus: requireAgreementBeforePassword
        ? "pending_signature"
        : "",
      agreementSignedAt: null,

      // תשלום רק Stripe
      status: "pending",
      source: "employee_sales_page",
      notes,
    });

    if (isManualPaid) {
      const now = new Date();
      const paidAmount = actualPaidAmount;
      const userRemainingAmount = remainingAmount;
      const includeCalls = Boolean(hasCallsPackage);
      const includeDigitalSeating = Boolean(hasDigitalSeating);
      const includeCreditGifts = Boolean(hasCreditGifts);
      const includeEventManagement = Boolean(hasSuppliersBudgetSystem);
      const includeTransportationManagement = Boolean(
        hasTransportationManagement
      );
      const activatedAllowedMessageRounds = allowedMessageRounds;

      const activatedAccessModules = {
        rsvpSeating: includeDigitalSeating,
        eventProduction: includeEventManagement,
        transportationManagement: includeTransportationManagement,
        venues: false,
        venueDashboard: false,
        venueCrm: false,
        venueCalendar: false,
        venueMenus: false,
        venueStaff: false,
      };

      const activatedPlanLimits = {
        maxGuests: guests,
        allowedMessageRounds: activatedAllowedMessageRounds,
        smsEnabled: true,
        smsLimit: guests,
        seatingEnabled: includeDigitalSeating,
        remindersEnabled: true,
        callsEnabled: includeCalls,
        transportationEnabled: includeTransportationManagement,
      };

      const venueSeatingPrice = salesUpsells.venueSeating.totalPrice || 0;
      const eventDeposit = toNumber((body?.paymentSchedule as any)?.eventServicesDeposit, 0);
      const eventBalance = toNumber((body?.paymentSchedule as any)?.eventServicesBalance, 0);

      await User.findByIdAndUpdate(
        createdUser._id,
        {
          $set: {
            hasPaid: true,
            isActive: true,
            totalDealAmount: finalGrossAmount,
            paidAmount,
            remainingAmount: userRemainingAmount,
            paymentMode,
            paymentActualMode,
            paidAt: now,
            lastPaymentAt: now,
            billingSource: "admin",
            isTrial: false,
            hasDashboardAccess: true,

            plan: userPlan,
            priceKey: userPlan,
            packageName: packageName || plan,
            guests,
            maxGuests: guests,

            allowedMessageRounds: activatedAllowedMessageRounds,
            planLimits: activatedPlanLimits,
            smsLimit: guests,
            maxMessages: guests,

            includeCalls,
            callsRounds: includeCalls ? 3 : 0,
            callsAddonPrice: 0,
            callsEnabledBy: includeCalls ? "admin" : null,
            callsEnabledAt: includeCalls ? now : null,

            includeCreditGifts,
            creditGiftsAddonPrice: salesUpsells.creditGifts.price,
            creditGiftsEnabledBy: includeCreditGifts ? "admin" : null,
            creditGiftsEnabledAt: includeCreditGifts ? now : null,
            "salesUpsells.creditGifts": {
              enabled: includeCreditGifts,
              price: salesUpsells.creditGifts.price,
              totalPrice: salesUpsells.creditGifts.totalPrice,
              givenFree: salesUpsells.creditGifts.givenFree,
              title: salesUpsells.creditGifts.title,
              description: salesUpsells.creditGifts.description,
            },

            includeDigitalSeating,
            includeEventManagement,
            includeTransportationManagement,
            includeCustomDesign: false,
            accessModules: activatedAccessModules,
            selfManageEnabled: includeEventManagement,
            customDesignEnabled: false,
            salesUpsells,

            venueSeatingService: {
              enabled: Boolean(salesUpsells.venueSeating.enabled),
              totalPrice: venueSeatingPrice,
              depositAmount: eventDeposit,
              venuePaymentAmount: eventBalance,
              staffPaymentAmount: 0,
              staffPaidFromVenue: 0,
              staffPaidFromFullAmount: 0,
              venuePaymentAfterStaff: eventBalance,
              totalAfterStaff: venueSeatingPrice,
            },

            manualPaymentReference,
            manualPaymentNote,
            manualPaidAt: now,
            pendingPaymentAmount: 0,
            pendingGrossAmount: 0,
            pendingEventDayAmount: userRemainingAmount,
            pendingRemainingAmount: userRemainingAmount,
            updatedAt: now,
          },
          $push: {
            payments: {
              amount: paidAmount,
              type: paymentActualMode,
              mode: paymentMode,
              provider: "manual",
              paidAt: now,
              saleId: sale._id,
              reference: manualPaymentReference,
              note: manualPaymentNote,
              totalDealAmount: finalGrossAmount,
              remainingAmount: userRemainingAmount,
            },
          },
        },
      );

      sale.set?.("status", "paid");
      sale.set?.("paymentProvider", "manual");
      sale.set?.("payment.provider", "manual");
      sale.set?.("payment.method", "manual");
      sale.set?.("payment.status", "paid");
      sale.set?.("payment.paidAt", now);
      sale.set?.("payment.amount", paidAmount);
      sale.set?.("payment.paidAmount", paidAmount);
      sale.set?.("payment.totalDealAmount", finalGrossAmount);
      sale.set?.("payment.remainingAmount", userRemainingAmount);
      sale.set?.("payment.paymentActualMode", paymentActualMode);
      sale.set?.("payment.stripeAmount", paidAmount);
      sale.set?.("payment.eventDayAmount", userRemainingAmount);
      sale.set?.("salesUpsells.creditGifts", {
        enabled: includeCreditGifts,
        price: salesUpsells.creditGifts.price,
        totalPrice: salesUpsells.creditGifts.totalPrice,
        givenFree: salesUpsells.creditGifts.givenFree,
        title: salesUpsells.creditGifts.title,
        description: salesUpsells.creditGifts.description,
      });
      sale.set?.("activationSnapshot.hasCreditGifts", includeCreditGifts);
      sale.set?.("activationSnapshot.hasPreRsvpMessages", hasPreRsvpMessages);
      sale.set?.("activationSnapshot.preRsvpMessagesMode", preRsvpMessagesMode);
      sale.set?.("paidAmount", paidAmount);
      sale.set?.("totalDealAmount", finalGrossAmount);
      sale.set?.("remainingAmount", userRemainingAmount);
      sale.set?.("paymentActualMode", paymentActualMode);
      sale.set?.("paidAt", now);
      sale.set?.("stripePaidAt", now);
      sale.set?.("manualPaymentReference", manualPaymentReference);
      sale.set?.("manualPaymentNote", manualPaymentNote);
      await sale.save?.();

      let passwordSetup: Awaited<
        ReturnType<typeof sendPasswordSetupMail>
      > | null = null;
      try {
        passwordSetup = await sendPasswordSetupMail(String(createdUser._id), {
          alsoSms: true,
        });
      } catch (mailError) {
        console.error("SEND PASSWORD SETUP MAIL FAILED:", mailError);
      }

      return NextResponse.json(
        {
          success: true,
          userId: String(createdUser._id),
          saleId: String(sale._id),
          passwordSetup: passwordSetup
            ? {
                link: passwordSetup.link,
                email: passwordSetup.email,
                phone: passwordSetup.phone,
                emailSent: passwordSetup.emailSent,
                smsSent: passwordSetup.smsSent,
                emailError: passwordSetup.emailError || null,
                smsError: passwordSetup.smsError || null,
              }
            : {
                link: null,
                email: clientEmail,
                phone: clientPhone || "",
                emailSent: false,
                smsSent: false,
                emailError: "PASSWORD_SETUP_DELIVERY_FAILED",
                smsError: null,
              },
          payment: {
            provider: "manual",
            status: "paid",
            mode: paymentMode,
            stripeAmount: paidAmount,
            paidAmount,
            totalDealAmount: finalGrossAmount,
            remainingAmount: userRemainingAmount,
            paymentActualMode,
            finalGrossAmount,
            originalGrossAmount,
            discountAmount,
            eventDayAmount: userRemainingAmount,
            manualPaymentReference,
          },
          sale: serializeSale(sale),
        },
        { status: 201 },
      );
    }

    const checkout = await createStripeCheckoutSession({
      req,
      userId: String(createdUser._id),
      saleId: String(sale._id),
      clientEmail,
      clientName,
      packageName: packageName || plan,
      plan,
      stripeAmount,
      finalGrossAmount,
      originalGrossAmount,
      discountAmount,
      eventDayAmount,
      paymentMode,
    });

    sale.set?.("stripeCheckoutSessionId", checkout.checkoutSessionId);
    sale.set?.("stripeCheckoutUrl", checkout.checkoutUrl);
    sale.set?.("payment.checkoutSessionId", checkout.checkoutSessionId);
    sale.set?.("payment.checkoutUrl", checkout.checkoutUrl);
    await sale.save?.();

    await User.updateOne(
      { _id: createdUser._id },
      {
        $set: {
          stripeCheckoutSessionId: checkout.checkoutSessionId,
          stripeCheckoutUrl: checkout.checkoutUrl,
          totalDealAmount: finalGrossAmount,
          remainingAmount: finalGrossAmount,
          paymentMode,
          paymentActualMode: "none",
          pendingPaymentAmount: stripeAmount,
          pendingGrossAmount: finalGrossAmount,
          pendingEventDayAmount: remainingAmount,
          pendingRemainingAmount: remainingAmount,
          billingSource: "pricing",
        },
      },
    );

    let passwordSetup: Awaited<
      ReturnType<typeof sendPasswordSetupMail>
    > | null = null;
    try {
      passwordSetup = await sendPasswordSetupMail(String(createdUser._id), {
        alsoSms: true,
      });
    } catch (mailError) {
      console.error("SEND PASSWORD SETUP MAIL FAILED:", mailError);
    }

    return NextResponse.json(
      {
        success: true,
        userId: String(createdUser._id),
        passwordSetup: passwordSetup
          ? {
              link: passwordSetup.link,
              email: passwordSetup.email,
              phone: passwordSetup.phone,
              emailSent: passwordSetup.emailSent,
              smsSent: passwordSetup.smsSent,
              emailError: passwordSetup.emailError || null,
              smsError: passwordSetup.smsError || null,
            }
          : {
              link: null,
              email: clientEmail,
              phone: clientPhone || "",
              emailSent: false,
              smsSent: false,
              emailError: "PASSWORD_SETUP_DELIVERY_FAILED",
              smsError: null,
            },
        saleId: String(sale._id),
        checkoutUrl: checkout.checkoutUrl,
        stripeCheckoutUrl: checkout.checkoutUrl,
        checkoutSessionId: checkout.checkoutSessionId,
        payment: {
          provider: "stripe",
          mode: paymentMode,
          stripeAmount,
          paidAmount: stripeAmount,
          totalDealAmount: finalGrossAmount,
          remainingAmount,
          paymentActualMode,
          finalGrossAmount,
          originalGrossAmount,
          discountAmount,
          eventDayAmount: remainingAmount,
        },
        sale: serializeSale(sale),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("ADMIN SALES POST FAILED:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "EMAIL_ALREADY_EXISTS",
          message: "המייל כבר קיים במערכת",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "שגיאת שרת",
      },
      { status: 500 },
    );
  }
}