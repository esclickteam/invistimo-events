import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import SalesDocument from "@/models/SalesDocument";
import { sanitizeSalesDocumentForCustomer } from "@/lib/salesDocumentTerms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTE_VALIDITY_DAYS = 4;

type RouteContext = {
  params:
    | {
        token: string;
      }
    | Promise<{
        token: string;
      }>;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function isDateExpired(dateValue?: string) {
  const str = cleanStr(dateValue);

  if (!str) return false;

  const parts = str.split("-").map((part) => Number(part));

  if (
    parts.length === 3 &&
    Number.isFinite(parts[0]) &&
    Number.isFinite(parts[1]) &&
    Number.isFinite(parts[2])
  ) {
    const endOfDay = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
    return Date.now() > endOfDay.getTime();
  }

  const parsed = new Date(str);

  if (Number.isNaN(parsed.getTime())) return false;

  parsed.setHours(23, 59, 59, 999);

  return Date.now() > parsed.getTime();
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

function shouldMarkAsViewed(req: NextRequest) {
  const url = new URL(req.url);
  const preview = cleanStr(url.searchParams.get("preview"));
  const markViewed = cleanStr(url.searchParams.get("markViewed"));

  if (preview === "1" || preview === "true") return false;
  if (markViewed === "0" || markViewed === "false") return false;

  return true;
}

function normalizeDocumentForClient(document: any) {
  if (!document) return null;

  const normalized = sanitizeSalesDocumentForCustomer({
    ...document,
    _id: document._id ? String(document._id) : "",
    createdByUserId: document.createdByUserId
      ? String(document.createdByUserId)
      : null,
  });

  return normalized;
}

async function getTokenFromContext(context: RouteContext) {
  const params = await context.params;
  return cleanStr(params?.token);
}

function getQuoteDates(document: any) {
  const now = new Date();
  const quote = document?.quote || {};

  const createdAt =
    cleanStr(quote.createdAt) ||
    toDateInputValue(document?.createdAt ? new Date(document.createdAt) : now);

  const createdDate = parseDateInput(createdAt) || now;

  const expiresAt =
    cleanStr(quote.expiresAt) ||
    toDateInputValue(addDays(createdDate, QUOTE_VALIDITY_DAYS));

  const validityDays =
    typeof quote.validityDays === "number" && Number.isFinite(quote.validityDays)
      ? quote.validityDays
      : QUOTE_VALIDITY_DAYS;

  return {
    createdAt,
    expiresAt,
    validityDays,
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const token = await getTokenFromContext(context);

    if (!token) {
      return jsonError("קישור לא תקין", 400);
    }

    const document = await SalesDocument.findOne({ token }).lean();

    if (!document) {
      return jsonError("המסמך לא נמצא", 404);
    }

    const now = new Date();
    const updates: Record<string, unknown> = {};

    const documentType = cleanStr((document as any).type);
    const currentStatus = cleanStr((document as any).status);

    if (documentType !== "quote" && documentType !== "agreement") {
      return jsonError("סוג מסמך לא תקין", 400);
    }

    const quoteDates = getQuoteDates(document);

    if (!(document as any).quote?.createdAt) {
      updates["quote.createdAt"] = quoteDates.createdAt;
      (document as any).quote = {
        ...((document as any).quote || {}),
        createdAt: quoteDates.createdAt,
      };
    }

    if (!(document as any).quote?.expiresAt) {
      updates["quote.expiresAt"] = quoteDates.expiresAt;
      (document as any).quote = {
        ...((document as any).quote || {}),
        expiresAt: quoteDates.expiresAt,
      };
    }

    if (!(document as any).quote?.validityDays) {
      updates["quote.validityDays"] = quoteDates.validityDays;
      (document as any).quote = {
        ...((document as any).quote || {}),
        validityDays: quoteDates.validityDays,
      };
    }

    const expired =
      documentType === "quote" &&
      currentStatus !== "signed" &&
      isDateExpired(quoteDates.expiresAt);

    if (expired && currentStatus !== "expired") {
      updates.status = "expired";
      (document as any).status = "expired";
    }

    const baseUrl = getBaseUrl(req);
    const documentUrl = `${baseUrl}/sales-documents/${token}`;

    if (!cleanStr((document as any).url)) {
      updates.url = documentUrl;
      (document as any).url = documentUrl;
    }

    const viewedIp = getClientIp(req);
    const viewedUserAgent = cleanStr(req.headers.get("user-agent"));

    const canMarkViewed =
      shouldMarkAsViewed(req) &&
      !expired &&
      currentStatus !== "signed" &&
      currentStatus !== "expired";

    if (canMarkViewed) {
      if (!(document as any).viewedAt) {
        updates.viewedAt = now;
        updates.viewedIp = viewedIp;
        updates.viewedUserAgent = viewedUserAgent;

        updates["audit.viewedAt"] = now;
        updates["audit.viewedIp"] = viewedIp;
        updates["audit.viewedUserAgent"] = viewedUserAgent;

        (document as any).viewedAt = now;
        (document as any).viewedIp = viewedIp;
        (document as any).viewedUserAgent = viewedUserAgent;

        (document as any).audit = {
          ...((document as any).audit || {}),
          viewedAt: now,
          viewedIp,
          viewedUserAgent,
        };
      }

      if (currentStatus === "draft" || currentStatus === "sent") {
        updates.status = "viewed";
        (document as any).status = "viewed";
      }
    }

    if (Object.keys(updates).length > 0) {
      await SalesDocument.updateOne(
        { token },
        {
          $set: updates,
        },
      );
    }

    const normalizedDocument = normalizeDocumentForClient(document);

    const normalizedStatus = cleanStr(normalizedDocument?.status);

    const canSign =
      documentType === "agreement" &&
      normalizedStatus !== "signed" &&
      normalizedStatus !== "expired";

    const readOnly =
      documentType === "quote" ||
      normalizedStatus === "signed" ||
      normalizedStatus === "expired";

    return NextResponse.json({
      success: true,
      document: normalizedDocument,
      expired,
      canSign,
      readOnly,
      documentUrl: normalizedDocument?.url || documentUrl,
      serverNow: now.toISOString(),
    });
  } catch (error) {
    console.error("READ SALES DOCUMENT FAILED:", error);

    return jsonError(
      error instanceof Error ? error.message : "שגיאה בטעינת המסמך",
      500,
    );
  }
}