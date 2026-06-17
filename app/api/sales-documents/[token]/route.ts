import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import SalesDocument from "@/models/SalesDocument";

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

function parseDate(value: unknown) {
  const str = cleanStr(value);
  if (!str) return null;

  const date = new Date(str);

  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(`${str}T00:00:00.000`);
    if (Number.isNaN(fallback.getTime())) return null;
    return fallback;
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

  const endOfDay = new Date(`${str}T23:59:59.999`);

  if (Number.isNaN(endOfDay.getTime())) {
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return false;

    parsed.setHours(23, 59, 59, 999);
    return Date.now() > parsed.getTime();
  }

  return Date.now() > endOfDay.getTime();
}

function getClientIp(req: NextRequest) {
  return (
    cleanStr(req.headers.get("x-forwarded-for")).split(",")[0]?.trim() ||
    cleanStr(req.headers.get("x-real-ip")) ||
    cleanStr(req.headers.get("cf-connecting-ip")) ||
    ""
  );
}

function shouldMarkAsViewed(req: NextRequest) {
  const url = new URL(req.url);
  const preview = url.searchParams.get("preview");
  const markViewed = url.searchParams.get("markViewed");

  if (preview === "1" || preview === "true") return false;
  if (markViewed === "0" || markViewed === "false") return false;

  return true;
}

function normalizeDocumentForClient(document: any) {
  if (!document) return null;

  return {
    ...document,
    _id: document._id ? String(document._id) : "",
    createdByUserId: document.createdByUserId
      ? String(document.createdByUserId)
      : null,
  };
}

async function getTokenFromContext(context: RouteContext) {
  const params = await context.params;
  return cleanStr(params?.token);
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

    const quote = (document as any).quote || {};
    const quoteCreatedAt =
      cleanStr(quote.createdAt) ||
      toDateInputValue((document as any).createdAt || now);

    let quoteExpiresAt = cleanStr(quote.expiresAt);

    if (documentType === "quote" && !quoteExpiresAt) {
      const createdDate = parseDate(quoteCreatedAt) || now;
      quoteExpiresAt = toDateInputValue(
        addDays(createdDate, QUOTE_VALIDITY_DAYS),
      );

      updates["quote.createdAt"] = quoteCreatedAt;
      updates["quote.expiresAt"] = quoteExpiresAt;
      updates["quote.validityDays"] = QUOTE_VALIDITY_DAYS;

      (document as any).quote = {
        ...quote,
        createdAt: quoteCreatedAt,
        expiresAt: quoteExpiresAt,
        validityDays: quote.validityDays || QUOTE_VALIDITY_DAYS,
      };
    }

    const expired =
      documentType === "quote" &&
      currentStatus !== "signed" &&
      isDateExpired(quoteExpiresAt);

    if (expired && currentStatus !== "expired") {
      updates.status = "expired";
      (document as any).status = "expired";
    }

    const canMarkViewed =
      shouldMarkAsViewed(req) &&
      !expired &&
      currentStatus !== "signed" &&
      currentStatus !== "expired";

    if (canMarkViewed && !(document as any).viewedAt) {
      updates.viewedAt = now;
      updates.viewedIp = getClientIp(req);
      updates.viewedUserAgent = cleanStr(req.headers.get("user-agent"));

      (document as any).viewedAt = now;

      if (currentStatus === "draft" || currentStatus === "sent") {
        updates.status = "viewed";
        (document as any).status = "viewed";
      }
    } else if (
      canMarkViewed &&
      (currentStatus === "draft" || currentStatus === "sent")
    ) {
      updates.status = "viewed";
      (document as any).status = "viewed";
    }

    if (!cleanStr((document as any).url)) {
      const url = `${req.nextUrl.origin}/sales-documents/${token}`;
      updates.url = url;
      (document as any).url = url;
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

    return NextResponse.json({
      success: true,
      document: normalizedDocument,
      expired,
      canSign:
        documentType === "agreement" &&
        normalizedDocument?.status !== "signed" &&
        normalizedDocument?.status !== "expired",
      readOnly: documentType === "quote" || normalizedDocument?.status === "signed",
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