import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import SeatingTable from "@/models/SeatingTable";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

/* ============================================================
   Types
============================================================ */
type SeatedGuest = {
  guestId: Types.ObjectId;
  seatIndex: number;
};

type TableItem = {
  id: string;
  name?: string;
  seatedGuests?: SeatedGuest[];
};

export async function GET(request: Request) {
  try {
    await db();
    console.log("✅ MongoDB connected");

    /* ===============================
       Auth
    =============================== */
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      console.log("⛔ No auth");
      return NextResponse.json({ guests: [] });
    }

    const userId = auth.userId;

    /* ===============================
       invitationId מה-URL (⭐ חובה)
    =============================== */
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("invitation");

    if (!invitationId) {
      console.log("⛔ No invitationId");
      return NextResponse.json({ guests: [] });
    }

    /* ===============================
       בדיקת הרשאה להזמנה
    =============================== */
    const invitation = await Invitation.findOne({
      _id: invitationId,
      $or: [
        { ownerId: userId },    // לקוח
        { producerId: userId }, // מפיק
      ],
    })
      .select("_id eventId")
      .lean();

    if (!invitation) {
      console.log("⛔ Invitation not found / no permission");
      return NextResponse.json({ guests: [] });
    }

    console.log("📩 Invitation OK:", invitation._id.toString());

    /* ===============================
       אורחים – רק להזמנה הזו
    =============================== */
    const guests = await InvitationGuest.find({
      invitationId: invitation._id,
    }).lean();

    console.log("👥 Guests:", guests.length);

    /* ===============================
       הושבה – לפי EVENT ID
    =============================== */
    const seating = await SeatingTable.findOne({
      eventId: invitation.eventId,
    }).lean();

    console.log("🪑 Seating found:", !!seating);

    /* ===============================
       חיבור אורח ← שולחן
    =============================== */
    let withTable = 0;

    const guestsWithTable = guests.map((guest) => {
      let tableName: string | null = null;

      if (seating?.tables?.length) {
        const table = seating.tables.find((t: TableItem) =>
          t.seatedGuests?.some(
            (sg: SeatedGuest) =>
              sg.guestId.toString() === guest._id.toString()
          )
        );

        if (table) {
          tableName = table.name || "-";
          withTable++;
        }
      }

      return {
        ...guest,
        tableName, // ⭐ לשימוש במפיק ובלייב בלבד
      };
    });

    console.log("✅ Guests with table:", withTable);

    return NextResponse.json({ guests: guestsWithTable });
  } catch (err) {
    console.error("🔥 ERROR in /api/guests:", err);
    return NextResponse.json({ guests: [] });
  }
}
