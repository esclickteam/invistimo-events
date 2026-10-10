import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { QUOTE_PAYMENT_CONFIRMED_LABEL } from "@/lib/quotePaymentStatus";
import SalesDocument from "@/models/SalesDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId || auth.role !== "admin" || auth.impersonated) {
    return null;
  }
  return auth;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "אין הרשאה" },
        { status: 403 },
      );
    }

    await connectDB();
    const { token } = await context.params;
    const safeToken = String(token || "").trim();
    if (!safeToken) {
      return NextResponse.json(
        { success: false, error: "קישור לא תקין" },
        { status: 400 },
      );
    }

    const existing = await SalesDocument.findOne({
      token: safeToken,
      type: "quote",
    })
      .select("quote.expiresAt status totals selectedPackage adminPaymentConfirmed")
      .lean();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "ההצעה לא נמצאה" },
        { status: 404 },
      );
    }

    const before = existing as {
      quote?: { expiresAt?: string };
      status?: string;
      totals?: { grossAmount?: number; grossAmountAfterDiscount?: number };
      selectedPackage?: { price?: number };
    };

    await SalesDocument.updateOne(
      { token: safeToken, type: "quote" },
      { $set: { adminPaymentConfirmed: true } },
    );

    const after = await SalesDocument.findOne({
      token: safeToken,
      type: "quote",
    })
      .select("quote.expiresAt status totals selectedPackage adminPaymentConfirmed")
      .lean();

    const saved = after as typeof before & { adminPaymentConfirmed?: boolean };

    return NextResponse.json({
      success: true,
      adminPaymentConfirmed: saved?.adminPaymentConfirmed === true,
      statusLabel: QUOTE_PAYMENT_CONFIRMED_LABEL,
      expiresAt: saved?.quote?.expiresAt || "",
      status: saved?.status || "",
      grossAmount:
        saved?.totals?.grossAmountAfterDiscount ??
        saved?.totals?.grossAmount ??
        null,
      packagePrice: saved?.selectedPackage?.price ?? null,
      unchanged: {
        expiresAt: (saved?.quote?.expiresAt || "") === (before.quote?.expiresAt || ""),
        status: (saved?.status || "") === (before.status || ""),
        grossAmount:
          (saved?.totals?.grossAmountAfterDiscount ?? saved?.totals?.grossAmount ?? null) ===
          (before.totals?.grossAmountAfterDiscount ?? before.totals?.grossAmount ?? null),
        packagePrice:
          (saved?.selectedPackage?.price ?? null) === (before.selectedPackage?.price ?? null),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "שמירת הסטטוס נכשלה",
      },
      { status: 500 },
    );
  }
}
