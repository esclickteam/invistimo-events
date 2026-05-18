import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import VenueHall from "@/models/VenueHall";
import VenueComplex from "@/models/VenueComplex";
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
    const complexId = searchParams.get("complexId");

    const filter: Record<string, unknown> = {
      ownerId: auth.userId,
    };

    if (complexId) {
      if (!mongoose.Types.ObjectId.isValid(complexId)) {
        return NextResponse.json(
          { success: false, error: "מזהה מתחם לא תקין" },
          { status: 400 }
        );
      }

      filter.complexId = complexId;
    }

    const halls = await VenueHall.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      halls,
    });
  } catch (error) {
    console.error("GET /api/venues/halls error:", error);

    return NextResponse.json(
      { success: false, error: "שגיאה בטעינת האולמות" },
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

    const name = String(body.name || "").trim();
    const complexId = String(body.complexId || "").trim();

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

    if (!name) {
      return NextResponse.json(
        { success: false, error: "שם אולם הוא שדה חובה" },
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

    const hall = await VenueHall.create({
      ownerId: auth.userId,
      complexId,
      name,
      description: body.description || "",
      minGuests: Number(body.minGuests || 0),
      maxGuests: Number(body.maxGuests || 0),
      basePricePerGuest: Number(body.basePricePerGuest || 0),
      eventTypes: Array.isArray(body.eventTypes) ? body.eventTypes : [],
      features: Array.isArray(body.features) ? body.features : [],
      floorPlanUrl: body.floorPlanUrl || "",
      gallery: Array.isArray(body.gallery) ? body.gallery : [],
      status: body.status || "active",
    });

    return NextResponse.json({
      success: true,
      hall,
    });
  } catch (error) {
    console.error("POST /api/venues/halls error:", error);

    return NextResponse.json(
      { success: false, error: "שגיאה ביצירת אולם" },
      { status: 500 }
    );
  }
}