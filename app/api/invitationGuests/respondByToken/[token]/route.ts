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
    const { rsvp, guestsCount, notes, arrivedCount } = body;

    console.log("🟦 [respondByToken] token:", token);
    console.log("🟦 [respondByToken] body:", body);

    // ✅ ולידציה ל-rsvp
    if (!rsvp || !["yes", "no", "pending"].includes(rsvp)) {
      console.log("🟥 [respondByToken] invalid rsvp:", rsvp);
      return NextResponse.json(
        { success: false, error: "Invalid RSVP value" },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    // ✅ guestsCount תקין (0 חוקי כשלא מגיע)
    let validatedGuestsCount = Number(guestsCount);
    if (rsvp === "no") validatedGuestsCount = 0;
    else if (!Number.isFinite(validatedGuestsCount) || validatedGuestsCount < 1)
      validatedGuestsCount = 1;

    // ✅ arrivedCount (לא חובה)
    let validatedArrivedCount: number | undefined = undefined;
    if (arrivedCount !== undefined) {
      const n = Number(arrivedCount);
      if (Number.isFinite(n) && n >= 0) validatedArrivedCount = n;
    }

    const guest = await InvitationGuest.findOne({ token });
    if (!guest) {
      console.log("🟥 [respondByToken] guest not found for token:", token);
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    console.log("🟨 [respondByToken] BEFORE:", {
      _id: guest._id?.toString?.() || String(guest._id),
      invitationId: guest.invitationId?.toString?.() || String(guest.invitationId),
      rsvp: guest.rsvp,
      guestsCount: guest.guestsCount,
      arrivedCount: guest.arrivedCount,
      notes: guest.notes,
      updatedAt: guest.updatedAt,
    });

    // ✅ עדכון
    guest.rsvp = rsvp;
    guest.guestsCount = validatedGuestsCount;

    // אם נשלח arrivedCount — שומרים
    if (validatedArrivedCount !== undefined) {
      guest.arrivedCount = validatedArrivedCount;
    }

    // ✅ notes: תומך גם במערך וגם במחרוזת
    if (notes !== undefined) {
      if (typeof notes === "string") guest.notes = notes;
      else if (Array.isArray(notes)) guest.notes = notes.join(", ");
      else guest.notes = "";
    }

    await guest.save();

    // ✅ שליפה מחדש כדי לראות מה באמת נשמר במונגו
    const fresh = await InvitationGuest.findById(guest._id).lean();

    console.log("🟩 [respondByToken] AFTER (fresh):", {
      _id: fresh?._id?.toString?.() || String(fresh?._id),
      invitationId:
        (fresh as any)?.invitationId?.toString?.() || String((fresh as any)?.invitationId),
      rsvp: (fresh as any)?.rsvp,
      guestsCount: (fresh as any)?.guestsCount,
      arrivedCount: (fresh as any)?.arrivedCount,
      notes: (fresh as any)?.notes,
      updatedAt: (fresh as any)?.updatedAt,
    });

    return NextResponse.json(
      { success: true, guest: fresh },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.error("❌ [respondByToken] error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
