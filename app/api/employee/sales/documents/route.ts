import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import db from "@/lib/db";
import SalesDocument from "@/models/SalesDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTE_VALIDITY_DAYS = 4;
const DEFAULT_VAT_RATE = 0.18;

const CREDIT_GIFTS_INCLUDED_TEXT =
  "פתיחת אפשרות מתנות באשראי דרך ספק חיצוני, כחלק מהחבילה וללא תוספת תשלום.";

type SalesDocumentType = "quote" | "agreement";
type PaymentMode = "full" | "split";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateInput(value: unknown) {
  const str = cleanStr(value);

  if (!str) return null;

  const parts = str.split("-").map((part) => Number(part));

  if (
    parts.length === 3 &&
    Number.isFinite(parts[0]) &&
    Number.isFinite(parts[1]) &&
    Number.isFinite(parts[2])
  ) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  const date = new Date(str);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      message,
      details,
    },
    { status },
  );
}

function getClientIp(req: NextRequest) {
  const forwardedFor = cleanStr(req.headers.get("x-forwarded-for"));

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "";
  }

  return (
    cleanStr(req.headers.get("x-real-ip")) ||
    cleanStr(req.headers.get("cf-connecting-ip")) ||
    ""
  );
}

function getBaseUrl(req: NextRequest) {
  const fromEnv =
    cleanStr(process.env.NEXT_PUBLIC_APP_URL) ||
    cleanStr(process.env.NEXT_PUBLIC_SITE_URL) ||
    cleanStr(process.env.NEXTAUTH_URL) ||
    cleanStr(process.env.APP_URL);

  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  return req.nextUrl.origin.replace(/\/+$/, "");
}

function normalizePaymentMode(value: unknown): PaymentMode {
  const mode = cleanStr(value);

  if (mode === "full") return "full";
  return "split";
}

function normalizeArrayOfStrings(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map(cleanStr).filter(Boolean);
}

function normalizePackageIncludes(selectedPackage: Record<string, unknown>) {
  const includes = normalizeArrayOfStrings(selectedPackage.includes);
  const packageKey = cleanStr(selectedPackage.key).toLowerCase();

  if (
    (packageKey === "seating" || packageKey === "plan3") &&
    !includes.some((item) => item.includes("מתנות באשראי"))
  ) {
    return [...includes, CREDIT_GIFTS_INCLUDED_TEXT];
  }

  return includes;
}

function normalizeArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function buildQuoteDates(quote: Record<string, unknown>) {
  const today = new Date();

  const createdAt =
    cleanStr(quote.createdAt) ||
    cleanStr(quote.createdDate) ||
    toDateInputValue(today);

  const createdDate = parseDateInput(createdAt) || today;

  const expiresAt =
    cleanStr(quote.expiresAt) ||
    cleanStr(quote.expiredAt) ||
    toDateInputValue(addDays(createdDate, QUOTE_VALIDITY_DAYS));

  const validityDays = asNumber(quote.validityDays, QUOTE_VALIDITY_DAYS);

  return {
    createdAt,
    expiresAt,
    validityDays,
  };
}

