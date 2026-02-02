import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  try {
    await db();

    const body = await req.json();
    const { rsvp, notes, arrivedCount } = body;

    console.log("🟦 [respondByToken] token:", token);
    console.log("🟦 [respondByToken] body:", body);

    /* -------------------------------
       🔎 ולידציה ל-RSVP
    -------------------------------- */
    if (!rsvp || !["yes", "no", "pending"].includes(rsvp)) {
      return NextResponse.json(
        { success: false, error: "Invalid RSVP value" },
        { status: 400 }
      );
    }

    /* -------------------------------
       🔎 שליפת האורח
    -------------------------------- */
    const guest = await InvitationGuest.findOne({ token });
    if (!guest) {
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    console.log("🟨 BEFORE UPDATE:", {
      _id: guest._id.toString(),
      rsvp: guest.rsvp,
      guestsCount: guest.guestsCount,
      arrivedCount: guest.arrivedCount,
    });

    /* -------------------------------
       🔢 חישוב arrivedCount בלבד
       ❗ guestsCount לא נוגעים
    -------------------------------- */
    let validatedArrivedCount: number;

    if (arrivedCount !== undefined) {
      const n = Number(arrivedCount);
      validatedArrivedCount =
        Number.isFinite(n) && n >= 0
          ? n
          : Number(guest.guestsCount || 1);
    } else {
      validatedArrivedCount =
        rsvp === "yes" ? Number(guest.guestsCount || 1) : 0;
    }

    /* -------------------------------
       💾 עדכון
    -------------------------------- */
    guest.rsvp = rsvp;
    guest.arrivedCount = validatedArrivedCount;

    // ✅ notes
    if (notes !== undefined) {
      if (typeof notes === "string") guest.notes = notes;
      else if (Array.isArray(notes)) guest.notes = notes.join(", ");
      else guest.notes = "";
    }

    await guest.save();

    const fresh = await InvitationGuest.findById(guest._id).lean();

    console.log("🟩 AFTER UPDATE:", {
      _id: fresh?._id?.toString(),
      rsvp: fresh?.rsvp,
      guestsCount: fresh?.guestsCount, // 🔒 נשמר
      arrivedCount: fresh?.arrivedCount,
    });

    return NextResponse.json(
      { success: true, guest: fresh },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ [respondByToken] error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
