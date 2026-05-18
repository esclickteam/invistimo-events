import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const adminUser = await User.findById(auth.userId)
      .select("_id role")
      .lean();

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "אין הרשאת אדמין לביצוע הפעולה",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);

    const userId = body?.userId ? String(body.userId) : "";
    const invitationId = body?.invitationId ? String(body.invitationId) : "";

    if (!userId || !invitationId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה משתמש או מזהה הזמנה",
        },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findOne({
      _id: invitationId,
      ownerId: userId,
    })
      .select("_id ownerId eventId")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          message: "לא נמצאה הזמנה מתאימה למשתמש הזה",
        },
        { status: 404 }
      );
    }

    const [guestsDeleteResult, groupsDeleteResult, invitationDeleteResult] =
      await Promise.all([
        InvitationGuest.deleteMany({
          invitationId,
        }),

        Group.deleteMany({
          invitationId,
        }),

        Invitation.deleteOne({
          _id: invitationId,
          ownerId: userId,
        }),
      ]);

    /*
      לא מוחקים את המשתמש.
      לא מוחקים את האירוע.
      רק מנקים הפניה אפשרית להזמנה אצל המשתמש, אם קיימת.
    */
    await User.updateOne(
      {
        _id: userId,
        invitationId,
      },
      {
        $unset: {
          invitationId: "",
        },
      }
    ).catch((err) => {
      console.warn("User invitationId cleanup skipped:", err);
    });

    return NextResponse.json({
      success: true,
      message: "ההזמנה נמחקה בהצלחה",
      deleted: {
        invitations: invitationDeleteResult.deletedCount || 0,
        guests: guestsDeleteResult.deletedCount || 0,
        groups: groupsDeleteResult.deletedCount || 0,
      },
    });
  } catch (err) {
    console.error("❌ Delete invitation admin error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "שגיאת שרת במחיקת ההזמנה",
      },
      { status: 500 }
    );
  }
}