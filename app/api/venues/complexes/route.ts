import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
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

    const complexes = await VenueComplex.find({
      ownerId: auth.userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      complexes,
    });
  } catch (error) {
    console.error("GET /api/venues/complexes error:", error);

    return NextResponse.json(
      { success: false, error: "שגיאה בטעינת המתחמים" },
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

    if (!name) {
      return NextResponse.json(
        { success: false, error: "שם מתחם הוא שדה חובה" },
        { status: 400 }
      );
    }

    const complex = await VenueComplex.create({
      ownerId: auth.userId,
      name,
      businessName: body.businessName || "",
      phone: body.phone || "",
      email: body.email || "",
      address: body.address || "",
      city: body.city || "",
      description: body.description || "",
      logoUrl: body.logoUrl || "",
      coverImageUrl: body.coverImageUrl || "",
      status: body.status || "active",
    });

    return NextResponse.json({
      success: true,
      complex,
    });
  } catch (error) {
    console.error("POST /api/venues/complexes error:", error);

    return NextResponse.json(
      { success: false, error: "שגיאה ביצירת מתחם" },
      { status: 500 }
    );
  }
}