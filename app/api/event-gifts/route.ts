import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EventGift from "@/models/EventGift";
import InvitationGuest from "@/models/InvitationGuest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYMENT_METHODS = [
  "cash",
  "bit",
  "paybox",
  "checks",
  "bank_transfer",
  "credit_gifts",
  "other",
  "",
];

function toObjectId(value: string | null) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function normalizeArrivalStatus(guest: any) {
  const raw =
    guest?.status ||
    guest?.arrivalStatus ||
    guest?.rsvpStatus ||
    guest?.attendanceStatus ||
    "";

  const value = String(raw).toLowerCase();

  if (
    value === "coming" ||
    value === "approved" ||
    value === "confirmed" ||
    value === "yes" ||
    value === "מגיע"
  ) {
    return "coming";
  }

  if (
    value === "not_coming" ||
    value === "not-coming" ||
    value === "declined" ||
    value === "no" ||
    value === "לא מגיע"
  ) {
    return "not_coming";
  }

  if (
    value === "pending" ||
    value === "waiting" ||
    value === "maybe" ||
    value === "בהמתנה"
  ) {
    return "pending";
  }

  return "unknown";
}

function getConfirmedCount(guest: any) {
  const value =
    guest?.confirmedCount ??
    guest?.comingCount ??
    guest?.attendingCount ??
    guest?.approvedCount ??
    guest?.guestsCount ??
    guest?.count ??
    null;

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return null;

  return numberValue;
}

async function syncGuestsToGifts(eventObjectId: mongoose.Types.ObjectId) {
  const guests = await InvitationGuest.find({
    eventId: eventObjectId,
  })
    .select(
      "_id invitationId name fullName phone relation status arrivalStatus rsvpStatus attendanceStatus confirmedCount comingCount attendingCount approvedCount guestsCount count"
    )
    .lean();

  if (!guests.length) return;

  await Promise.all(
    guests.map(async (guest: any) => {
      const guestName = String(guest.name || guest.fullName || "").trim();

      if (!guestName) return;

      const existing = await EventGift.findOne({
        eventId: eventObjectId,
        guestId: guest._id,
      }).lean();

      if (existing) return;

      await EventGift.create({
        eventId: eventObjectId,
        invitationId: guest.invitationId || null,
        guestId: guest._id,
        guestName,
        phone: guest.phone || "",
        relation: guest.relation || "",
        arrivalStatus: normalizeArrivalStatus(guest),
        confirmedCount: getConfirmedCount(guest),
        giftAmount: 0,
        paymentMethod: "",
        notes: "",
        isManual: false,
        isDeleted: false,
      });
    })
  );
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const eventObjectId = toObjectId(eventId);

    if (!eventObjectId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר eventId תקין",
        },
        { status: 400 }
      );
    }

    await syncGuestsToGifts(eventObjectId);

    const gifts = await EventGift.find({
      eventId: eventObjectId,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: 1 })
      .lean();

    const totalGifts = gifts.reduce((sum: number, gift: any) => {
      return sum + Number(gift.giftAmount || 0);
    }, 0);

    const totalsByPaymentMethod = gifts.reduce((acc: any, gift: any) => {
      const method = gift.paymentMethod || "other";
      acc[method] = (acc[method] || 0) + Number(gift.giftAmount || 0);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      gifts,
      summary: {
        totalGifts,
        totalsByPaymentMethod,
        totalRows: gifts.length,
        rowsWithGift: gifts.filter((gift: any) => Number(gift.giftAmount || 0) > 0)
          .length,
        rowsWithoutGift: gifts.filter(
          (gift: any) => Number(gift.giftAmount || 0) <= 0
        ).length,
      },
    });
  } catch (error: any) {
    console.error("GET /api/event-gifts error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "שגיאה בטעינת מתנות",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const body = await req.json();

    const eventObjectId = toObjectId(body.eventId);
    const invitationObjectId = toObjectId(body.invitationId);

    if (!eventObjectId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר eventId תקין",
        },
        { status: 400 }
      );
    }

    const guestName = String(body.guestName || "").trim();

    if (!guestName) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה להזין שם",
        },
        { status: 400 }
      );
    }

    const paymentMethod = PAYMENT_METHODS.includes(body.paymentMethod)
      ? body.paymentMethod
      : "";

    const gift = await EventGift.create({
      eventId: eventObjectId,
      invitationId: invitationObjectId,
      guestId: null,
      guestName,
      phone: body.phone || "",
      relation: body.relation || "",
      arrivalStatus: body.arrivalStatus || "",
      confirmedCount:
        body.confirmedCount === "" || body.confirmedCount === null
          ? null
          : Number(body.confirmedCount),
      giftAmount: Number(body.giftAmount || 0),
      paymentMethod,
      notes: body.notes || "",
      isManual: true,
      isDeleted: false,
    });

    return NextResponse.json({
      success: true,
      gift,
    });
  } catch (error: any) {
    console.error("POST /api/event-gifts error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "שגיאה בהוספת מתנה",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await db();

    const body = await req.json();

    const giftObjectId = toObjectId(body.giftId);

    if (!giftObjectId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר giftId תקין",
        },
        { status: 400 }
      );
    }

    const update: any = {};

    if ("guestName" in body) update.guestName = String(body.guestName || "").trim();
    if ("phone" in body) update.phone = body.phone || "";
    if ("relation" in body) update.relation = body.relation || "";
    if ("arrivalStatus" in body) update.arrivalStatus = body.arrivalStatus || "";

    if ("confirmedCount" in body) {
      update.confirmedCount =
        body.confirmedCount === "" || body.confirmedCount === null
          ? null
          : Number(body.confirmedCount);
    }

    if ("giftAmount" in body) {
      update.giftAmount = Number(body.giftAmount || 0);
    }

    if ("paymentMethod" in body) {
      update.paymentMethod = PAYMENT_METHODS.includes(body.paymentMethod)
        ? body.paymentMethod
        : "";
    }

    if ("notes" in body) update.notes = body.notes || "";

    const gift = await EventGift.findByIdAndUpdate(giftObjectId, update, {
      new: true,
    });

    if (!gift) {
      return NextResponse.json(
        {
          success: false,
          message: "המתנה לא נמצאה",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      gift,
    });
  } catch (error: any) {
    console.error("PATCH /api/event-gifts error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "שגיאה בעדכון מתנה",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);
    const giftId = searchParams.get("giftId");

    const giftObjectId = toObjectId(giftId);

    if (!giftObjectId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר giftId תקין",
        },
        { status: 400 }
      );
    }

    const gift = await EventGift.findByIdAndUpdate(
      giftObjectId,
      {
        isDeleted: true,
      },
      {
        new: true,
      }
    );

    if (!gift) {
      return NextResponse.json(
        {
          success: false,
          message: "המתנה לא נמצאה",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("DELETE /api/event-gifts error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "שגיאה במחיקת מתנה",
      },
      { status: 500 }
    );
  }
}