function buildPaymentAmounts({
  totals,
  paymentSchedule,
}: {
  totals: Record<string, unknown>;
  paymentSchedule: Record<string, unknown>;
}) {
  const paymentMode = normalizePaymentMode(
    totals.paymentMode || paymentSchedule.paymentMode,
  );

  const vatRate = asNumber(totals.vatRate, DEFAULT_VAT_RATE);

  const fullPaymentDiscount =
    asNumber(totals.fullPaymentDiscount) ||
    asNumber(totals.discountAmount) ||
    asNumber(paymentSchedule.fullPaymentDiscount);

  const discountAmount =
    asNumber(totals.discountAmount) ||
    asNumber(totals.fullPaymentDiscount) ||
    asNumber(paymentSchedule.fullPaymentDiscount);

  const grossAmountFromBody = asNumber(totals.grossAmount);
  const grossAmountAfterDiscount =
    asNumber(totals.grossAmountAfterDiscount) ||
    asNumber(paymentSchedule.grossAmountAfterDiscount) ||
    grossAmountFromBody;

  const grossAmountBeforeDiscount =
    asNumber(totals.grossAmountBeforeDiscount) ||
    asNumber(paymentSchedule.grossAmountBeforeDiscount) ||
    roundMoney(grossAmountAfterDiscount + discountAmount);

  const immediateTotal =
    asNumber(paymentSchedule.immediateTotal) ||
    asNumber(totals.immediateTotal) ||
    grossAmountAfterDiscount;

  const eventDayTotal =
    asNumber(paymentSchedule.eventDayTotal) || asNumber(totals.eventDayTotal);

  const stripeAmount =
    asNumber(totals.stripeAmount) ||
    asNumber(paymentSchedule.stripeAmount) ||
    immediateTotal;

  const netAmount =
    asNumber(totals.netAmount) ||
    roundMoney(grossAmountAfterDiscount / (1 + vatRate));

  return {
    grossAmount: grossAmountAfterDiscount,
    grossAmountBeforeDiscount,
    grossAmountAfterDiscount,
    discountAmount,
    fullPaymentDiscount,
    netAmount,
    vatRate,
    paymentMode,
    stripeAmount,
    paymentSchedule: {
      ...paymentSchedule,
      immediateTotal,
      eventDayTotal,
      stripeAmount,
      fullPaymentDiscount,
      grossAmountBeforeDiscount,
      grossAmountAfterDiscount,
    },
  };
}

