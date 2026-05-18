import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import VenueClient from "@/models/VenueClient";
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

    const status = searchParams.get("status");
    const q = searchParams.get("q");

    const filter: Record<string, unknown> = {
      ownerId: auth.userId,
    };

    if (status && status !== "all") {
      filter.status = status;
    }

    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { eventType: { $regex: q, $options: "i" } },
      ];
    }

    const clients = await VenueClient.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      clients,
    });
  } catch (error) {
    console.error("GET /api/venues/clients error:", error);

    return NextResponse.json(
      { success: false, error: "שגיאה בטעינת לקוחות" },
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

    const fullName = String(body.fullName || "").trim();
    const complexId = body.complexId ? String(body.complexId).trim() : "";

    if (!fullName) {
      return NextResponse.json(
        { success: false, error: "שם לקוח הוא שדה חובה" },
        { status: 400 }
      );
    }

    if (complexId) {
      if (!mongoose.Types.ObjectId.isValid(complexId)) {
        return NextResponse.json(
          { success: false, error: "מזהה מתחם לא תקין" },
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
    }

    const client = await VenueClient.create({
      ownerId: auth.userId,
      complexId: complexId || undefined,
      fullName,
      phone: body.phone || "",
      email: body.email || "",
      eventType: body.eventType || "",
      requestedDate: body.requestedDate || null,
      estimatedGuests: Number(body.estimatedGuests || 0),
      budget: Number(body.budget || 0),
      leadSource: body.leadSource || "other",
      status: body.status || "new_lead",
      notes: body.notes || "",
      tags: Array.isArray(body.tags) ? body.tags : [],
      lastContactAt: body.lastContactAt || null,
      nextFollowUpAt: body.nextFollowUpAt || null,
    });

    return NextResponse.json({
      success: true,
      client,
    });
  } catch (error) {
    console.error("POST /api/venues/clients error:", error);

    return NextResponse.json(
      { success: false, error: "שגיאה ביצירת לקוח" },
      { status: 500 }
    );
  }
}