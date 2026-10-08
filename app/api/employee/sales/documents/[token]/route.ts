import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import SalesDocument from "@/models/SalesDocument";
import CustomerQuote from "@/models/CustomerQuote";
import User from "@/models/User";

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
    if (!doc || doc.type !== "quote") {
      return NextResponse.json(
        { success: false, error: "הצעת מחיר לא נמצאה" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Preserve original version for sent/viewed/signed quotes
    const shouldSnapshot = ["sent", "viewed", "signed"].includes(
      String(doc.status)
    );
    if (shouldSnapshot) {
      const history = Array.isArray((doc as any).versionHistory)
        ? [...(doc as any).versionHistory]
        : [];
      history.push({
        savedAt: new Date().toISOString(),
        savedByUserId: String(auth.userId),
        status: doc.status,
        client: doc.client,
        event: doc.event,
        selectedPackage: doc.selectedPackage,
        upsells: doc.upsells,
        totals: doc.totals,
        notes: (doc as any).notes || "",
      });
      (doc as any).versionHistory = history.slice(-20);
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
          toNumber(pkg.price ?? doc.selectedPackage?.price, 0)
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

    if (typeof body.notes === "string") {
      (doc as any).notes = cleanString(body.notes);
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

    return NextResponse.json({
      success: true,
      document: doc.toObject(),
      message: "ההצעה עודכנה בהצלחה",
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
      type: "quote",
    }).lean();

    if (!doc) {
      return NextResponse.json(
        { success: false, error: "הצעת מחיר לא נמצאה" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, document: doc });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה" },
      { status: 500 }
    );
  }
}
