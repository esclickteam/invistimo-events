import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import db from "@/lib/db";
import SalesDocument from "@/models/SalesDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTE_VALIDITY_DAYS = 4;

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
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

export async function POST(req: NextRequest) {
  try {
    await db();

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonError("בקשה לא תקינה", 400);
    }

    const type = cleanStr((body as any).type);

    if (type !== "quote" && type !== "agreement") {
      return jsonError("סוג מסמך לא תקין", 400);
    }

    const client = (body as any).client || {};
    const event = (body as any).event || {};
    const selectedPackage = (body as any).selectedPackage || {};
    const totals = (body as any).totals || {};
    const quote = (body as any).quote || {};

    const clientFullName = cleanStr(client.fullName);
    const clientPhone = cleanStr(client.phone);

    const eventDate = cleanStr(event.date);
    const eventCity = cleanStr(event.city);
    const venueName = cleanStr(event.venueName);

    const grossAmount = asNumber(totals.grossAmount);

    if (!clientFullName) return jsonError("חסר שם לקוח", 400);
    if (!clientPhone) return jsonError("חסר טלפון לקוח", 400);
    if (!eventDate) return jsonError("חסר תאריך אירוע", 400);
    if (!eventCity) return jsonError("חסרה עיר אירוע", 400);
    if (!venueName) return jsonError("חסר שם אולם", 400);
    if (grossAmount <= 0) return jsonError("סכום העסקה לא תקין", 400);

    const createdAt = cleanStr(quote.createdAt) || toDateInputValue(new Date());

    const expiresAt =
      cleanStr(quote.expiresAt) ||
      toDateInputValue(addDays(new Date(createdAt), QUOTE_VALIDITY_DAYS));

    const token = await createUniqueToken();
    const url = `${req.nextUrl.origin}/sales-documents/${token}`;

    const document = await SalesDocument.create({
      type,
      token,
      url,
      status: "draft",

      client: {
        fullName: clientFullName,
        idNumber: cleanStr(client.idNumber),
        email: cleanStr(client.email),
        phone: clientPhone,
        address: cleanStr(client.address),
      },

      event: {
        name: cleanStr(event.name),
        date: eventDate,
        city: eventCity,
        venueName,
      },

      quote: {
        createdAt,
        expiresAt,
        validityDays: asNumber(quote.validityDays, QUOTE_VALIDITY_DAYS),
      },

      selectedPackage: {
        key: cleanStr(selectedPackage.key),
        title: cleanStr(selectedPackage.title),
        customerSummary: cleanStr(selectedPackage.customerSummary),
        includes: Array.isArray(selectedPackage.includes)
          ? selectedPackage.includes.map(cleanStr).filter(Boolean)
          : [],
        records: asNumber(selectedPackage.records),
        price: asNumber(selectedPackage.price),
      },

      upsells: Array.isArray((body as any).upsells)
        ? (body as any).upsells
        : [],

      totals: {
        grossAmount,
        netAmount: asNumber(totals.netAmount),
        vatRate: asNumber(totals.vatRate, 0.18),
        paymentMode: cleanStr(totals.paymentMode) || "split",
        paymentSchedule: totals.paymentSchedule || {},
      },

      customerDealSummary: (body as any).customerDealSummary || {},

      cancellationTerms: Array.isArray((body as any).cancellationTerms)
        ? (body as any).cancellationTerms
        : [],

      paymentTerms: Array.isArray((body as any).paymentTerms)
        ? (body as any).paymentTerms
        : [],

      signature: {
        fullName: "",
        idNumber: "",
        address: "",
        phone: "",
        date: "",
        signatureText: "",
        signedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      documentId: String(document._id),
      token,
      url,
      documentUrl: url,
      type,
      expiresAt,
    });
  } catch (error) {
    console.error("CREATE SALES DOCUMENT FAILED:", error);

    return jsonError(
      error instanceof Error ? error.message : "שגיאה ביצירת קישור למסמך",
      500,
    );
  }
}