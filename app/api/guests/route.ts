import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import SeatingTable from "@/models/SeatingTable";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

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
  eventId: Types.ObjectId;
  tables?: TableItem[];
};

export async function GET() {
  try {
    await db();
    console.log("✅ MongoDB connected");

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      console.log("⛔ No auth");
      return NextResponse.json({ guests: [] });
    }

    const userId = auth.userId;

    /* ===============================
       הזמנות (לקוח + מפיק)
    =============================== */
    const invitations = await Invitation.find({
      $or: [{ ownerId: userId }, { producerId: userId }],
    })
      .select("_id eventId")
      .lean();

    console.log("📩 Invitations:", invitations.length);

    if (!invitations.length) {
      return NextResponse.json({ guests: [] });
    }

    const invitationIds = invitations.map((i) => i._id);
    const eventIds = invitations
      .map((i) => i.eventId)
      .filter(Boolean);

    /* ===============================
       אורחים
    =============================== */
    const guests = await InvitationGuest.find({
      invitationId: { $in: invitationIds },
    }).lean();

    console.log("👥 Guests:", guests.length);

    /* ===============================
       הושבות – לפי EVENT ID (⭐ תיקון קריטי)
    =============================== */
    const seatings = (await SeatingTable.find({
      eventId: { $in: eventIds },
    }).lean()) as SeatingDoc[];

    console.log("🪑 Seatings:", seatings.length);

    /* ===============================
       חיבור אורח ← שולחן
    =============================== */
    let withTable = 0;

    const guestsWithTable = guests.map((guest) => {
      let tableName: string | null = null;

      const invitation = invitations.find(
        (i) => i._id.toString() === guest.invitationId.toString()
      );

      const seating = seatings.find(
        (s) => s.eventId?.toString() === invitation?.eventId?.toString()
      );

      if (seating?.tables?.length) {
        const table = seating.tables.find((t) =>
          t.seatedGuests?.some(
            (sg) => sg.guestId.toString() === guest._id.toString()
          )
        );

        if (table) {
          tableName = table.name || "-";
          withTable++;
        }
      }

      return {
        ...guest,
        tableName,
      };
    });

    console.log("✅ Guests with table:", withTable);

    return NextResponse.json({ guests: guestsWithTable });
  } catch (err) {
    console.error("🔥 ERROR in /api/guests:", err);
    return NextResponse.json({ guests: [] });
  }
}
