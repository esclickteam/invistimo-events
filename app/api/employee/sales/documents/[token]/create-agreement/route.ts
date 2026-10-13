import crypto from "crypto";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { withCurrentQuoteTerms } from "@/lib/quoteCustomerTerms";
import {
  isSignedAgreement,
  saveDocumentEdit,
} from "@/lib/adminQuoteWorkflow";
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

    const body = await req.json().catch(() => ({}));
    const payload =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    const createNew = payload.createNew === true;
    const source = withCurrentQuoteTerms(
      quote.toObject() as Record<string, unknown>,
    );
    const hasEditedPayload =
      payload.selectedPackage && typeof payload.selectedPackage === "object";
    const content = hasEditedPayload ? payload : source;
    if (content.selectedPackage && typeof content.selectedPackage === "object") {
      const pkg = content.selectedPackage as Record<string, unknown>;
      if ((pkg.price === null || pkg.price === undefined) && pkg.actualPrice != null) {
        pkg.price = pkg.actualPrice;
      }
    }
    if (content.totals && typeof content.totals === "object") {
      const raw = content.totals as Record<string, unknown>;
      const gross = Number(raw.grossAmountAfterDiscount ?? raw.grossAmount ?? 0);
      content.totals = {
        ...raw,
        grossAmount: Number(raw.grossAmount ?? gross) || 0,
        grossAmountAfterDiscount: Number.isFinite(gross) ? gross : 0,
        grossAmountBeforeDiscount:
          Number(raw.grossAmountBeforeDiscount ?? raw.originalGrossAmount ?? gross) || 0,
      };
    }

    const existing = await SalesDocument.findOne({
      type: "agreement",
      sourceQuoteToken: quote.token,
    }).sort({ createdAt: -1 });

    if (existing && isSignedAgreement(existing.toObject()) && !createNew) {
      return NextResponse.json(
        {
          success: false,
          error: "SIGNED_IMMUTABLE",
          message: "ההסכם החתום נשמר כמסמך קבוע. אפשר ליצור מסמך חדש בלי לשנות אותו.",
          token: existing.token,
          url: existing.url,
        },
        { status: 409 },
      );
    }

    if (existing && !isSignedAgreement(existing.toObject()) && !createNew) {
      const decision = saveDocumentEdit(
        existing.toObject() as Record<string, unknown>,
        content,
        auth.userId,
      );
      if (!decision.ok) {
        return NextResponse.json(
          { success: false, error: decision.error, message: decision.message },
          { status: 400 },
        );
      }
      if (decision.mode === "revision") {
        existing.set("draftRevision", decision.draftRevision);
        existing.markModified("draftRevision");
      } else {
        for (const [key, value] of Object.entries(decision.apply)) {
          if (key === "savedAt" || key === "savedByUserId") continue;
          existing.set(key, value);
          existing.markModified(key);
        }
      }
      await existing.save();
      quote.set("linkedAgreementToken", existing.token);
      await quote.save();
      return NextResponse.json({
        success: true,
        token: existing.token,
        url: existing.url,
        status: existing.status,
        message: "ההסכם עודכן בלי לשנות את הצעת המחיר ובלי לשלוח SMS",
      });
    }

    const token = await createUniqueToken();
    const url = `${baseUrl(req)}/sales-documents/${token}`;
    const terms = (value: unknown, fallback: unknown[] | undefined) =>
      Array.isArray(value) ? value : fallback;

    const editedClient =
      content.client && typeof content.client === "object"
        ? (content.client as Record<string, unknown>)
        : null;
    const agreement = await SalesDocument.create({
      type: "agreement",
      token,
      url,
      status: "draft",
      customerFileId: quote.customerFileId,
      createdByUserId: new mongoose.Types.ObjectId(auth.userId),
      sourceQuoteToken: quote.token,
      sourceQuoteId: quote._id,
      client: editedClient
        ? {
            fullName: cleanString(editedClient.fullName),
            idNumber: cleanString(editedClient.idNumber),
            email: cleanString(editedClient.email).toLowerCase(),
            phone: cleanString(editedClient.phone),
            address: cleanString(editedClient.address),
          }
        : quote.client,
      event:
        content.event && typeof content.event === "object"
          ? content.event
          : quote.event,
      seatingSchedule: content.seatingSchedule || quote.seatingSchedule,
      quote: content.quote || quote.quote,
      builderState: content.builderState || null,
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
      selectedPackage: content.selectedPackage || quote.selectedPackage,
      upsells: terms(content.upsells, terms(source.upsells, quote.upsells)),
      totals: (() => {
        const raw =
          content.totals && typeof content.totals === "object"
            ? (content.totals as Record<string, unknown>)
            : null;
        if (!raw) return quote.totals;
        const gross = Number(raw.grossAmountAfterDiscount ?? raw.grossAmount ?? 0);
        return {
          ...(quote.totals || {}),
          ...raw,
          grossAmount: Number(raw.grossAmount ?? gross) || 0,
          grossAmountAfterDiscount: Number.isFinite(gross) ? gross : 0,
          grossAmountBeforeDiscount: Number(
            raw.grossAmountBeforeDiscount ?? raw.originalGrossAmount ?? gross,
          ) || 0,
        };
      })(),
      customerDealSummary:
        content.customerDealSummary &&
        typeof content.customerDealSummary === "object"
          ? (content.customerDealSummary as Record<string, unknown>)
          : source.customerDealSummary &&
              typeof source.customerDealSummary === "object"
            ? (source.customerDealSummary as Record<string, unknown>)
            : quote.customerDealSummary,
      engagementTerms: terms(
        content.engagementTerms,
        terms(source.engagementTerms, quote.engagementTerms),
      ),
      paymentTerms: terms(
        content.paymentTerms,
        terms(source.paymentTerms, quote.paymentTerms),
      ),
      cancellationTerms: terms(
        content.cancellationTerms,
        terms(source.cancellationTerms, quote.cancellationTerms),
      ),
      additionalTerms: terms(
        content.additionalTerms,
        terms(source.additionalTerms, quote.additionalTerms),
      ),
      quoteTermsVersion:
        typeof source.quoteTermsVersion === "string"
          ? source.quoteTermsVersion
          : quote.quoteTermsVersion,
      notes: cleanString(content.notes || quote.notes || ""),
    });

    quote.set("linkedAgreementToken", token);
    await quote.save();

    if (quote.customerFileId) {
      await CustomerAgreement.create({
        customerFileId: quote.customerFileId,
        title: "הסכם שירותים",
        amount:
          Number(
            (content.totals as { grossAmountAfterDiscount?: number } | undefined)
              ?.grossAmountAfterDiscount,
          ) ||
          Number(
            (source.totals as { grossAmountAfterDiscount?: number } | undefined)
              ?.grossAmountAfterDiscount,
          ) ||
          0,
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
