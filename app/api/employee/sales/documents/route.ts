import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";

import db from "@/lib/db";
import SalesDocument from "@/models/SalesDocument";
import CustomerFile from "@/models/CustomerFile";
import CustomerQuote from "@/models/CustomerQuote";
import CustomerAgreement from "@/models/CustomerAgreement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTE_VALIDITY_DAYS = 4;
const DEFAULT_VAT_RATE = 0.18;

const CREDIT_GIFTS_INCLUDED_TEXT =
  "פתיחת אפשרות מתנות באשראי דרך ספק חיצוני, כחלק מהחבילה וללא תוספת תשלום.";

type SalesDocumentType = "quote" | "agreement";
type PaymentMode = "full" | "split";

const SMART_PACKAGE_TIERS = [
  { maxRecords: 50, price: 149 },
  { maxRecords: 100, price: 249 },
  { maxRecords: 150, price: 349 },
  { maxRecords: 200, price: 449 },
  { maxRecords: 250, price: 549 },
  { maxRecords: 300, price: 649 },
  { maxRecords: 350, price: 749 },
  { maxRecords: 400, price: 849 },
  { maxRecords: 450, price: 949 },
  { maxRecords: 500, price: 1049 },
  { maxRecords: 550, price: 1149 },
  { maxRecords: 600, price: 1249 },
  { maxRecords: 650, price: 1349 },
  { maxRecords: 700, price: 1449 },
  { maxRecords: 750, price: 1549 },
  { maxRecords: 800, price: 1649 },
  { maxRecords: 850, price: 1749 },
  { maxRecords: 900, price: 1849 },
  { maxRecords: 950, price: 1949 },
  { maxRecords: 1000, price: 2049 },
];

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return cleanStr(value).toLowerCase();
}

function normalizePhone(value: unknown) {
  let digits = cleanStr(value).replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("972")) {
    digits = `0${digits.slice(3)}`;
  } else if (digits.startsWith("00") && digits.slice(2).startsWith("972")) {
    digits = `0${digits.slice(5)}`;
  }

  return digits;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createPhoneMatchRegex(phone: string) {
  const digits = normalizePhone(phone);

  if (!digits) return null;

  const pattern = digits.split("").join("\\D*");

  return new RegExp(`^\\D*${pattern}\\D*$`, "i");
}

