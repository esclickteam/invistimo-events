import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { withCurrentQuoteTerms } from "@/lib/quoteCustomerTerms";
import SalesDocument from "@/models/SalesDocument";
import CustomerAgreement from "@/models/CustomerAgreement";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function baseUrl(req: NextRequest) {
  const fromEnv =
    cleanString(process.env.NEXT_PUBLIC_APP_URL) ||
    cleanString(process.env.NEXT_PUBLIC_SITE_URL) ||
    cleanString(process.env.NEXTAUTH_URL) ||
    cleanString(process.env.APP_URL);

  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return req.nextUrl.origin.replace(/\/+$/, "");
}

async function requireEditor(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId) return null;
  const user = await User.findById(auth.userId).select("role staffType").lean();
  if (!user) return null;
  const role = (user as { role?: string }).role;
  const staffType = (user as { staffType?: string }).staffType;
  const allowed =
    role === "admin" ||
    role === "producer" ||
    (role === "staff" &&
      (staffType === "general_staff" || staffType === "producer_staff"));
  return allowed ? auth : null;
}

async function createUniqueToken() {
  for (let index = 0; index < 8; index += 1) {
    const token = crypto.randomBytes(18).toString("base64url");
    const exists = await SalesDocument.exists({ token });
    if (!exists) return token;
  }
  return `${Date.now().toString(36)}-${crypto.randomBytes(10).toString("base64url")}`;
}

/**
 * Creates a signature agreement that copies the saved quote the customer sees.
 * The quote token, prices and expiry stay as they are.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    await connectDB();
    const auth = await requireEditor(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "אין הרשאה" },
        { status: 403 },
      );
    }

    const { token: quoteToken } = await context.params;
    const safeToken = cleanString(quoteToken);
    const quote = await SalesDocument.findOne({
      token: safeToken,
      type: "quote",
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: "הצעת מחיר לא נמצאה" },
        { status: 404 },
      );
    }

    const source = withCurrentQuoteTerms(
      quote.toObject() as Record<string, unknown>,
    );
    const token = await createUniqueToken();
    const url = `${baseUrl(req)}/sales-documents/${token}`;

    const agreement = await SalesDocument.create({
      type: "agreement",
      token,
      url,
      status: "draft",
      customerFileId: quote.customerFileId,
      createdByUserId: auth.userId,
      client: source.client,
      event: source.event,
      seatingSchedule: source.seatingSchedule || undefined,
      quote: source.quote,
      agreement: {
        signatureFullName: "",
        signatureIdNumber: "",
        signatureAddress: "",
        signaturePhone: "",
        signatureDataUrl: "",
        signatureText: "",
        acceptedTerms: false,
        signedAt: null,
      },
      selectedPackage: source.selectedPackage,
      upsells: source.upsells,
      totals: source.totals,
      pricingDisplay: source.pricingDisplay,
      quoteDisplay: source.quoteDisplay,
      priceDisplay: source.priceDisplay,
      customerDealSummary: source.customerDealSummary,
      engagementTerms: source.engagementTerms,
      paymentTerms: source.paymentTerms,
      cancellationTerms: source.cancellationTerms,
      additionalTerms: source.additionalTerms,
      quoteTermsVersion: source.quoteTermsVersion,
      notes: source.notes || "",
    });

    if (quote.customerFileId) {
      await CustomerAgreement.create({
        customerFileId: quote.customerFileId,
        title: "הסכם שירותים",
        amount:
          Number(
            (source.totals as { grossAmountAfterDiscount?: number } | undefined)
              ?.grossAmountAfterDiscount,
          ) || 0,
        status: "draft",
        signedAt: null,
        signerName: cleanString(
          (source.client as { fullName?: string } | undefined)?.fullName,
        ),
        signerEmail: cleanString(
          (source.client as { email?: string } | undefined)?.email,
        ),
        signerPhone: cleanString(
          (source.client as { phone?: string } | undefined)?.phone,
        ),
        publicToken: token,
        salesDocumentId: agreement._id,
      });
    }

    return NextResponse.json({
      success: true,
      token,
      url,
      message: "ההסכם נוצר מההצעה השמורה",
    });
  } catch (err) {
    console.error("create agreement from quote failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "שגיאה ביצירת הסכם",
      },
      { status: 500 },
    );
  }
}
