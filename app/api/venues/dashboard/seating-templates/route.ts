import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import VenueSeatingTemplate from "@/models/VenueSeatingTemplate";
import { getUserIdFromRequest } from "@/lib/auth";
import connectDB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extractUserId(authResult: any): string | null {
  if (!authResult) return null;

  if (typeof authResult === "string") {
    return authResult;
  }

   if (authResult.userId) {
    return String(authResult.userId);
  }

  if (authResult.id) {
    return String(authResult.id);
  }

  if (authResult._id) {
    return String(authResult._id);
  }

  if (authResult.user?._id) {
    return String(authResult.user._id);
  }

  if (authResult.user?.id) {
    return String(authResult.user.id);
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authResult = await getUserIdFromRequest(req);
    const userId = extractUserId(authResult);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const hallId = searchParams.get("hallId");

    if (!hallId) {
      return NextResponse.json(
        { success: false, error: "חסר hallId" },
        { status: 400 }
      );
    }

    const templates = await VenueSeatingTemplate.find({
      ownerId: new mongoose.Types.ObjectId(userId),
      hallId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error("GET venue seating templates error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בשליפת תבניות הושבה",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authResult = await getUserIdFromRequest(req);
    const userId = extractUserId(authResult);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      hallId,
      hallName,
      name,
      description,
      tables,
      canvas,
      settings,
    } = body || {};

    if (!hallId) {
      return NextResponse.json(
        { success: false, error: "חסר hallId" },
        { status: 400 }
      );
    }

    if (!name || String(name).trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "חסר שם תבנית" },
        { status: 400 }
      );
    }

    const template = await VenueSeatingTemplate.create({
      ownerId: new mongoose.Types.ObjectId(userId),
      hallId: String(hallId),
      hallName: hallName ? String(hallName) : "",
      name: String(name).trim(),
      description: description ? String(description) : "",
      tables: Array.isArray(tables) ? tables : [],
      canvas: canvas || {},
      settings: settings || {},
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error: any) {
    console.error("POST venue seating template error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בשמירת תבנית הושבה",
      },
      { status: 500 }
    );
  }
}