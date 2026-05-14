import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    /* =====================================================
       1. בדיקת התחברות
    ===================================================== */
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    /* =====================================================
       2. בדיקת הרשאת אדמין
    ===================================================== */
    const user = await User.findById(userId).lean();

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "אין הרשאת אדמין",
        },
        { status: 403 }
      );
    }

    /* =====================================================
       3. קבלת invitationId מהפרונט
    ===================================================== */
    const body = await req.json();
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר invitationId",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return NextResponse.json(
        {
          success: false,
          message: "invitationId לא תקין",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       4. מחיקת כל המוזמנים של ההזמנה בלבד
    ===================================================== */
    const result = await InvitationGuest.deleteMany({
      invitationId: new mongoose.Types.ObjectId(invitationId),
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount || 0,
      message: `נמחקו ${result.deletedCount || 0} מוזמנים בהצלחה`,
    });
  } catch (error) {
    console.error("❌ Delete all guests error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "שגיאה במחיקת כל המוזמנים",
      },
      { status: 500 }
    );
  }
}