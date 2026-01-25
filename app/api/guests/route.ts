import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import SeatingTable from "@/models/SeatingTable";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

/* ============================================================
   טיפוסים מקומיים (כדי למנוע implicit any)
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

type SeatingDoc = {
  invitationId: Types.ObjectId;
  tables?: TableItem[];
};

export async function GET() {
  try {
    await db();

    /* ===============================
       בעל האירוע
    =============================== */
    const auth = await getUserIdFromRequest();

if (!auth?.userId) {
  return NextResponse.json({ guests: [] });
}

const userId = auth.userId;

    /* ===============================
       כל ההזמנות של המשתמש
    =============================== */
    const invitations = await Invitation.find({
  $or: [
    { ownerId: userId },     // לקוח
    { producerId: userId },  // מפיק
  ],
})
  .select("_id")
  .lean();

    if (!invitations.length) {
      return NextResponse.json({ guests: [] });
    }

    const invitationIds = invitations.map((i) => i._id);

    /* ===============================
       כל האורחים
    =============================== */
    const guests = await InvitationGuest.find({
      invitationId: { $in: invitationIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    /* ===============================
       כל ההושבות
    =============================== */
    const seatings = (await SeatingTable.find({
      invitationId: { $in: invitationIds },
    }).lean()) as SeatingDoc[];

    /* ===============================
       חיבור שם שולחן לכל אורח
    =============================== */
    const guestsWithTable = guests.map((guest) => {
      let tableName: string | null = null;

      const seating = seatings.find(
        (s) => s.invitationId.toString() === guest.invitationId.toString()
      );

      if (seating?.tables) {
        const table = seating.tables.find((t: TableItem) =>
          t.seatedGuests?.some(
            (sg: SeatedGuest) =>
              sg.guestId.toString() === guest._id.toString()
          )
        );

        tableName = table?.name || null;
      }

      return {
        ...guest,
        tableName, // ⭐ מחושב – תמיד עדכני
      };
    });

    return NextResponse.json({ guests: guestsWithTable });

  } catch (err) {
    console.error("🔥 ERROR in GET /api/guests:", err);
    return NextResponse.json({ guests: [] });
  }
}
