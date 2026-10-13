import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import SalesDocument from "@/models/SalesDocument";
import CustomerAgreement from "@/models/CustomerAgreement";
import CustomerQuote from "@/models/CustomerQuote";
import CustomerFile from "@/models/CustomerFile";
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
    let document: any = await SalesDocument.findOne({
      token: safeToken,
      type: { $in: ["quote", "agreement"] },
    }).lean();

    if (!document) {
      const agreement = await CustomerAgreement.findOne({
        publicToken: safeToken,
      }).lean();
      if (agreement) {
        const copy = (agreement as { immutableSignedCopy?: Record<string, unknown> })
          .immutableSignedCopy;
        document = {
          type: "agreement",
          token: safeToken,
          status: (agreement as { status?: string }).status,
          createdAt: (agreement as { createdAt?: Date }).createdAt,
          pdfUrl: (agreement as { pdfUrl?: string }).pdfUrl,
          client: {
            fullName: (agreement as { signerName?: string }).signerName,
            email: (agreement as { signerEmail?: string }).signerEmail,
            phone: (agreement as { signerPhone?: string }).signerPhone,
            idNumber: (agreement as { signerIdNumber?: string }).signerIdNumber,
          },
          totals: { grossAmountAfterDiscount: (agreement as { amount?: number }).amount },
          signature: {
            fullName: (agreement as { signerName?: string }).signerName,
            signedAt: (agreement as { signedAt?: Date }).signedAt,
            signatureDataUrl: (agreement as { signatureImageUrl?: string })
              .signatureImageUrl,
          },
          immutableSignedCopy: copy || null,
          signedAt: (agreement as { signedAt?: Date }).signedAt,
        };
      }
    }

    if (!document) {
      const quote = await CustomerQuote.findOne({ publicToken: safeToken }).lean();
      if (quote) {
        const file = (quote as { customerFileId?: unknown }).customerFileId
          ? await CustomerFile.findById(
              (quote as { customerFileId?: unknown }).customerFileId
            )
              .select("fullName email phone venueName packageName")
              .lean()
          : null;
        document = {
          type: "quote",
          token: safeToken,
          status: (quote as { status?: string }).status,
          createdAt: (quote as { createdAt?: Date }).createdAt,
          client: {
            fullName: file?.fullName || "",
            email: file?.email || "",
            phone: file?.phone || "",
          },
          event: { name: file?.venueName || "" },
          selectedPackage: { title: file?.packageName || "" },
          totals: { grossAmountAfterDiscount: (quote as { total?: number }).total },
        };
      }
    }

    if (!document) {
      return NextResponse.json(
        { success: false, error: "המסמך לא נמצא" },
        { status: 404 }
      );
    }

    const html = buildRetainedDocumentHtml(document);
    const kind =
      (document as { type?: string }).type === "agreement" ? "agreement" : "quote";
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