function createInternationalPhoneMatchRegex(phone: string) {
  const localPhone = normalizePhone(phone);

  if (!localPhone) return null;

  const internationalPhone = localPhone.startsWith("0")
    ? `972${localPhone.slice(1)}`
    : localPhone;

  const pattern = internationalPhone.split("").join("\\D*");

  return new RegExp(`^\\D*\\+?${pattern}\\D*$`, "i");
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

function clampRecords(value: unknown) {
  const parsed = Math.floor(asNumber(value));
  if (parsed <= 0) return 1;
  if (parsed > 1000) return 1000;
  return parsed;
}

function calculateSmartPackagePrice(records: unknown) {
  const safeRecords = clampRecords(records);
  const tier =
    SMART_PACKAGE_TIERS.find((item) => safeRecords <= item.maxRecords) ||
    SMART_PACKAGE_TIERS[SMART_PACKAGE_TIERS.length - 1];

  const pricePerRecord = tier.price / tier.maxRecords;

  return roundMoney(pricePerRecord * safeRecords);
}

function hasCallsIncluded(packageKey: string) {
  const normalized = packageKey.toLowerCase();

  return (
    normalized === "smart" ||
    normalized === "seating" ||
    normalized === "plan2" ||
    normalized === "plan3"
  );
}

function buildQuoteItems({
  selectedPackage,
  upsells,
}: {
  selectedPackage: Record<string, unknown>;
  upsells: unknown[];
}) {
  const items: {
    title: string;
    description: string;
    price: number;
  }[] = [];

  const packageTitle = cleanStr(selectedPackage.title) || "חבילה";
  const packageSummary = cleanStr(selectedPackage.customerSummary);
  const packagePrice = asNumber(selectedPackage.price);

  items.push({
    title: packageTitle,
    description: packageSummary,
    price: packagePrice,
  });

  upsells.forEach((upsell) => {
    const item = normalizeObject(upsell);
    const title = cleanStr(item.title);
    const description = cleanStr(item.description);
    const price =
      asNumber(item.price, NaN) ||
      asNumber(item.finalPrice, NaN) ||
      asNumber(item.amount, 0);

    if (!title) return;

    items.push({
      title,
      description,
      price: Number.isFinite(price) ? price : 0,
    });
  });

  return items;
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

async function findExistingCustomerFile({
  customerFileId,
  clientEmail,
  clientPhone,
}: {
  customerFileId: string;
  clientEmail: string;
  clientPhone: string;
}) {
  if (customerFileId && mongoose.Types.ObjectId.isValid(customerFileId)) {
    const byId = await CustomerFile.findById(customerFileId);

    if (byId) {
      return byId;
    }
  }

  const orConditions: Record<string, unknown>[] = [];

  if (clientEmail) {
    orConditions.push({ email: clientEmail });
  }

  const localPhoneRegex = createPhoneMatchRegex(clientPhone);
  const internationalPhoneRegex =
    createInternationalPhoneMatchRegex(clientPhone);

  if (localPhoneRegex) {
    orConditions.push({ phone: localPhoneRegex });
  }

  if (internationalPhoneRegex) {
    orConditions.push({ phone: internationalPhoneRegex });
  }

  if (clientPhone) {
    orConditions.push({ phone: clientPhone });
  }

  if (orConditions.length === 0) {
    return null;
  }

  return CustomerFile.findOne({ $or: orConditions }).sort({ updatedAt: -1 });
}

async function upsertCustomerFile({
  type,
  customerFileId,
  clientFullName,
  clientPhone,
  clientEmail,
  eventDate,
  eventCity,
  venueName,
  selectedPackage,
  paymentAmounts,
  documentToken,
}: {
  type: SalesDocumentType;
  customerFileId: string;
  clientFullName: string;
  clientPhone: string;
  clientEmail: string;
  eventDate: string;
  eventCity: string;
  venueName: string;
  selectedPackage: Record<string, unknown>;
  paymentAmounts: ReturnType<typeof buildPaymentAmounts>;
  documentToken: string;
}) {
  const packageKey = cleanStr(selectedPackage.key);
  const packageTitle = cleanStr(selectedPackage.title);
  const selectedPackagePrice = asNumber(selectedPackage.price);
  const selectedPackageRecords = asNumber(selectedPackage.records);

  const currentDealTotal = roundMoney(paymentAmounts.grossAmountAfterDiscount);

  const smartPackagePrice = calculateSmartPackagePrice(selectedPackageRecords);

  const upgradeDeltaToCalls = hasCallsIncluded(packageKey)
    ? 0
    : Math.max(0, roundMoney(smartPackagePrice - selectedPackagePrice));

  const targetPriceWithCalls = roundMoney(currentDealTotal + upgradeDeltaToCalls);

  const tokenFields =
    type === "quote"
      ? {
          quoteToken: documentToken,
          salesDocumentToken: documentToken,
        }
      : {
          agreementToken: documentToken,
          salesDocumentToken: documentToken,
        };

  const updateFields: Record<string, unknown> = {
    fullName: clientFullName,
    email: clientEmail,
    phone: clientPhone,

    eventDate: parseDateInput(eventDate) || undefined,
    venueName,
    city: eventCity,

    packageName: packageTitle,
    packageBasePrice: currentDealTotal,
    packageTargetPriceWithCalls: targetPriceWithCalls,

    hasCallRounds: hasCallsIncluded(packageKey),
    allowedCallRounds: hasCallsIncluded(packageKey) ? 3 : 0,

    totalPrice: currentDealTotal,
    paidAmount: 0,
    balance: currentDealTotal,

    leadStatus: "quote_sent",
    ...tokenFields,
  };

  const existingCustomer = await findExistingCustomerFile({
    customerFileId,
    clientEmail,
    clientPhone,
  });

  if (existingCustomer) {
    const currentStatus = cleanStr((existingCustomer as any).status);
    const shouldMarkQuoteSent =
      !currentStatus ||
      currentStatus === "lead" ||
      currentStatus === "quote_sent";

    if (shouldMarkQuoteSent) {
      updateFields.status = "quote_sent";
    }

    existingCustomer.set(updateFields);
    await existingCustomer.save();
    return existingCustomer;
  }

  return CustomerFile.create({
    ...updateFields,
    status: "quote_sent",
    notes: "",
    assignedStaffIds: [],
    source: "sales_document",
  });
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
    const clientPhone = normalizePhone(client.phone) || cleanStr(client.phone);
    const clientEmail = normalizeEmail(client.email);
    const clientIdNumber = cleanStr(client.idNumber);
    const clientAddress = cleanStr(client.address);
    const requestedCustomerFileId = cleanStr(
      payload.customerFileId ||
        payload.customerId ||
        payload.leadId ||
        normalizeObject(payload.customerFile)._id ||
        normalizeObject(payload.customer)._id
    );

    const eventName = cleanStr(event.name);
    const eventDate = cleanStr(event.date);
    const eventCity = cleanStr(event.city);
    const venueName = cleanStr(event.venueName);

    if (!clientFullName) return jsonError("חסר שם לקוח", 400);
    if (!clientPhone) return jsonError("חסר טלפון לקוח", 400);

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

    const upsells = normalizeArray(payload.upsells);

    const customerFile = await upsertCustomerFile({
      type,
      customerFileId: requestedCustomerFileId,
      clientFullName,
      clientPhone,
      clientEmail,
      eventDate,
      eventCity,
      venueName,
      selectedPackage,
      paymentAmounts,
      documentToken: token,
    });

    const customerFileId = String((customerFile as any)._id);

    const document = await SalesDocument.create({
      type,
      token,
      url,
      status: "draft",
      customerFileId,

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

      upsells,

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

      additionalTerms: normalizeArray(payload.additionalTerms),

      engagementTerms: normalizeArray(payload.engagementTerms),

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

    const documentId = String((document as any)._id);

    let customerQuoteId = "";
    let customerAgreementId = "";

    if (type === "quote") {
      const quoteItems = buildQuoteItems({
        selectedPackage,
        upsells,
      });

      const customerQuote = await CustomerQuote.create({
        customerFileId,
        quoteNumber: `Q-${documentId.slice(-6).toUpperCase()}`,
        items: quoteItems,
        total: paymentAmounts.grossAmountAfterDiscount,
        validUntil: parseDateInput(quoteDates.expiresAt),
        status: "draft",
        publicToken: token,
        salesDocumentId: documentId,
      });

      customerQuoteId = String((customerQuote as any)._id);
    }

    if (type === "agreement") {
      const customerAgreement = await CustomerAgreement.create({
        customerFileId,
        title: "הסכם שירותים",
        amount: paymentAmounts.grossAmountAfterDiscount,
        status: "draft",

        signedAt: null,
        signerName: clientFullName,
        signerIdNumber: clientIdNumber,
        signerEmail: clientEmail,
        signerPhone: clientPhone,

        signatureText: "",
        signatureImageUrl: "",

        ipAddress: "",

        publicToken: token,
        pdfUrl: "",
        salesDocumentId: documentId,
      });

      customerAgreementId = String((customerAgreement as any)._id);
    }

    return NextResponse.json({
      success: true,
      message:
        type === "quote"
          ? "הצעת המחיר נוצרה בהצלחה"
          : "הסכם תנאי העסקה נוצר בהצלחה",

      documentId,
      customerFileId,
      customerQuoteId,
      customerAgreementId,

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