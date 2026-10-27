import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  applySeatingScheduleUpdate,
  orderIncludesVenueSeating,
  parseSeatingScheduleTimes,
} from "@/lib/seatingSchedule";
import { resolveSeatingScheduleActor } from "@/lib/seatingScheduleActor";
import SalesDocument from "@/models/SalesDocument";
import CustomerQuote from "@/models/CustomerQuote";
import User from "@/models/User";
import {
  describeDealGap,
  editorView,
  isSignedAgreement,
  saveDocumentEdit,
  userLinkStatus,
} from "@/lib/adminQuoteWorkflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function requireEditor(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId) return null;

  const user = await User.findById(auth.userId).select("role staffType").lean();
  if (!user) return null;

  const role = (user as any).role;
  const staffType = (user as any).staffType;
  const allowed =
    role === "admin" ||
    role === "producer" ||
    (role === "staff" &&
      (staffType === "general_staff" || staffType === "producer_staff"));

  return allowed ? auth : null;
}

/** PATCH — עריכת הצעת מחיר קיימת */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();
    const auth = await requireEditor(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "אין הרשאה" },
        { status: 403 }
      );
    }

    const { token } = await context.params;
    const safeToken = cleanString(token);
    if (!safeToken) {
      return NextResponse.json(
        { success: false, error: "טוקן לא תקין" },
        { status: 400 }
      );
    }

    const doc = await SalesDocument.findOne({ token: safeToken });
    if (!doc || (doc.type !== "quote" && doc.type !== "agreement")) {
      return NextResponse.json(
        { success: false, error: "המסמך לא נמצא" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const bodyKeys = Object.keys(body || {});
    const scheduleOnly =
      bodyKeys.length === 1 && bodyKeys[0] === "seatingSchedule";

    if (doc.type === "agreement" && !scheduleOnly) {
      return NextResponse.json(
        {
          success: false,
          error: isSignedAgreement(doc.toObject())
            ? "SIGNED_IMMUTABLE"
            : "הסכם אינו נערך מכאן. ניתן לשמור רק שינוי מאוחר בלוחות הזמנים של ההושבה, בלי לדרוס את השעות המקוריות.",
          message: isSignedAgreement(doc.toObject())
            ? "הסכם חתום הוא מסמך קבוע. שינוי עתידי דורש מסמך חדש."
            : "הסכם אינו נערך מכאן. ניתן לשמור רק שינוי מאוחר בלוחות הזמנים של ההושבה, בלי לדרוס את השעות המקוריות.",
        },
        { status: 400 }
      );
    }

    if (!scheduleOnly && doc.type === "quote") {
      const decision = saveDocumentEdit(
        doc.toObject() as Record<string, unknown>,
        body,
        String(auth.userId),
      );
      if (!decision.ok) {
        return NextResponse.json(
          { success: false, error: decision.error, message: decision.message },
          { status: 400 },
        );
      }
      if (decision.mode === "revision") {
        (doc as any).draftRevision = decision.draftRevision;
        doc.markModified("draftRevision");
        await doc.save();
        return NextResponse.json({
          success: true,
          hasUnpublishedRevision: true,
          document: editorView(doc.toObject() as Record<string, unknown>),
          message: "הגרסה המעודכנת נשמרה. העותק שנשלח ללקוח לא נדרס ולא נשלח SMS.",
        });
      }
    }

    if (body.client && typeof body.client === "object") {
      doc.client = {
        fullName: cleanString(body.client.fullName ?? doc.client?.fullName),
        idNumber: cleanString(body.client.idNumber ?? doc.client?.idNumber),
        email: cleanString(body.client.email ?? doc.client?.email).toLowerCase(),
        phone: cleanString(body.client.phone ?? doc.client?.phone),
        address: cleanString(body.client.address ?? doc.client?.address),
      };
    }

    if (body.event && typeof body.event === "object") {
      doc.event = {
        name: cleanString(body.event.name ?? doc.event?.name),
        date: cleanString(body.event.date ?? doc.event?.date),
        city: cleanString(body.event.city ?? doc.event?.city),
        venueName: cleanString(body.event.venueName ?? doc.event?.venueName),
      };
    }

    if (body.selectedPackage && typeof body.selectedPackage === "object") {
      const pkg = body.selectedPackage;
      doc.selectedPackage = {
        key: cleanString(pkg.key ?? doc.selectedPackage?.key),
        title: cleanString(pkg.title ?? doc.selectedPackage?.title),
        customerSummary: cleanString(
          pkg.customerSummary ?? doc.selectedPackage?.customerSummary
        ),
        includes: Array.isArray(pkg.includes)
          ? pkg.includes.map((x: unknown) => cleanString(x)).filter(Boolean)
          : doc.selectedPackage?.includes || [],
        records: Math.max(
          0,
          toNumber(pkg.records ?? doc.selectedPackage?.records, 0)
        ),
        price: Math.max(
          0,
          toNumber(
            pkg.actualPrice ?? pkg.price ?? doc.selectedPackage?.price,
            0,
          )
        ),
      };
    }

    if (Array.isArray(body.upsells)) {
      doc.upsells = body.upsells;
    }

    if (body.totals && typeof body.totals === "object") {
      const t = body.totals;
      const gross = roundMoney(
        toNumber(t.grossAmountAfterDiscount ?? t.grossAmount, 0)
      );
      const vatRate = toNumber(t.vatRate, doc.totals?.vatRate ?? 0.18);
      doc.totals = {
        ...(doc.totals || {}),
        grossAmount: roundMoney(toNumber(t.grossAmount, gross)),
        grossAmountBeforeDiscount: roundMoney(
          toNumber(t.grossAmountBeforeDiscount, gross)
        ),
        grossAmountAfterDiscount: gross,
        discountAmount: roundMoney(toNumber(t.discountAmount, 0)),
        fullPaymentDiscount: roundMoney(toNumber(t.fullPaymentDiscount, 0)),
        netAmount: roundMoney(gross / (1 + vatRate)),
        vatRate,
        paymentMode:
          t.paymentMode === "full" || t.paymentMode === "split"
            ? t.paymentMode
            : doc.totals?.paymentMode || "split",
        stripeAmount: roundMoney(
          toNumber(t.stripeAmount, doc.totals?.stripeAmount ?? 0)
        ),
        paymentSchedule:
          t.paymentSchedule && typeof t.paymentSchedule === "object"
            ? t.paymentSchedule
            : doc.totals?.paymentSchedule || {},
      };
    }

    if (typeof body.notes === "string" && doc.type === "quote" && !scheduleOnly) {
      (doc as any).notes = cleanString(body.notes);
    }

    if (!scheduleOnly && body.builderState && typeof body.builderState === "object") {
      (doc as any).builderState = body.builderState;
      doc.markModified("builderState");
    }

    if (!scheduleOnly && body.quote && typeof body.quote === "object") {
      doc.quote = {
        ...(doc.quote || {}),
        createdAt: cleanString(body.quote.createdAt ?? doc.quote?.createdAt),
        expiresAt: cleanString(body.quote.expiresAt ?? doc.quote?.expiresAt),
        validityDays: toNumber(body.quote.validityDays ?? doc.quote?.validityDays, 4),
      };
    }

    if (!scheduleOnly && body.customerDealSummary && typeof body.customerDealSummary === "object") {
      (doc as any).customerDealSummary = body.customerDealSummary;
      doc.markModified("customerDealSummary");
    }

    if (!scheduleOnly && Array.isArray(body.paymentTerms)) {
      (doc as any).paymentTerms = body.paymentTerms;
      doc.markModified("paymentTerms");
    }
    if (!scheduleOnly && Array.isArray(body.cancellationTerms)) {
      (doc as any).cancellationTerms = body.cancellationTerms;
      doc.markModified("cancellationTerms");
    }
    if (!scheduleOnly && Array.isArray(body.additionalTerms)) {
      (doc as any).additionalTerms = body.additionalTerms;
      doc.markModified("additionalTerms");
    }
    if (!scheduleOnly && Array.isArray(body.engagementTerms)) {
      (doc as any).engagementTerms = body.engagementTerms;
      doc.markModified("engagementTerms");
    }

    let seatingScheduleChanged = false;

    if (body.seatingSchedule && typeof body.seatingSchedule === "object") {
      if (!orderIncludesVenueSeating(doc.upsells)) {
        return NextResponse.json(
          {
            success: false,
            error: "לוחות זמנים להושבה נשמרים רק בהזמנה שכוללת הושבה באולם.",
          },
          { status: 400 }
        );
      }

      const parsedSchedule = parseSeatingScheduleTimes(body.seatingSchedule);
      if (!parsedSchedule.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `שעות הושבה לא תקינות: ${parsedSchedule.missing.join(", ")}`,
          },
          { status: 400 }
        );
      }

      const actor = await resolveSeatingScheduleActor(req);
      const publishToCustomer = body.replaceCustomerSchedule === true;
      const applied = applySeatingScheduleUpdate({
        current: (doc as any).seatingSchedule,
        nextTimes: parsedSchedule.times,
        status: publishToCustomer ? "draft" : doc.status,
        actor,
      });
      if (!applied.ok) {
        return NextResponse.json(
          { success: false, error: applied.error },
          { status: 400 }
        );
      }

      seatingScheduleChanged = applied.changed;
      (doc as any).seatingSchedule = applied.schedule;
      doc.markModified("seatingSchedule");
    }

    await doc.save();

    // Sync CRM CustomerQuote index row
    if (doc._id) {
      const items = [
        {
          title: doc.selectedPackage?.title || "חבילה",
          description: doc.selectedPackage?.customerSummary || "",
          price: doc.selectedPackage?.price || 0,
        },
        ...((doc.upsells as any[]) || []).map((u) => ({
          title: cleanString(u?.title || u?.name || "תוספת"),
          description: cleanString(u?.description || ""),
          price: toNumber(u?.price, 0),
        })),
      ];

      await CustomerQuote.updateOne(
        { salesDocumentId: doc._id },
        {
          $set: {
            items,
            total: doc.totals?.grossAmountAfterDiscount || 0,
            updatedAt: new Date(),
          },
        }
      );
    }

    const scheduleFrozen = ["sent", "viewed", "signed", "expired"].includes(
      String(doc.status)
    );
    const message =
      scheduleOnly && scheduleFrozen && seatingScheduleChanged
        ? "השינוי המאוחר נשמר עם מועד וזהות המבצע. לוחות הזמנים המקוריים לא נדרסו."
        : scheduleOnly && scheduleFrozen
          ? "השעות זהות ללוח הזמנים המקורי, ולא נשמר שינוי."
          : doc.type === "agreement"
            ? "לוחות הזמנים נשמרו"
            : "ההצעה עודכנה בהצלחה";

    return NextResponse.json({
      success: true,
      hasUnpublishedRevision: false,
      document: doc.toObject(),
      seatingScheduleChanged,
      message,
    });
  } catch (err: any) {
    console.error("quote PATCH failed:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה בעדכון ההצעה" },
      { status: 500 }
    );
  }
}

