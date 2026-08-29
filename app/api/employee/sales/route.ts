import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import EmployeeSale from "@/models/EmployeeSale";
import CustomerFile from "@/models/CustomerFile";
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
  const suppliersBudgetSystem = findUpsell(upsells, "suppliersBudgetSystem");
  const alcoholManagement = findUpsell(upsells, "alcoholManagement");
  const creditGifts = findUpsell(upsells, "creditGifts");

  const venueSeatingPrice = getUpsellPrice(venueSeating);
  const alcoholManagementPrice = getUpsellPrice(alcoholManagement);
  const creditGiftsPrice = getUpsellPrice(creditGifts);

  return {
    digitalSeating: {
      enabled: planHasDigitalSeating(plan) || Boolean(digitalSeating),
      price: getUpsellPrice(digitalSeating),
    },

    creditGifts: {
      enabled: planHasCreditGifts(plan) || Boolean(creditGifts),
      price: planHasCreditGifts(plan) ? 0 : creditGiftsPrice,
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

function buildAccessModules({
  includeDigitalSeating,
  includeEventManagement,
}: {
  includeDigitalSeating: boolean;
  includeEventManagement: boolean;
}) {
  return {
    rsvpSeating: Boolean(includeDigitalSeating),
    eventProduction: Boolean(includeEventManagement),
    venues: false,
    venueDashboard: false,
    venueCrm: false,
    venueCalendar: false,
    venueMenus: false,
    venueStaff: false,
  };
}

function getCreditGiftsState(plan: string, salesUpsells: any) {
  const includedInPackage = planHasCreditGifts(plan);
  const price = includedInPackage ? 0 : roundMoney(toNumber(salesUpsells?.creditGifts?.price));
  const enabled = Boolean(includedInPackage || salesUpsells?.creditGifts?.enabled);

  return {
    enabled,
    price,
    totalPrice: price,
    givenFree: includedInPackage,
    title: "מתנות באשראי באמצעות ספק חיצוני RSVP",
    description: includedInPackage
      ? "כלול בחבילת מזמינים ומושיבים"
      : "תוספת מתנות באשראי באמצעות ספק חיצוני RSVP",
  };
}

function getPaymentProviderFromBody(body: any): "stripe" | "manual" {
  const payment = normalizeObject(body?.payment);
  const adminPaymentStatus = cleanString(body?.adminPaymentStatus).toLowerCase();
  const provider = cleanString(
    body?.paymentProvider || payment.provider || payment.method,
  ).toLowerCase();
  const status = cleanString(body?.status || payment.status).toLowerCase();

  if (
    adminPaymentStatus === "manual_paid" ||
    provider === "manual" ||
    status === "manual_paid"
  ) {
    return "manual";
  }

  return "stripe";
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
    commissionRate: Number(sale.commissionRate || COMMISSION_RATE),
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

function getNestedNumber(
  source: Record<string, unknown>,
  keys: string[],
  fallback = 0,
) {
  for (const key of keys) {
    const value = key
      .split(".")
      .reduce<unknown>((acc, part) => {
        if (!acc || typeof acc !== "object" || Array.isArray(acc)) return undefined;
        return (acc as Record<string, unknown>)[part];
      }, source);

    const parsed = toNumber(value);

    if (parsed > 0) return parsed;
  }

  return fallback;
}

function buildCustomerFileNotes({
  notes,
  eventName,
  saleId,
  employeeName,
  paymentMode,
  paymentProvider,
  eventDayAmount,
}: {
  notes: string;
  eventName: string;
  saleId: string;
  employeeName: string;
  paymentMode: PaymentMode;
  paymentProvider: "stripe" | "manual";
  eventDayAmount: number;
}) {
  const parts = [
    "נוצר אוטומטית ממכירה של עובד.",
    saleId ? `מספר מכירה: ${saleId}` : "",
    employeeName ? `עובד מטפל: ${employeeName}` : "",
    eventName ? `שם אירוע: ${eventName}` : "",
    `סוג תשלום: ${paymentProvider === "manual" ? "ידני" : "Stripe"}`,
    `אופן תשלום: ${paymentMode === "full" ? "תשלום מלא" : "תשלום מפוצל"}`,
    eventDayAmount > 0 ? `יתרה ליום האירוע: ${roundMoney(eventDayAmount)} ₪` : "",
    notes ? `הערות מכירה: ${notes}` : "",
  ].filter(Boolean);

  return parts.join("\n");
}

async function createCustomerFileFromEmployeeSale({
  body,
  createdUser,
  sale,
  required,
  clientName,
  clientEmail,
  clientPhone,
  customerIdNumber,
  clientAddress,
  eventDate,
  eventCity,
  venueName,
  packageName,
  plan,
  guests,
  hasCallsPackage,
  allowedMessageRounds,
  finalGrossAmount,
  originalGrossAmount,
  discountAmount,
  eventDayAmount,
  paymentMode,
  paymentProvider,
  isManualPaid,
  salesUpsells,
  upsells,
  notes,
  calculated,
}: {
  body: any;
  createdUser: any;
  sale: any;
  required: Awaited<ReturnType<typeof requireEmployee>> & { ok: true };
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  customerIdNumber: string;
  clientAddress: string;
  eventDate: Date | null;
  eventCity: string;
  venueName: string;
  packageName: string;
  plan: string;
  guests: number;
  hasCallsPackage: boolean;
  allowedMessageRounds: number;
  finalGrossAmount: number;
  originalGrossAmount: number;
  discountAmount: number;
  eventDayAmount: number;
  paymentMode: PaymentMode;
  paymentProvider: "stripe" | "manual";
  isManualPaid: boolean;
  salesUpsells: any;
  upsells: NormalizedUpsell[];
  notes: string;
  calculated: ReturnType<typeof calculateSale>;
}) {
  const customerFileFromBody = normalizeObject(body?.customerFile);
  const selectedPackage = normalizeObject(body?.selectedPackage);
  const totals = normalizeObject(body?.totals);
  const paymentSchedule = normalizeObject(
    body?.paymentSchedule || totals?.paymentSchedule,
  );

  const paidAmount = isManualPaid
    ? finalGrossAmount
    : roundMoney(
        getNestedNumber(customerFileFromBody, ["paidAmount"], 0) ||
          getNestedNumber(paymentSchedule, ["paidAmount"], 0),
      );

  const balance = roundMoney(Math.max(0, finalGrossAmount - paidAmount));

  const packageBasePrice = roundMoney(
    getNestedNumber(customerFileFromBody, ["packageBasePrice"], 0) ||
      getNestedNumber(selectedPackage, [
        "basePrice",
        "price",
        "finalPrice",
        "packagePrice",
      ], 0) ||
      getNestedNumber(totals, ["packagePrice", "basePackagePrice"], 0),
  );

  const packageTargetPriceWithCalls = roundMoney(
    getNestedNumber(customerFileFromBody, ["packageTargetPriceWithCalls"], 0) ||
      getNestedNumber(selectedPackage, [
        "targetPriceWithCalls",
        "packageTargetPriceWithCalls",
      ], 0),
  );

  const customerFilePayload = {
    userId: createdUser._id,

    fullName: clientName,
    email: clientEmail,
    phone: clientPhone,

    idNumber: customerIdNumber,
    address: clientAddress,

    eventDate,
    venueName,
    city: eventCity,

    packageName: packageName || plan,
    packageBasePrice,
    packageTargetPriceWithCalls,

    hasCallRounds: hasCallsPackage,
    allowedCallRounds: hasCallsPackage ? 3 : 0,

    totalPrice: finalGrossAmount,
    paidAmount,
    balance,

    status: isManualPaid ? "paid" : "lead",

    notes: buildCustomerFileNotes({
      notes,
      eventName: cleanString(body?.eventName),
      saleId: String(sale._id),
      employeeName: cleanString((required.currentUser as any).name),
      paymentMode,
      paymentProvider,
      eventDayAmount,
    }),

    source: "employee_sale",
    createdFrom: "employee_sale",
    employeeSaleId: sale._id,
    employeeId: required.employeeObjectId,

    records: guests,
    guests,
    originalGrossAmount,
    discountAmount,
    eventDayAmount,
    vatRate: calculated.vatRate,
    netAmount: calculated.netAmount,
    commissionRate: calculated.commissionRate,
    commissionAmount: calculated.commissionAmount,
    paymentMode,
    paymentProvider,
    salesUpsells,
    upsells,
    paymentSchedule,
    customerDealSummary: body?.customerDealSummary || null,
    signedAgreementToken: cleanString(body?.signedAgreementToken),
    agreementToken: cleanString(body?.agreementToken),
    quoteToken: cleanString(body?.quoteToken),
    allowedMessageRounds,
  };

  return CustomerFile.create(customerFilePayload);
}


async function requireEmployee(req: NextRequest) {
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

  const employeeObjectId = toObjectId(auth.userId);

  if (!employeeObjectId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "INVALID_EMPLOYEE_ID" },
        { status: 400 },
      ),
    };
  }

  const currentUser = await User.findById(employeeObjectId)
    .select("_id name email role staffType")
    .lean();

  if (!currentUser) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "EMPLOYEE_NOT_FOUND" },
        { status: 404 },
      ),
    };
  }

  if (!isEmployeeAllowed(currentUser, auth)) {
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
    employeeObjectId,
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

  const successUrl = `${baseUrl}/employee/sales?payment=success&saleId=${encodeURIComponent(
    saleId,
  )}&userId=${encodeURIComponent(userId)}`;

  const cancelUrl = `${baseUrl}/employee/sales/new?payment=cancelled&saleId=${encodeURIComponent(
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
   GET /api/employee/sales
   מחזיר לעובד רק את המכירות שלו
========================================================= */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const required = await requireEmployee(req);

    if (!required.ok) {
      return required.response;
    }

    const salesRaw = await EmployeeSale.find({
      employeeId: required.employeeObjectId,
    })
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
    console.error("EMPLOYEE SALES GET FAILED:", error);

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
   POST /api/employee/sales
   יוצר לקוח חדש + שומר מכירה לעובד המחובר + יוצר Stripe Checkout
========================================================= */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const required = await requireEmployee(req);

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

    const packageName = cleanString(body?.packageName);
    const plan = cleanString(body?.plan) || "premium";
    const userPlan = toUserPlan(plan);
    const guests = Math.max(0, Math.floor(toNumber(body?.guests || body?.records)));

    const payment = normalizeObject(body?.payment);
    const totals = normalizeObject(body?.totals);

    const paymentMode = normalizePaymentMode(
      body?.paymentMode || payment.mode || totals.paymentMode,
    );

    const finalGrossAmount = getFinalGrossAmountFromBody(body);
    const originalGrossAmount = getOriginalGrossAmountFromBody(
      body,
      finalGrossAmount,
    );
    const discountAmount = getDiscountAmountFromBody(body);
    const stripeAmount = getStripeAmountFromBody(body);
    const eventDayAmount = getEventDayAmountFromBody(body);

    const notes = cleanString(body?.notes);
    const upsells = getUpsellsArray(body);
    const allowedMessageRounds = getAllowedMessageRoundsFromUpsells(upsells);
    const salesUpsells = buildSalesUpsells(plan, upsells);
    const creditGiftsState = getCreditGiftsState(plan, salesUpsells);
    salesUpsells.creditGifts = creditGiftsState;

    const paymentProvider = getPaymentProviderFromBody(body);
    const isManualPaid = paymentProvider === "manual";

    const hasCallsPackage = planHasCalls(plan);
    const hasDigitalSeatingPackage = planHasDigitalSeating(plan);
    const hasSuppliersBudgetSystem = salesUpsells.suppliersBudgetSystem.enabled;
    const hasDigitalSeating = salesUpsells.digitalSeating.enabled;
    const hasCreditGifts = creditGiftsState.enabled;
    const hasVenueSeating = salesUpsells.venueSeating.enabled;
    const hasAlcoholManagement = salesUpsells.alcoholManagement.enabled;

    const activeAccessModules = buildAccessModules({
      includeDigitalSeating: hasDigitalSeating,
      includeEventManagement: hasSuppliersBudgetSystem,
    });

    const activePlanLimits = {
      maxGuests: guests,
      allowedMessageRounds,
      smsEnabled: true,
      smsLimit: guests,
      seatingEnabled: hasDigitalSeating,
      remindersEnabled: true,
      callsEnabled: hasCallsPackage,
    };

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

    const calculated = calculateSale(finalGrossAmount);

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

      // Stripe נפתח רק אחרי webhook. תשלום ידני נפתח מיידית.
      paidAmount: isManualPaid ? finalGrossAmount : 0,
      hasPaid: isManualPaid,
      isActive: isManualPaid,
      hasDashboardAccess: isManualPaid,

      eventDate,

      rsvpSiteMode,
      guestExperienceType,
      features: customerFeatures,

      includeCalls: isManualPaid ? hasCallsPackage : false,
      callsRounds: isManualPaid && hasCallsPackage ? 3 : 0,
      callsAddonPrice: 0,
      callsEnabledBy: isManualPaid && hasCallsPackage ? "manual" : null,
      callsEnabledAt: isManualPaid && hasCallsPackage ? new Date() : null,

      includeCreditGifts: isManualPaid ? hasCreditGifts : false,
      creditGiftsAddonPrice: creditGiftsState.price,
      creditGiftsEnabledBy: isManualPaid && hasCreditGifts ? "manual" : null,
      creditGiftsEnabledAt: isManualPaid && hasCreditGifts ? new Date() : null,

      includeDigitalSeating: isManualPaid ? hasDigitalSeating : false,
      includeEventManagement: isManualPaid ? hasSuppliersBudgetSystem : false,
      includeCustomDesign: false,

      selfManageEnabled: isManualPaid ? hasSuppliersBudgetSystem : false,
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
          enabled: isManualPaid ? hasDigitalSeating : false,
          price: salesUpsells.digitalSeating.price,
        },
        creditGifts: {
          ...creditGiftsState,
          enabled: isManualPaid ? hasCreditGifts : false,
        },
        venueSeating: {
          enabled: isManualPaid ? hasVenueSeating : false,
          staffCount: salesUpsells.venueSeating.staffCount,
          totalPrice: salesUpsells.venueSeating.totalPrice,
        },
        personalRepresentative: {
          enabled: isManualPaid ? salesUpsells.personalRepresentative.enabled : false,
          price: salesUpsells.personalRepresentative.price,
        },
        thirdRsvpRound: {
          enabled: isManualPaid ? salesUpsells.thirdRsvpRound.enabled : false,
          price: salesUpsells.thirdRsvpRound.price,
        },
        suppliersBudgetSystem: {
          enabled: isManualPaid ? salesUpsells.suppliersBudgetSystem.enabled : false,
          price: salesUpsells.suppliersBudgetSystem.price,
          givenFree: salesUpsells.suppliersBudgetSystem.givenFree,
        },
        alcoholManagement: {
          enabled: isManualPaid ? hasAlcoholManagement : false,
          staffCount: salesUpsells.alcoholManagement.staffCount,
          totalPrice: salesUpsells.alcoholManagement.totalPrice,
        },
      },

      accessModules: isManualPaid ? activeAccessModules : buildPendingAccessModules(),

      planLimits: isManualPaid
        ? activePlanLimits
        : {
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

      createdByAdmin: false,
      billingSource: isManualPaid ? "manual" : "pricing",
      paymentMode,
      paymentProvider,
      paidAt: isManualPaid ? new Date() : null,
      lastPaymentAt: isManualPaid ? new Date() : null,
      manualPaidAt: isManualPaid ? new Date() : null,
      manualPaymentReference: cleanString(body?.manualPaymentReference),
      manualPaymentNote: cleanString(body?.manualPaymentNote),
      totalDealAmount: isManualPaid ? finalGrossAmount : 0,
      remainingAmount: 0,
      payments: isManualPaid
        ? [
            {
              amount: finalGrossAmount,
              type: paymentMode === "split" ? "deposit" : "full",
              method: "manual",
              status: "paid",
              paidAt: new Date(),
              createdAt: new Date(),
              note: "מכירה ידנית מעובד",
              createdBy: required.employeeObjectId || null,
            },
          ]
        : [],
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
      stripeAmount: isManualPaid ? 0 : stripeAmount,
      eventDayAmount,
      paymentMode,
      paymentProvider,

      selectedPackage: body?.selectedPackage || null,
      upsells,
      salesUpsells,
      activationSnapshot: {
        plan,
        packageName: packageName || plan,
        guests,
        allowedMessageRounds,
        hasCallsPackage,
        hasDigitalSeatingPackage,
        hasDigitalSeating,
        hasCreditGifts,
        hasVenueSeating,
        hasSuppliersBudgetSystem,
        hasAlcoholManagement,
        salesUpsells,
      },
      quote: body?.quote || null,
      totals: body?.totals || null,
      customerDealSummary: body?.customerDealSummary || null,
      cancellationTerms: Array.isArray(body?.cancellationTerms)
        ? body.cancellationTerms
        : [],
      paymentTerms: Array.isArray(body?.paymentTerms) ? body.paymentTerms : [],
      paymentSchedule: body?.paymentSchedule || null,

      saleCompliance: body?.saleCompliance || null,

      status: isManualPaid ? "paid" : "pending",
      source: isManualPaid ? "manual" : "employee_sales_page",
      notes,
    });

    const customerFile = await createCustomerFileFromEmployeeSale({
      body,
      createdUser,
      sale,
      required,
      clientName,
      clientEmail,
      clientPhone,
      customerIdNumber,
      clientAddress,
      eventDate,
      eventCity,
      venueName,
      packageName: packageName || plan,
      plan,
      guests,
      hasCallsPackage,
      allowedMessageRounds,
      finalGrossAmount,
      originalGrossAmount,
      discountAmount,
      eventDayAmount,
      paymentMode,
      paymentProvider,
      isManualPaid,
      salesUpsells,
      upsells,
      notes,
      calculated,
    });

    if (isManualPaid) {
      const paidAt = new Date();

      sale.set?.("paidAt", paidAt);
      sale.set?.("payment.method", "manual");
      sale.set?.("payment.provider", "manual");
      sale.set?.("payment.status", "paid");
      sale.set?.("payment.mode", paymentMode);
      sale.set?.("payment.amount", finalGrossAmount);
      sale.set?.("payment.originalAmount", originalGrossAmount);
      sale.set?.("payment.discountAmount", discountAmount);
      sale.set?.("payment.immediateAmount", finalGrossAmount);
      sale.set?.("payment.stripeAmount", 0);
      sale.set?.("payment.eventDayAmount", eventDayAmount);
      sale.set?.("payment.paidAt", paidAt);
      sale.set?.("payment.manualPaymentReference", cleanString(body?.manualPaymentReference));
      sale.set?.("payment.manualPaymentNote", cleanString(body?.manualPaymentNote));
      sale.set?.("salesUpsells.creditGifts", {
        ...creditGiftsState,
        enabled: hasCreditGifts,
      });
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
          customerFileId: String(customerFile._id),
          checkoutUrl: "",
          stripeCheckoutUrl: "",
          checkoutSessionId: "",
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
            : null,
          payment: {
            provider: "manual",
            mode: paymentMode,
            stripeAmount: 0,
            finalGrossAmount,
            originalGrossAmount,
            discountAmount,
            eventDayAmount,
            status: "paid",
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
          pendingPaymentAmount: stripeAmount,
          pendingGrossAmount: finalGrossAmount,
          pendingEventDayAmount: eventDayAmount,
          paymentMode,
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
        saleId: String(sale._id),
        customerFileId: String(customerFile._id),
        checkoutUrl: checkout.checkoutUrl,
        stripeCheckoutUrl: checkout.checkoutUrl,
        checkoutSessionId: checkout.checkoutSessionId,
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
          : null,
        payment: {
          provider: "stripe",
          mode: paymentMode,
          stripeAmount,
          finalGrossAmount,
          originalGrossAmount,
          discountAmount,
          eventDayAmount,
        },
        sale: serializeSale(sale),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("EMPLOYEE SALES POST FAILED:", error);

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