async function createUniqueToken() {
  for (let index = 0; index < 8; index += 1) {
    const token = crypto.randomBytes(18).toString("base64url");
    const exists = await SalesDocument.exists({ token });

    if (!exists) return token;
  }

  return `${Date.now().toString(36)}-${crypto
    .randomBytes(10)
    .toString("base64url")}`;
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("בקשה לא תקינה", 400);
    }

    const payload = body as Record<string, unknown>;

    const type = cleanStr(payload.type) as SalesDocumentType;

    if (type !== "quote" && type !== "agreement") {
      return jsonError("סוג מסמך לא תקין", 400);
    }

    const client = normalizeObject(payload.client);
    const event = normalizeObject(payload.event);
    const quote = normalizeObject(payload.quote);
    const selectedPackage = normalizeObject(payload.selectedPackage);
    const totals = normalizeObject(payload.totals);
    const paymentScheduleFromBody = normalizeObject(totals.paymentSchedule);

    const clientFullName = cleanStr(client.fullName);
    const clientPhone = cleanStr(client.phone);
    const clientEmail = cleanStr(client.email);
    const clientIdNumber = cleanStr(client.idNumber);
    const clientAddress = cleanStr(client.address);

    const eventName = cleanStr(event.name);
    const eventDate = cleanStr(event.date);
    const eventCity = cleanStr(event.city);
    const venueName = cleanStr(event.venueName);

    if (!clientFullName) return jsonError("חסר שם לקוח", 400);
    if (!clientPhone) return jsonError("חסר טלפון לקוח", 400);
    if (!eventDate) return jsonError("חסר תאריך אירוע", 400);
    if (!eventCity) return jsonError("חסרה עיר אירוע", 400);
    if (!venueName) return jsonError("חסר שם אולם", 400);

    const quoteDates = buildQuoteDates(quote);

    const paymentAmounts = buildPaymentAmounts({
      totals,
      paymentSchedule: paymentScheduleFromBody,
    });

    if (paymentAmounts.grossAmountAfterDiscount <= 0) {
      return jsonError("סכום העסקה לא תקין", 400);
    }

    if (paymentAmounts.stripeAmount <= 0) {
      return jsonError("סכום Stripe לתשלום עכשיו לא תקין", 400);
    }

    const token = await createUniqueToken();
    const baseUrl = getBaseUrl(req);
    const url = `${baseUrl}/sales-documents/${token}`;

    const userAgent = cleanStr(req.headers.get("user-agent"));
    const ip = getClientIp(req);

    const selectedPackageIncludes = normalizePackageIncludes(selectedPackage);

    const selectedPackagePrice = asNumber(selectedPackage.price);
    const selectedPackageRecords = asNumber(selectedPackage.records);

    const document = await SalesDocument.create({
      type,
      token,
      url,
      status: "draft",

      client: {
        fullName: clientFullName,
        idNumber: clientIdNumber,
        email: clientEmail,
        phone: clientPhone,
        address: clientAddress,
      },

      event: {
        name: eventName,
        date: eventDate,
        city: eventCity,
        venueName,
      },

      quote: {
        createdAt: quoteDates.createdAt,
        expiresAt: quoteDates.expiresAt,
        validityDays: quoteDates.validityDays,
      },

      agreement: {
        signatureFullName: "",
        signatureIdNumber: "",
        signatureAddress: "",
        signaturePhone: "",
        signatureDate: "",
        signatureText: "",
        signatureDataUrl: "",
        acceptedTerms: false,
        signedAt: null,
      },

      selectedPackage: {
        key: cleanStr(selectedPackage.key),
        title: cleanStr(selectedPackage.title),
        customerSummary: cleanStr(selectedPackage.customerSummary),
        includes: selectedPackageIncludes,
        records: selectedPackageRecords,
        price: selectedPackagePrice,
      },

      upsells: normalizeArray(payload.upsells),

      totals: {
        grossAmount: paymentAmounts.grossAmount,
        grossAmountBeforeDiscount: paymentAmounts.grossAmountBeforeDiscount,
        grossAmountAfterDiscount: paymentAmounts.grossAmountAfterDiscount,
        discountAmount: paymentAmounts.discountAmount,
        fullPaymentDiscount: paymentAmounts.fullPaymentDiscount,
        netAmount: paymentAmounts.netAmount,
        vatRate: paymentAmounts.vatRate,
        paymentMode: paymentAmounts.paymentMode,
        stripeAmount: paymentAmounts.stripeAmount,
        paymentSchedule: paymentAmounts.paymentSchedule,
      },

      customerDealSummary: normalizeObject(payload.customerDealSummary),

      cancellationTerms: normalizeArray(payload.cancellationTerms),

      paymentTerms: normalizeArray(payload.paymentTerms),

      signature: {
        fullName: "",
        idNumber: "",
        address: "",
        phone: "",
        date: "",
        signatureText: "",
        signatureDataUrl: "",
        acceptedTerms: false,
        signedAt: null,
        ip: "",
        userAgent: "",
        signedIp: "",
        signedUserAgent: "",
      },

      sms: {
        sentAt: null,
        lastTriedAt: null,
        sentTo: "",
        normalizedSentTo: "",
        provider: "",
        parts: 0,
        message: "",
        response: "",
        lastError: "",
      },

      stripe: {
        checkoutUrl: "",
        checkoutSessionId: "",
        amount: paymentAmounts.stripeAmount,
        status: "",
        lastError: "",
      },

      audit: {
        createdIp: ip,
        createdUserAgent: userAgent,
        viewedAt: null,
        viewedIp: "",
        viewedUserAgent: "",
        signedAt: null,
        signedIp: "",
        signedUserAgent: "",
      },

      viewedAt: null,
      viewedIp: "",
      viewedUserAgent: "",

      signedAt: null,

      createdByUserId: null,
    });

    return NextResponse.json({
      success: true,
      message:
        type === "quote"
          ? "הצעת המחיר נוצרה בהצלחה"
          : "הסכם תנאי העסקה נוצר בהצלחה",
      documentId: String(document._id),
      token,
      url,
      documentUrl: url,
      type,
      status: document.status,
      quote: {
        createdAt: quoteDates.createdAt,
        expiresAt: quoteDates.expiresAt,
        validityDays: quoteDates.validityDays,
      },
      totals: {
        grossAmount: paymentAmounts.grossAmount,
        grossAmountBeforeDiscount: paymentAmounts.grossAmountBeforeDiscount,
        grossAmountAfterDiscount: paymentAmounts.grossAmountAfterDiscount,
        discountAmount: paymentAmounts.discountAmount,
        fullPaymentDiscount: paymentAmounts.fullPaymentDiscount,
        netAmount: paymentAmounts.netAmount,
        vatRate: paymentAmounts.vatRate,
        paymentMode: paymentAmounts.paymentMode,
        stripeAmount: paymentAmounts.stripeAmount,
        paymentSchedule: paymentAmounts.paymentSchedule,
      },
      expiresAt: quoteDates.expiresAt,
    });
  } catch (error) {
    console.error("CREATE SALES DOCUMENT FAILED:", error);

    return jsonError(
      error instanceof Error ? error.message : "שגיאה ביצירת קישור למסמך",
      500,
    );
  }
}