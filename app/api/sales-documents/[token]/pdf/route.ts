import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import SalesDocument from "@/models/SalesDocument";
import { buildSignedAgreementPdf } from "@/lib/salesAgreementPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    await db();
    const { token } = await context.params;
    const safeToken = clean(token);
    const document = await SalesDocument.findOne({
      token: safeToken,
      type: "agreement",
      status: "signed",
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: "הסכם חתום לא נמצא" },
        { status: 404 },
      );
    }

    const stored = document.get("signedPdf.data") as Buffer | undefined;
    const bytes = stored && stored.length > 0
      ? stored
      : await buildSignedAgreementPdf(
          (document.get("signedSnapshot") as Record<string, unknown>) ||
            (document.toObject() as Record<string, unknown>),
        );

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="agreement-${safeToken}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("SIGNED AGREEMENT PDF READ FAILED:", error);
    return NextResponse.json(
      { success: false, error: "לא ניתן להפיק את קובץ ה-PDF" },
      { status: 500 },
    );
  }
}
