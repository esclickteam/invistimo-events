import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import { recalcGroupExpectedCount } from "@/lib/recalcGroupExpectedCount";

export const dynamic = "force-dynamic"; // מבטל cache של Next.js

export async function POST(request: Request, context: any) {
  try {
    await db();

    const guestId = context?.params?.id;
    if (!guestId) {
      return NextResponse.json(
        { error: "Missing guestId in request" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rsvp, notes } = body;

    /* -------------------------------
       🔎 ולידציה בסיסית
    -------------------------------- */
    if (!rsvp || !["yes", "no", "pending"].includes(rsvp)) {
      return NextResponse.json(
        { error: "Invalid RSVP value" },
        { status: 400 }
      );
    }

    /* -------------------------------
       🔧 שליפת מצב קודם
    -------------------------------- */
    const before = await InvitationGuest.findById(guestId).lean();
    if (!before) {
      return NextResponse.json(
        { error: "Guest not found" },
        { status: 404 }
      );
    }

    /* -------------------------------
       🔁 חישוב arrivedCount בלבד
       ❗ guestsCount לא משתנה כאן
    -------------------------------- */
    const arrivedCount =
      rsvp === "yes"
        ? Number(before.guestsCount || 1)
        : 0;

    /* -------------------------------
       💾 עדכון האורח
    -------------------------------- */
    const updatedGuest = await InvitationGuest.findByIdAndUpdate(
      guestId,
      {
        rsvp,
        arrivedCount,
        ...(typeof notes === "string" ? { notes } : {}),
      },
      { new: true }
    ).lean();

    if (!updatedGuest) {
      return NextResponse.json(
        { error: "Guest not found after update" },
        { status: 404 }
      );
    }

    /* -------------------------------
       🔄 סנכרון קבוצות (אם יש)
    -------------------------------- */
    const affected = new Set<string>();
    if (before.groupId) affected.add(String(before.groupId));
    if (updatedGuest.groupId) affected.add(String(updatedGuest.groupId));

    for (const gid of affected) {
      await recalcGroupExpectedCount(gid);
    }

    console.log("✅ RSVP updated correctly:", {
      guestId: String(updatedGuest._id),
      rsvp: updatedGuest.rsvp,
      guestsCount: updatedGuest.guestsCount, // 🔒 נשאר כמו שהיה
      arrivedCount: updatedGuest.arrivedCount,
      groupId: updatedGuest.groupId ? String(updatedGuest.groupId) : null,
    });

    return NextResponse.json(
      {
        success: true,
        guest: updatedGuest,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error updating RSVP:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
