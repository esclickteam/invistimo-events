import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { syncOutdatedQuoteTerms } from "@/lib/quoteTermsSync";
import {
  ADMIN_SALES_LIST_LIMIT,
  loadAdminSalesQuotes,
} from "@/lib/customers/adminSalesList";

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
 * Every historical quote and agreement, including customers whose user
 * record was deleted. The response is not limited to live users.
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

    const limitRaw = Number(req.nextUrl.searchParams.get("limit") || ADMIN_SALES_LIST_LIMIT);
    const result = await loadAdminSalesQuotes(limitRaw);

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה בטעינת הצעות" },
      { status: 500 }
    );
  }
}
