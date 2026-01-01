import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";
export const revalidate = 0; // ✅ עוד חיזוק נגד קאש

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  try {
    await db();

    // ✅ לוגים שיעזרו להבין אם זה מגיע לטוקן הנכון ואם זה מחזיר נתון מעודכן
    console.log("🟦 [GET byToken] token:", token);

    const guest = await InvitationGuest.findOne({ token }).lean();

    console.log("🟩 [GET byToken] found:", !!guest);
    if (guest) {
      console.log("🧾 [GET byToken] guest fields:", {
        _id: guest._id,
        invitationId: guest.invitationId,
        name: guest.name,
        rsvp: guest.rsvp,
        guestsCount: guest.guestsCount,
        arrivedCount: guest.arrivedCount,
        updatedAt: guest.updatedAt,
      });
    }

    if (!guest) {
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

    return NextResponse.json(
      { success: true, guest },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.error("❌ [GET byToken] Error loading guest by token:", err);
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
