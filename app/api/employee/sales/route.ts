import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import EmployeeSale from "@/models/EmployeeSale";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";

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

function getStripeAmountFromBody(body: any) {
  const payment = normalizeObject(body?.payment);
  const totals = normalizeObject(body?.totals);
  const paymentSchedule =
    normalizeObject(body?.paymentSchedule).stripeAmount ||
    normalizeObject(totals?.paymentSchedule);

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

    guests: Number(sale.guests || 0),

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
    stripeCheckoutSessionId: sale.stripeCheckoutSessionId || "",
    stripeCheckoutUrl: sale.stripeCheckoutUrl || "",

    source: sale.source || "employee_sales_page",
    notes: sale.notes || "",

    createdAt: sale.createdAt || null,
    updatedAt: sale.updatedAt || null,
  };
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

    const eligibleSales = sales.filter(
      (sale) => sale.status !== "cancelled" && sale.status !== "refunded",
    );

    const summary = eligibleSales.reduce(
      (acc, sale) => {
        acc.totalSales += 1;
        acc.grossTotal += Number(sale.grossAmount || 0);
        acc.netTotal += Number(sale.netAmount || 0);
        acc.commissionTotal += Number(sale.commissionAmount || 0);

        if (sale.status === "paid") acc.paidSales += 1;
        if (sale.status === "pending") acc.pendingSales += 1;

        return acc;
      },
      {
        totalSales: 0,
        paidSales: 0,
        pendingSales: 0,
        grossTotal: 0,
        netTotal: 0,
        commissionTotal: 0,
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

    const packageName = cleanString(body?.packageName);
    const plan = cleanString(body?.plan) || "premium";
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

    if (stripeAmount <= 0) {
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

      plan,
      priceKey: plan,
      packageName: packageName || plan,

      guests,
      maxGuests: guests,

      // תשלום רק Stripe — לכן עד שה-Stripe חוזר כ-paid, זה נשאר לא משולם
      paidAmount: 0,
      hasPaid: false,
      isActive: true,

      eventDate,

      includeCalls: Boolean(
        plan === "smart" ||
          plan === "seating" ||
          (Array.isArray(body?.upsells) &&
            body.upsells.some((upsell: any) =>
              cleanString(upsell?.key).includes("call"),
            )),
      ),
      callsRounds: plan === "smart" || plan === "seating" ? 3 : 0,
      callsAddonPrice: 0,

      includeCreditGifts: false,
      creditGiftsAddonPrice: 0,

      includeDigitalSeating:
        plan === "seating" ||
        (Array.isArray(body?.upsells) &&
          body.upsells.some(
            (upsell: any) => cleanString(upsell?.key) === "digitalSeating",
          )),
      includeEventManagement:
        Array.isArray(body?.upsells) &&
        body.upsells.some(
          (upsell: any) => cleanString(upsell?.key) === "suppliersBudgetSystem",
        ),
      includeCustomDesign: false,

      selfManageEnabled: true,
      customDesignEnabled: false,

      smsPerRecord: 1,
      smsLimit: guests,
      maxMessages: guests,

      smsBalance: 0,
      smsUsed: 0,
      testSmsUsed: 0,

      whatsappBalance: 0,
      whatsappUsed: 0,

      allowedMessageRounds:
        Array.isArray(body?.upsells) &&
        body.upsells.some(
          (upsell: any) => cleanString(upsell?.key) === "thirdRsvpRound",
        )
          ? 3
          : 2,

      planLimits: {
        maxGuests: guests,
        allowedMessageRounds:
          Array.isArray(body?.upsells) &&
          body.upsells.some(
            (upsell: any) => cleanString(upsell?.key) === "thirdRsvpRound",
          )
            ? 3
            : 2,
        smsEnabled: true,
        smsLimit: guests,
        seatingEnabled:
          plan === "seating" ||
          (Array.isArray(body?.upsells) &&
            body.upsells.some(
              (upsell: any) => cleanString(upsell?.key) === "digitalSeating",
            )),
        remindersEnabled: true,
        callsEnabled: plan === "smart" || plan === "seating",
      },

      isTrial: false,
      needsPasswordSetup: true,

      createdByAdmin: false,
      billingSource: "stripe",
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
      paymentProvider: "stripe",

      selectedPackage: body?.selectedPackage || null,
      upsells: Array.isArray(body?.upsells) ? body.upsells : [],
      quote: body?.quote || null,
      totals: body?.totals || null,
      customerDealSummary: body?.customerDealSummary || null,
      cancellationTerms: Array.isArray(body?.cancellationTerms)
        ? body.cancellationTerms
        : [],
      paymentTerms: Array.isArray(body?.paymentTerms) ? body.paymentTerms : [],
      paymentSchedule: body?.paymentSchedule || null,

      saleCompliance: body?.saleCompliance || null,

      // תשלום רק Stripe
      status: "pending",
      source: "employee_client_create",
      notes,
    });

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
          billingSource: "stripe",
        },
      },
    );

    try {
      await sendPasswordSetupMail(String(createdUser._id));
    } catch (mailError) {
      console.error("SEND PASSWORD SETUP MAIL FAILED:", mailError);
    }

    return NextResponse.json(
      {
        success: true,
        userId: String(createdUser._id),
        saleId: String(sale._id),
        checkoutUrl: checkout.checkoutUrl,
        stripeCheckoutUrl: checkout.checkoutUrl,
        checkoutSessionId: checkout.checkoutSessionId,
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