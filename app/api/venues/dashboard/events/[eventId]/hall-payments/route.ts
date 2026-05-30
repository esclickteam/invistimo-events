import { NextRequest, NextResponse } from "next/server";
import VenueEventPayment from "@/models/VenueEventPayment";
import connectDB from "@/lib/mongodb";

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
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();
    const { eventId } = await params;

    const doc = await VenueEventPayment.findOne({ eventId }).lean();

    if (!doc) {
      return NextResponse.json({
        success: true,
        data: {
          eventId,
          hallId: "",
          estimatedGuests: 0,
          reserveGuests: 0,
          pricePerGuest: 0,
          actualGuests: 0,
          advancePayment: 0,
          paidAmount: 0,
          extras: [],
          notes: "",
          status: "draft",
          closedAt: null,
          updatedAt: null,
          summary: calculateSummary({}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...doc,
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
    const body = await request.json();

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
      notes: String(body?.notes || "").trim(),
      status: body?.status === "closed" ? "closed" : "draft",
      closedAt: body?.status === "closed" ? new Date() : null,
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

    return NextResponse.json({
      success: true,
      data: {
        ...doc,
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
