import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import SalesDocument from "@/models/SalesDocument";
import { buildRetainedDocumentHtml } from "@/lib/customers/retainedDocumentHtml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId || auth.role !== "admin" || auth.impersonated) {
      return NextResponse.json(
        { success: false, error: "אין הרשאה" },
        { status: 403 }
      );
    }

    await connectDB();
    const { token } = await context.params;
    const safeToken = String(token || "").trim();
    const document = await SalesDocument.findOne({
      token: safeToken,
      type: { $in: ["quote", "agreement"] },
    }).lean();

    if (!document) {
      return NextResponse.json(
        { success: false, error: "המסמך לא נמצא" },
        { status: 404 }
      );
    }

    const html = buildRetainedDocumentHtml(document);
    const kind = (document as { type?: string }).type === "agreement" ? "agreement" : "quote";
    const filename = `${kind}-${safeToken.slice(-8) || "document"}.html`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("ADMIN DOCUMENT DOWNLOAD FAILED:", error);
    return NextResponse.json(
      { success: false, error: "הורדת המסמך נכשלה" },
      { status: 500 }
    );
  }
}
