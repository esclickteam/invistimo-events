import { NextRequest, NextResponse } from "next/server";
import VenueEventPayment from "@/models/VenueEventPayment";
import { connectDB } from "@/lib/db";
import { requireLinkedVenueEventAccess } from "@/lib/venues/requireLinkedEventAccess";
import { writeVenueAudit } from "@/lib/venues/audit";
import { createVenueAlert } from "@/lib/venues/alerts";

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalizeExtras(raw: any) {
  const rows = Array.isArray(raw) ? raw : [];

  return rows.map((item: any, index: number) => ({
    id: String(item?.id || `extra-${index + 1}`),
    title: String(item?.title || "").trim(),
    quantity: n(item?.quantity),
    unitPrice: n(item?.unitPrice),
    notes: String(item?.notes || "").trim(),
  }));
}

function normalizeStatus(value: unknown) {
  return value === "closed" ? "closed" : "open";
}

function calculateSummary(data: any) {
  const estimatedGuests = n(data?.estimatedGuests);
  const reserveGuests = n(data?.reserveGuests);
  const pricePerGuest = n(data?.pricePerGuest);
  const actualGuests = n(data?.actualGuests);
  const advancePayment = n(data?.advancePayment);
  const paidAmount = n(data?.paidAmount);
  const extras = normalizeExtras(data?.extras);

  const plannedGuests = estimatedGuests + reserveGuests;
  const plannedMealTotal = plannedGuests * pricePerGuest;
  const actualMealTotal = actualGuests * pricePerGuest;
  const extrasTotal = extras.reduce(
    (sum, item) => sum + n(item.quantity) * n(item.unitPrice),
    0
  );
  const finalTotal = actualMealTotal + extrasTotal;
  const totalPaid = advancePayment + paidAmount;
  const remainingToPay = Math.max(0, finalTotal - totalPaid);
  const reserveOverflow = Math.max(0, actualGuests - plannedGuests);

  return {
    plannedGuests,
    plannedMealTotal,
    actualMealTotal,
    extrasTotal,
    finalTotal,
    totalPaid,
    remainingToPay,
    reserveOverflow,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();
    const { eventId } = await params;

    const guard = await requireLinkedVenueEventAccess(
      request,
      eventId,
      "finance.view"
    );
    if (guard.error) return guard.error;

    const doc = await VenueEventPayment.findOne({ eventId }).lean();

    if (!doc) {
      const empty = {
        eventId,
        hallId: "",
        estimatedGuests: 0,
        reserveGuests: 0,
        pricePerGuest: 0,
        actualGuests: 0,
        advancePayment: 0,
        paidAmount: 0,
        extras: [],

        bankName: "",
        bankBranch: "",
        bankAccountNumber: "",
        bankAccountHolder: "",

        paymentSmsPhone: "",
        paymentSmsMessage: "",
        notes: "",
        status: "open",
        closedAt: null,
        updatedAt: null,
      };

      return NextResponse.json({
        success: true,
        data: {
          ...empty,
          summary: calculateSummary(empty),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...doc,
        status: normalizeStatus(doc.status),
        summary: calculateSummary(doc),
      },
    });
  } catch (error) {
    console.error("GET hall payments error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load hall payments" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();
    const { eventId } = await params;

    const guard = await requireLinkedVenueEventAccess(
      request,
      eventId,
      "finance.edit"
    );
    if (guard.error) return guard.error;

    const body = await request.json();

    const status = normalizeStatus(body?.status);

    const payload = {
      eventId,
      hallId: String(body?.hallId || "").trim(),
      estimatedGuests: n(body?.estimatedGuests),
      reserveGuests: n(body?.reserveGuests),
      pricePerGuest: n(body?.pricePerGuest),
      actualGuests: n(body?.actualGuests),
      advancePayment: n(body?.advancePayment),
      paidAmount: n(body?.paidAmount),
      extras: normalizeExtras(body?.extras),

      bankName: String(body?.bankName || "").trim(),
      bankBranch: String(body?.bankBranch || "").trim(),
      bankAccountNumber: String(body?.bankAccountNumber || "").trim(),
      bankAccountHolder: String(body?.bankAccountHolder || "").trim(),

      paymentSmsPhone: String(body?.paymentSmsPhone || "").trim(),
      paymentSmsMessage: String(body?.paymentSmsMessage || "").trim(),
      notes: String(body?.notes || "").trim(),
      status,
      closedAt: status === "closed" ? new Date() : null,
    };

    const doc = await VenueEventPayment.findOneAndUpdate(
      { eventId },
      { $set: payload },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    const ctx = guard.ctx!;
    await writeVenueAudit({
      venueId: String(ctx.venueId),
      ownerId: String(ctx.ownerId),
      actorUserId: String(ctx.auth.userId),
      action: "hall_payments.update",
      targetType: "VenueEventPayment",
      targetId: String((doc as any)?._id || eventId),
      meta: { eventId, status },
    });

    if (status === "closed") {
      await createVenueAlert({
        ownerId: String(ctx.ownerId),
        hallId: String(ctx.venueId),
        title: "תשלומי אולם נסגרו",
        description: `אירוע ${eventId}`,
        tone: "emerald",
        type: "payments",
        linkHref: `/venues/dashboard/events/${encodeURIComponent(eventId)}`,
        dedupeKey: `payments-closed:${eventId}`,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...doc,
        status: normalizeStatus(doc?.status),
        summary: calculateSummary(doc),
      },
    });
  } catch (error) {
    console.error("PUT hall payments error", error);
    return NextResponse.json(
      { success: false, error: "Failed to save hall payments" },
      { status: 500 }
    );
  }
}