/** GET — load quote for editing */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();
    const auth = await requireEditor(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "אין הרשאה" },
        { status: 403 }
      );
    }

    const { token } = await context.params;
    const doc = await SalesDocument.findOne({
      token: cleanString(token),
      type: { $in: ["quote", "agreement"] },
    }).lean();

    if (!doc) {
      return NextResponse.json(
        { success: false, error: "המסמך לא נמצא" },
        { status: 404 }
      );
    }

    const plain = doc as Record<string, unknown>;
    const convertedUserId = plain.convertedUserId
      ? String(plain.convertedUserId)
      : "";
    const linkedUser = convertedUserId
      ? await User.findById(convertedUserId)
          .select("_id email totalDealAmount paidAmount")
          .lean()
      : null;
    const linkedAgreement = await SalesDocument.findOne({
      type: "agreement",
      sourceQuoteToken: cleanString(plain.token),
    })
      .sort({ createdAt: -1 })
      .select("token status signedAt url")
      .lean();
    const view = editorView(plain);
    const totals = (view.totals || {}) as {
      grossAmountAfterDiscount?: number;
      grossAmount?: number;
    };
    const quoteGross = Number(
      totals.grossAmountAfterDiscount ?? totals.grossAmount ?? 0,
    );
    const activeDeal = Number((linkedUser as { totalDealAmount?: number } | null)?.totalDealAmount || 0);

    return NextResponse.json({
      success: true,
      document: view,
      meta: {
        hasUnpublishedRevision: Boolean(
          plain.draftRevision &&
            typeof plain.draftRevision === "object" &&
            Object.keys(plain.draftRevision as object).length > 0,
        ),
        publishedStatus: plain.status || "draft",
        userLinkStatus: userLinkStatus({
          convertedUserId,
          userExists: Boolean(linkedUser),
        }),
        convertedUserId,
        userEmail: (linkedUser as { email?: string } | null)?.email || "",
        linkedAgreement: linkedAgreement
          ? {
              token: (linkedAgreement as { token?: string }).token || "",
              status: (linkedAgreement as { status?: string }).status || "",
              url: (linkedAgreement as { url?: string }).url || "",
            }
          : null,
        dealGap: linkedUser ? describeDealGap(quoteGross, activeDeal) : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה" },
      { status: 500 }
    );
  }
}
