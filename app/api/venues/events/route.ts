import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import VenueEvent from "@/models/VenueEvent";
import VenueComplex from "@/models/VenueComplex";
import VenueHall from "@/models/VenueHall";
import VenueClient from "@/models/VenueClient";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const complexId = searchParams.get("complexId");
    const hallId = searchParams.get("hallId");

    const filter: Record<string, unknown> = {
      ownerId: auth.userId,
    };

    if (status && status !== "all") {
      filter.status = status;
    }

    if (complexId) {
      if (!mongoose.Types.ObjectId.isValid(complexId)) {
        return NextResponse.json(
          { success: false, error: "מזהה מתחם לא תקין" },
          { status: 400 }
        );
      }

      filter.complexId = complexId;
    }

    if (hallId) {
      if (!mongoose.Types.ObjectId.isValid(hallId)) {
        return NextResponse.json(
          { success: false, error: "מזהה אולם לא תקין" },
          { status: 400 }
        );
      }

      filter.hallId = hallId;
    }

    const events = await VenueEvent.find(filter)
      .populate("complexId", "name city address")
      .populate("hallId", "name minGuests maxGuests")
      .populate("clientId", "fullName phone email eventType")
      .sort({ eventDate: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("GET /api/venues/events error:", error);

    return NextResponse.json(
      { success: false, error: "שגיאה בטעינת אירועים" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const title = String(body.title || "").trim();
    const complexId = String(body.complexId || "").trim();
    const hallId = body.hallId ? String(body.hallId).trim() : "";
    const clientId = body.clientId ? String(body.clientId).trim() : "";
    const invitationId = body.invitationId
      ? String(body.invitationId).trim()
      : "";

    if (!title) {
      return NextResponse.json(
        { success: false, error: "שם אירוע הוא שדה חובה" },
        { status: 400 }
      );
    }

    if (!complexId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה מתחם" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(complexId)) {
      return NextResponse.json(
        { success: false, error: "מזהה מתחם לא תקין" },
        { status: 400 }
      );
    }

    if (!body.eventDate) {
      return NextResponse.json(
        { success: false, error: "תאריך אירוע הוא שדה חובה" },
        { status: 400 }
      );
    }

    const complex = await VenueComplex.findOne({
      _id: complexId,
      ownerId: auth.userId,
    }).lean();

    if (!complex) {
      return NextResponse.json(
        { success: false, error: "המתחם לא נמצא או לא שייך למשתמש" },
        { status: 404 }
      );
    }

    if (hallId) {
      if (!mongoose.Types.ObjectId.isValid(hallId)) {
        return NextResponse.json(
          { success: false, error: "מזהה אולם לא תקין" },
          { status: 400 }
        );
      }

      const hall = await VenueHall.findOne({
        _id: hallId,
        ownerId: auth.userId,
        complexId,
      }).lean();

      if (!hall) {
        return NextResponse.json(
          { success: false, error: "האולם לא נמצא או לא שייך למתחם" },
          { status: 404 }
        );
      }
    }

    if (clientId) {
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        return NextResponse.json(
          { success: false, error: "מזהה לקוח לא תקין" },
          { status: 400 }
        );
      }

      const client = await VenueClient.findOne({
        _id: clientId,
        ownerId: auth.userId,
      }).lean();

      if (!client) {
        return NextResponse.json(
          { success: false, error: "הלקוח לא נמצא או לא שייך למשתמש" },
          { status: 404 }
        );
      }
    }

    if (invitationId && !mongoose.Types.ObjectId.isValid(invitationId)) {
      return NextResponse.json(
        { success: false, error: "מזהה הזמנה לא תקין" },
        { status: 400 }
      );
    }

    const expectedGuests = Number(body.expectedGuests || 0);
    const pricePerGuest = Number(body.pricePerGuest || 0);

    const event = await VenueEvent.create({
      ownerId: auth.userId,
      complexId,
      hallId: hallId || undefined,
      clientId: clientId || undefined,
      invitationId: invitationId || undefined,
      title,
      eventType: body.eventType || "",
      eventDate: body.eventDate,
      startTime: body.startTime || "",
      endTime: body.endTime || "",
      expectedGuests,
      confirmedGuests: Number(body.confirmedGuests || 0),
      arrivedGuests: Number(body.arrivedGuests || 0),
      pricePerGuest,
      totalEstimatedPrice: expectedGuests * pricePerGuest,
      menuStatus: body.menuStatus || "not_started",
      seatingStatus: body.seatingStatus || "not_started",
      rsvpStatus: body.rsvpStatus || "not_started",
      paymentStatus: body.paymentStatus || "unpaid",
      status: body.status || "booked",
      notes: body.notes || "",
    });

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("POST /api/venues/events error:", error);

    return NextResponse.json(
      { success: false, error: "שגיאה ביצירת אירוע" },
      { status: 500 }
    );
  }
}