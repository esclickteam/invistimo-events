import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import SalesDocument from "@/models/SalesDocument";
import CustomerAgreement from "@/models/CustomerAgreement";
import User from "@/models/User";
import { syncOutdatedQuoteTerms } from "@/lib/quoteTermsSync";
import {
  toAdminCustomerAgreementRow,
  toAdminSalesDocumentRow,
} from "@/lib/customers/adminSalesDocumentRow";
import { userLinkStatus } from "@/lib/adminQuoteWorkflow";

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
    const kind = req.nextUrl.searchParams.get("kind");
    const typeFilter =
      kind === "agreements"
        ? "agreement"
        : kind === "quotes"
          ? "quote"
          : { $in: ["quote", "agreement"] };

    const docs = await SalesDocument.find({
      type: typeFilter,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const userIds = Array.from(
      new Set(
        docs.flatMap((doc: any) =>
          [doc.convertedUserId, doc.originalUserId]
            .filter(Boolean)
            .map((id) => String(id))
        )
      )
    );
    const liveUsers = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select("_id").lean()
      : [];
    const liveUserIds = new Set(liveUsers.map((user) => String(user._id)));
    const quotes = docs.map((doc) => {
      const row = toAdminSalesDocumentRow(doc, liveUserIds);
      const archived = (doc as { customerDeleted?: boolean }).customerDeleted === true;
      return {
        ...row,
        userLinkStatus: archived
          ? "none"
          : userLinkStatus({
              convertedUserId: row.convertedUserId,
              userExists: row.convertedUserId
                ? liveUserIds.has(String(row.convertedUserId))
                : false,
            }),
      };
    });

    if (kind === "agreements") {
      const seen = new Set(quotes.map((row) => row.token).filter(Boolean));
      const agreements = await CustomerAgreement.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      const extraUserIds = agreements
        .flatMap((agreement: any) => [agreement.userId, agreement.originalUserId])
        .filter(Boolean)
        .map((id) => String(id))
        .filter((id) => !liveUserIds.has(id) && !userIds.includes(id));
      if (extraUserIds.length) {
        const extraUsers = await User.find({ _id: { $in: extraUserIds } })
          .select("_id")
          .lean();
        for (const user of extraUsers) liveUserIds.add(String(user._id));
      }
      for (const agreement of agreements) {
        const row = toAdminCustomerAgreementRow(agreement, liveUserIds);
        if (row.token && seen.has(row.token)) continue;
        quotes.push({ ...row, userLinkStatus: "none" });
      }
    }

    return NextResponse.json({ success: true, quotes });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה בטעינת הצעות" },
      { status: 500 }
    );
  }
}
