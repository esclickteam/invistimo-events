import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import SalesDocument from "@/models/SalesDocument";
import { syncOutdatedQuoteTerms } from "@/lib/quoteTermsSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId || auth.role !== "admin" || auth.impersonated) {
    return null;
  }
  return auth;
}

/**
 * GET /api/admin/sales/quotes
 * רשימת הצעות מחיר עם כפתורי עריכה / פתיחת משתמש.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "אין הרשאה" },
        { status: 403 }
      );
    }

    await connectDB();
    try {
      await syncOutdatedQuoteTerms();
    } catch (error) {
      console.error("QUOTE TERMS SYNC FAILED:", error);
    }

    const limitRaw = Number(req.nextUrl.searchParams.get("limit") || 100);
    const limit = Math.min(Math.max(limitRaw || 100, 1), 300);

    const docs = await SalesDocument.find({ type: "quote" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const quotes = docs.map((doc: any) => ({
      _id: String(doc._id),
      token: String(doc.token || ""),
      quoteNumber: String(doc.token || "").slice(-8).toUpperCase(),
      fullName: doc.client?.fullName || "",
      email: doc.client?.email || "",
      phone: doc.client?.phone || "",
      eventName: doc.event?.name || "",
      packageTitle: doc.selectedPackage?.title || "",
      status: doc.status || "draft",
      total:
        Number(
          doc.totals?.grossAmountAfterDiscount ??
            doc.totals?.grossAmount ??
            doc.selectedPackage?.price ??
            0
        ) || 0,
      convertedUserId: doc.convertedUserId
        ? String(doc.convertedUserId)
        : null,
      createdAt: doc.createdAt || null,
      expiresAt: doc.quote?.expiresAt || null,
      adminPaymentConfirmed: doc.adminPaymentConfirmed === true,
    }));

    return NextResponse.json({ success: true, quotes });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה בטעינת הצעות" },
      { status: 500 }
    );
  }
}
