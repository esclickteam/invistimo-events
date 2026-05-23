import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import VenueSeatingTemplate from "@/models/VenueSeatingTemplate";
import { getUserIdFromRequest } from "@/lib/auth";
import connectDB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = {
  params: Promise<{
    templateId: string;
  }>;
};

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

export async function DELETE(req: NextRequest, { params }: Params) {
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

    const { templateId } = await params;

    if (!templateId || !mongoose.Types.ObjectId.isValid(templateId)) {
      return NextResponse.json(
        { success: false, error: "מזהה תבנית לא תקין" },
        { status: 400 }
      );
    }

    const template = await VenueSeatingTemplate.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(templateId),
        ownerId: new mongoose.Types.ObjectId(userId),
      },
      {
        $set: {
          isActive: false,
        },
      },
      { new: true }
    );

    if (!template) {
      return NextResponse.json(
        { success: false, error: "התבנית לא נמצאה" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("DELETE venue seating template error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה במחיקת תבנית הושבה",
      },
      { status: 500 }
    );
  }
}