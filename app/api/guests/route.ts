import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import SeatingTable from "@/models/SeatingTable";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

/* ============================================================
   טיפוסים מקומיים
============================================================ */
type SeatedGuest = {
  guestId: Types.ObjectId;
  seatIndex: number;
};

type TableItem = {
  _id?: Types.ObjectId;
  number?: number;
  name?: string;
  seatedGuests?: SeatedGuest[];
};

type SeatingDoc = {
  invitationId: Types.ObjectId;
  tables?: TableItem[];
};

export async function GET(req: Request) {
  try {
    await db();

    /* ===============================
       Auth
    =============================== */
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json({ guests: [] });
    }

    const userId = auth.userId;

    /* ===============================
       Query param
    =============================== */
    const { searchParams } = new URL(req.url);
    const invitationParam = searchParams.get("invitation");

    let invitationIds: Types.ObjectId[] = [];

    /* ===============================
       מצב 1: invitationId ספציפי (לייב / מפיק)
    =============================== */
    if (invitationParam && Types.ObjectId.isValid(invitationParam)) {
      invitationIds = [new Types.ObjectId(invitationParam)];
    } 
    /* ===============================
       מצב 2: כל ההזמנות של הלקוח
    =============================== */
    else {
      const invitations = await Invitation.find({ ownerId: userId })
        .select("_id")
        .lean();

      if (!invitations.length) {
        return NextResponse.json({ guests: [] });
      }

      invitationIds = invitations.map((i) => i._id);
    }

    /* ===============================
       אורחים
    =============================== */
    const guests = await InvitationGuest.find({
      invitationId: { $in: invitationIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    /* ===============================
       סידורי הושבה
    =============================== */
    const seatings = (await SeatingTable.find({
      invitationId: { $in: invitationIds },
    }).lean()) as SeatingDoc[];

    /* ===============================
       חיבור שולחן לכל אורח
    =============================== */
    const guestsWithTable = guests.map((guest) => {
      let tableName: string | null = null;
      let tableNumber: number | null = null;

      const seating = seatings.find(
        (s) => s.invitationId.toString() === guest.invitationId.toString()
      );

      if (seating?.tables?.length) {
        const table = seating.tables.find((t) =>
          t.seatedGuests?.some(
            (sg) => sg.guestId.toString() === guest._id.toString()
          )
        );

        tableName = table?.name || null;
        tableNumber =
          typeof table?.number === "number" ? table.number : null;
      }

      return {
        ...guest,
        tableName,
        tableNumber,
      };
    });

    return NextResponse.json({ guests: guestsWithTable });

  } catch (err) {
    console.error("🔥 ERROR in GET /api/guests:", err);
    return NextResponse.json({ guests: [] });
  }
}
