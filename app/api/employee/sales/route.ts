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

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function isEmployeeAllowed(user: any, auth: any) {
  const role = cleanString(user?.role || auth?.role).toLowerCase();
  const staffType = cleanString(user?.staffType || auth?.staffType).toLowerCase();

  return (
    role === "staff" ||
    role === "employee" ||
    role === "admin" ||
    staffType === "producer_staff" ||
    staffType === "general_staff"
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
    vatRate: Number(sale.vatRate || VAT_RATE),
    netAmount: Number(sale.netAmount || 0),
    commissionRate: Number(sale.commissionRate || COMMISSION_RATE),
    commissionAmount: Number(sale.commissionAmount || 0),

    status: sale.status || "paid",
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
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/* =========================================================
   POST /api/employee/sales
   יוצר לקוח חדש + שומר מכירה לעובד המחובר
========================================================= */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const required = await requireEmployee(req);

    if (!required.ok) {
      return required.response;
    }

    const body = await req.json().catch(() => null);

    const clientName = cleanString(body?.clientName || body?.name);
    const clientEmail = normalizeEmail(body?.clientEmail || body?.email);
    const clientPhone = cleanString(body?.clientPhone || body?.phone);

    const eventName = cleanString(body?.eventName);
    const eventDateRaw = cleanString(body?.eventDate);
    const packageName = cleanString(body?.packageName);
    const plan = cleanString(body?.plan) || "premium";
    const guests = Math.max(0, Math.floor(toNumber(body?.guests)));
    const grossAmountRaw = toNumber(body?.grossAmount || body?.amount);
    const status = cleanString(body?.status) || "paid";
    const notes = cleanString(body?.notes);

    if (!clientName || !clientEmail || grossAmountRaw <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_REQUIRED_FIELDS",
          message: "חובה למלא שם לקוח, מייל וסכום עסקה",
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

    if (!["pending", "paid", "cancelled", "refunded"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_STATUS",
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

    const calculated = calculateSale(grossAmountRaw);

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

      paidAmount: calculated.grossAmount,
      hasPaid: status === "paid",
      isActive: true,

      eventDate,

      includeCalls: false,
      callsRounds: 0,
      callsAddonPrice: 0,

      includeCreditGifts: false,
      creditGiftsAddonPrice: 0,

      includeDigitalSeating: true,
      includeEventManagement: false,
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

      allowedMessageRounds: 2,

      planLimits: {
        maxGuests: guests,
        allowedMessageRounds: 2,
        smsEnabled: true,
        smsLimit: guests,
        seatingEnabled: true,
        remindersEnabled: true,
        callsEnabled: false,
      },

      isTrial: false,
      needsPasswordSetup: true,

      createdByAdmin: false,
      billingSource: "admin",
    });

    const sale = await EmployeeSale.create({
      employeeId: required.employeeObjectId,
      employeeName: cleanString((required.currentUser as any).name),
      employeeEmail: normalizeEmail((required.currentUser as any).email),

      clientUserId: createdUser._id,
      clientName,
      clientEmail,
      clientPhone,

      eventName,
      eventDate,

      packageName: packageName || plan,
      plan,
      guests,

      ...calculated,

      status,
      source: "employee_client_create",
      notes,
    });

    try {
      await sendPasswordSetupMail(String(createdUser._id));
    } catch (mailError) {
      console.error("SEND PASSWORD SETUP MAIL FAILED:", mailError);
    }

    return NextResponse.json(
      {
        success: true,
        userId: String(createdUser._id),
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
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}