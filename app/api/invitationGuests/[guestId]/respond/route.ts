import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import { recalcGroupExpectedCount } from "@/lib/recalcGroupExpectedCount";

export const dynamic = "force-dynamic"; // מבטל cache של Next.js

export async function POST(request: Request, context: any) {
  try {
    await db();

    // ✅ שינוי כאן — השם חייב להתאים לשם התיקייה ([id])
    const guestId = context?.params?.id;

    if (!guestId) {
      return NextResponse.json(
        { error: "Missing guestId in request" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rsvp, guestsCount, notes } = body;

    /* -------------------------------
       🔎 ולידציה בסיסית
    -------------------------------- */
    if (!rsvp || !["yes", "no", "pending"].includes(rsvp)) {
      return NextResponse.json(
        { error: "Invalid RSVP value" },
        { status: 400 }
      );
    }

    // אם סימן "לא מגיע" — כמות אורחים = 0
    let validatedGuestsCount = guestsCount;
    if (rsvp === "no") {
      validatedGuestsCount = 0;
    } else {
      // אם סימן "מגיע" ודיווח 0 — נדרש מינימום 1
      if (!validatedGuestsCount || validatedGuestsCount < 1) {
        validatedGuestsCount = 1;
      }
    }

    /* -------------------------------
       🔧 עדכון אורח בהזמנה
    -------------------------------- */
    // ✅ שומרים מצב קודם כדי לחשב גם לקבוצה הישנה וגם לחדשה (אם תשתנה בעתיד)
    const before = await InvitationGuest.findById(guestId).lean();

    const updatedGuest = await InvitationGuest.findByIdAndUpdate(
      guestId,
      {
        rsvp,
        guestsCount: validatedGuestsCount,
        notes: notes || "",
      },
      { new: true }
    ).lean();

    if (!updatedGuest) {
      return NextResponse.json(
        { error: "Guest not found" },
        { status: 404 }
      );
    }

    // ✅ סנכרון expectedCount בקבוצה (רק מי שמגיעים)
    const affected = new Set<string>();
    if (before?.groupId) affected.add(String(before.groupId));
    if (updatedGuest?.groupId) affected.add(String(updatedGuest.groupId));

    for (const gid of affected) {
      await recalcGroupExpectedCount(gid);
    }

    console.log("✅ RSVP updated:", {
      guestId: String(updatedGuest._id),
      rsvp: updatedGuest.rsvp,
      guestsCount: updatedGuest.guestsCount,
      groupId: updatedGuest.groupId ? String(updatedGuest.groupId) : null,
      affectedGroups: [...affected],
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
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
